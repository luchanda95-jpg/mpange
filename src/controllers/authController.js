// controllers/authController.js
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const User = require('../models/User');
const { signToken } = require('../utils/jwt');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Max avatar size in bytes (env optional), default 1 MB
const MAX_AVATAR_BYTES = parseInt(process.env.MAX_AVATAR_BYTES || String(1 * 1024 * 1024), 10);

// Helper to create tokens (you can extend to include refresh tokens)
function createAuthPayload(user) {
  const token = signToken({ userId: user._id.toString(), email: user.email });
  return { token, user: user.toClient() };
}

/**
 * Utility: strip data URI prefix if present and return only the base64 payload.
 * If input doesn't look like data URI, returns the original string.
 */
function stripDataUriPrefix(s) {
  if (!s || typeof s !== 'string') return s;
  const idx = s.indexOf(',');
  if (s.startsWith('data:') && idx !== -1) {
    return s.slice(idx + 1);
  }
  return s;
}

/**
 * Validate base64 string — returns byte length if valid, or throws if invalid.
 */
function getBase64ByteLengthOrThrow(base64Str) {
  // This may throw if string not valid base64
  // Use Buffer.byteLength with 'base64' to compute size
  const size = Buffer.byteLength(base64Str, 'base64');
  // Basic sanity: ensure decoding roundtrip OK (Buffer.from will throw on invalid base64 in some Node versions)
  // We'll attempt a lightweight decode
  try {
    // Note: we won't keep the decoded buffer here (no need) — just verify decode works
    Buffer.from(base64Str, 'base64');
  } catch (e) {
    throw new Error('Invalid base64 data');
  }
  return size;
}

// POST /api/auth/signup
async function signup(req, res, next) {
  try {
    const {
      fullName,
      email,
      password,
      businessName,
      category,
      avatarBase64,
      avatarUrl // prefer sending an uploaded URL instead of inline base64
    } = req.body || {};

    if (!fullName || !email) {
      return res.status(400).json({ message: 'fullName and email are required' });
    }

    const lowerEmail = String(email).toLowerCase();

    const existing = await User.findOne({ email: lowerEmail }).exec();
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // If avatarBase64 present, validate size and base64 correctness
    let avatarToStore = '';
    if (avatarBase64 && typeof avatarBase64 === 'string' && avatarBase64.trim().length > 0) {
      const payload = stripDataUriPrefix(avatarBase64).trim();
      try {
        const bytes = getBase64ByteLengthOrThrow(payload);
        if (bytes > MAX_AVATAR_BYTES) {
          return res.status(413).json({
            message: `Avatar image too large (${Math.round(bytes / 1024)} KB). Max allowed is ${Math.round(MAX_AVATAR_BYTES / 1024)} KB.`
          });
        }
        // safe to store (note: storing base64 in DB has tradeoffs; consider storing URL instead)
        avatarToStore = avatarBase64; // store original (could store payload only)
      } catch (err) {
        return res.status(400).json({ message: 'Invalid avatarBase64 data' });
      }
    } else if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
      // prefer avatarUrl if provided
      avatarToStore = avatarUrl.trim();
    } else {
      avatarToStore = ''; // empty avatar
    }

    const passwordHash = password ? await bcrypt.hash(password, 12) : '';

    const user = new User({
      fullName,
      email: lowerEmail,
      businessName: businessName || fullName,
      category: category || 'General',
      avatarBase64: avatarToStore,
      passwordHash,
      provider: password ? 'local' : 'local'
    });

    await user.save();

    const payload = createAuthPayload(user);
    return res.status(201).json(payload);
  } catch (err) {
    // Pass to centralized error handler
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: String(email).toLowerCase() }).exec();
    if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = createAuthPayload(user);
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/social
// body: { provider: 'google'|'apple', idToken: '...' }
async function socialLogin(req, res, next) {
  try {
    const { provider, idToken } = req.body || {};
    if (!provider || !idToken) return res.status(400).json({ message: 'provider and idToken required' });

    let profile = null;

    if (provider === 'google') {
      // verify idToken with google-auth-library
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
      } catch (verifyErr) {
        // common causes: invalid token, mismatched audience
        console.warn('Google verifyIdToken error:', verifyErr.message || verifyErr);
        return res.status(401).json({ message: 'Invalid Google ID token' });
      }

      const payload = ticket.getPayload() || {};
      profile = {
        email: payload.email,
        fullName: payload.name || (payload.email ? payload.email.split('@')[0] : 'Google User'),
        providerId: payload.sub,
        // payload.picture is usually a URL; we accept it and store in avatarBase64 field for now
        avatarBase64: payload.picture || ''
      };
    } else if (provider === 'apple') {
      // Minimal decode. For production verify Apple's signature via JWKS.
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(idToken);
        profile = {
          email: decoded?.email,
          fullName: decoded?.name || (decoded?.email ? decoded.email.split('@')[0] : 'Apple User'),
          providerId: decoded?.sub,
          avatarBase64: ''
        };
      } catch (e) {
        return res.status(400).json({ message: 'Invalid Apple idToken' });
      }
    } else {
      return res.status(400).json({ message: 'Unknown provider' });
    }

    if (!profile.email) return res.status(400).json({ message: 'Social token did not contain email' });

    const emailLower = String(profile.email).toLowerCase();
    let user = await User.findOne({ email: emailLower }).exec();

    if (!user) {
      // create new social user
      user = new User({
        fullName: profile.fullName,
        email: emailLower,
        businessName: profile.fullName,
        category: 'General',
        avatarBase64: profile.avatarBase64 || '',
        provider: provider,
        providerId: profile.providerId || ''
      });
      await user.save();
    } else {
      // update provider info if needed
      let changed = false;
      if (user.provider !== provider) {
        user.provider = provider;
        changed = true;
      }
      if (profile.providerId && user.providerId !== profile.providerId) {
        user.providerId = profile.providerId;
        changed = true;
      }
      // update avatar if provider supplied a picture
      if (profile.avatarBase64 && profile.avatarBase64.length > 0 && user.avatarBase64 !== profile.avatarBase64) {
        user.avatarBase64 = profile.avatarBase64;
        changed = true;
      }
      if (changed) await user.save();
    }

    const payload = createAuthPayload(user);
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    return res.json({ user: req.user.toClient() });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, socialLogin, me };
