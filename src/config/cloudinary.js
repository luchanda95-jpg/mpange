// src/config/cloudinary.js

const cloudinary = require('cloudinary').v2;
require('dotenv').config(); // Ensure env vars are loaded, though index.js should handle it

// Configuration 
// Cloudinary credentials are read from environment variables:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Export the configured cloudinary object
module.exports = cloudinary;

// ⚠️ IMPORTANT: You must also define these three variables 
// in your .env file in the root of your 'server' directory.