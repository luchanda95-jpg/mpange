// routes/uploads.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = process.env.FILE_UPLOAD_DIR || 'uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ensure upload dir exists
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // keep original extension, prefix with timestamp to avoid collisions
    const ext = path.extname(file.originalname) || '.bin';
    const name = `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`;
    cb(null, name);
  }
});

// limit file size to 2MB here
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

/**
 * POST /api/uploads/avatar
 * Form-data: avatar (file), plus any other fields (fullName, email, ...)
 * Returns { ok: true, fileUrl: '/uploads/filename' }
 */
router.post('/avatar', upload.single('avatar'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/${uploadDir}/${req.file.filename}`;
    return res.status(201).json({ ok: true, fileUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
