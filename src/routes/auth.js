// routes/auth.js
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const { signup, login, socialLogin, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.use(bodyParser.json());

// Public
router.post('/signup', signup);
router.post('/login', login);
router.post('/social', socialLogin);

// Protected
router.get('/me', requireAuth, me);

module.exports = router;
