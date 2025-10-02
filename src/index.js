// index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
// optional uploads route (see routes/uploads.js in repo)
let uploadRoutes;
try {
  uploadRoutes = require('./routes/uploads');
} catch (err) {
  // uploads route not present — that's fine
  uploadRoutes = null;
}

const app = express();

const PORT = process.env.PORT || 4000;
const uploadDir = process.env.FILE_UPLOAD_DIR || 'uploads';
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mpange_dev';
const corsOrigin = process.env.CORS_ORIGIN || ''; // comma-separated or empty

// Ensure upload dir exists on disk
const uploadsPath = path.join(__dirname, uploadDir);
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(`Created upload directory: ${uploadsPath}`);
}

// Logging middleware (dev friendly)
app.use(morgan(process.env.LOG_FORMAT || 'dev'));

// CORS config - allow specific origins if provided, otherwise allow all (dev)
let corsOptions = {};
if (corsOrigin && corsOrigin.trim().length > 0) {
  // allow comma-separated list in env var
  const origins = corsOrigin.split(',').map(s => s.trim());
  // if single origin, pass string; else pass array
  corsOptions.origin = origins.length === 1 ? origins[0] : origins;
  corsOptions.optionsSuccessStatus = 200;
} else {
  // WARNING: In production, prefer explicit origins. Leaving `true` for dev convenience.
  corsOptions = { origin: true };
}
app.use(cors(corsOptions));

// Increase body parser limits to handle medium sized payloads (e.g. base64 images for quick dev).
// Adjust the 'limit' value for your needs. Prefer multipart uploads for large binaries.
const JSON_LIMIT = process.env.JSON_LIMIT || '5mb';
app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.urlencoded({ limit: JSON_LIMIT, extended: true }));

// Serve uploaded files statically
// e.g. a file saved at <uploadDir>/avatar.jpg will be available at GET /uploads/avatar.jpg
app.use('/' + uploadDir, express.static(uploadsPath));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);

// mount uploads route if it exists (optional)
if (uploadRoutes) {
  app.use('/api/uploads', uploadRoutes);
}

// health check
app.get('/', (req, res) => res.json({ ok: true, name: 'mpange-backend-mongo' }));

// 413 / PayloadTooLarge friendly handler for express raw-body errors
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large. Reduce request body size.' });
  }
  // Default error passthrough
  // If headers already sent, delegate to default handler
  if (res.headersSent) return next(err);
  console.error('Unhandled error:', err);
  const status = err && err.status ? err.status : 500;
  const message = err && err.message ? err.message : 'Internal Server Error';
  res.status(status).json({ message });
});

// Connect to MongoDB and start server
(async function start() {
  try {
    // Use mongoose recommended options; additional options deprecated in new versions may be ignored
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down...`);
      server.close(() => {
        console.log('HTTP server closed.');
      });
      try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
      } catch (e) {
        console.error('Error disconnecting mongoose', e);
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('unhandledRejection', (reason, p) => {
      console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();
