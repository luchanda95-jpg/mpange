const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Project = require('../models/Project');

const uploadDir = process.env.FILE_UPLOAD_DIR || 'uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', uploadDir)),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_')),
});
const upload = multer({ storage });

router.get('/', async (req, res) => {
  const list = await Project.find().populate('creatorId').sort({ createdAt: -1 }).exec();
  res.json({ projects: list });
});

router.post('/', auth.requireAuth, upload.single('cover'), async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    const coverUrl = req.file ? `/${uploadDir}/` + req.file.filename : null;
    const project = await Project.create({ title, description, coverUrl, tags: tags ? tags.split(',').map(t => t.trim()) : [], creatorId: req.userId });
    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  const project = await Project.findById(id).exec();
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json({ project });
});

router.delete('/:id', auth.requireAuth, async (req, res) => {
  const id = req.params.id;
  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (project.creatorId.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  await project.remove();
  res.json({ ok: true });
});

module.exports = router;
