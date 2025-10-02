// controllers/authController.js
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const User = require('../models/User');
const { signToken } = require('../utils/jwt');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to create tokens (you can extend to include refresh tokens)
function createAuthPayload(user) {
  const token = signToken({ userId: user._id.toString(), email: user.email });
  return { token, user: user.toClient() };
}

// POST /api/auth/signup
async function signup(req, res, next) {
  try {
    const { fullName, email, password, businessName, category, avatarBase64 } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ message: 'fullName and email are required' });
    }

    const lowerEmail = String(email).toLowerCase();
    const existing = await User.findOne({ email: lowerEmail }).exec();
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = password ? await bcrypt.hash(password, 12) : '';

    const user = new User({
      fullName,
      email: lowerEmail,
      businessName: businessName || fullName,
      category: category || 'General',
      avatarBase64: avatarBase64 || '',
      passwordHash,
      provider: password ? 'local' : 'local'
    });

    await user.save();

    const payload = createAuthPayload(user);
    return res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
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
    const { provider, idToken } = req.body;
    if (!provider || !idToken) return res.status(400).json({ message: 'provider and idToken required' });

    let profile = null;

    if (provider === 'google') {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      profile = {
        email: payload.email,
        fullName: payload.name || payload.email.split('@')[0],
        providerId: payload.sub,
        avatarBase64: payload.picture || ''
      };
    } else if (provider === 'apple') {
      // Minimal decode. For production verify Apple's signature via JWKS.
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(idToken);
      profile = {
        email: decoded?.email,
        fullName: decoded?.name || (decoded?.email ? decoded.email.split('@')[0] : 'Apple User'),
        providerId: decoded?.sub,
        avatarBase64: ''
      };
    } else {
      return res.status(400).json({ message: 'Unknown provider' });
    }

    if (!profile.email) return res.status(400).json({ message: 'Social token did not contain email' });

    const emailLower = String(profile.email).toLowerCase();
    let user = await User.findOne({ email: emailLower }).exec();

    if (!user) {
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
      user.provider = provider;
      if (profile.providerId) user.providerId = profile.providerId;
      if (profile.avatarBase64) user.avatarBase64 = profile.avatarBase64;
      await user.save();
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
