const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/me', auth.requireAuth, async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId).select('_id email name avatarUrl');
  res.json({ user });
});

module.exports = router;
