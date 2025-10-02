// middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token); // throws on invalid/expired
    // tolerate different claim names
    const userId = decoded.userId || decoded.sub || decoded.id || decoded.uid;
    if (!userId) return res.status(401).json({ message: 'Invalid token (no user id claim)' });

    const user = await User.findById(userId).exec();
    if (!user) return res.status(401).json({ message: 'Invalid token (user not found)' });

    req.user = user;
    next();
  } catch (err) {
    // Optionally log err in dev
    console.error('requireAuth error:', err && err.message ? err.message : err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
