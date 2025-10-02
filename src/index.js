require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 4000;
const uploadDir = process.env.FILE_UPLOAD_DIR || 'uploads';
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mpange_dev';

// ensure upload dir exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/' + uploadDir, express.static(path.join(__dirname, '..', uploadDir)));

// connect to MongoDB
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);

app.get('/', (req, res) => res.json({ ok: true, name: 'mpange-backend-mongo' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
