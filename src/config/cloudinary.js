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

// ------------------------------------------------------------------
// CLOUDINARY CONNECTION/CONFIGURATION CHECK
// Runs once at startup to confirm credentials are valid.
// ------------------------------------------------------------------
(async () => {
    try {
        // cloudinary.api.ping() is a lightweight, authenticated call 
        // to verify credentials without affecting assets.
        const result = await cloudinary.api.ping();
        
        if (result && result.status === 'ok') {
            console.log('Connected to Cloudinary');
            // Optional: Show the cloud name to confirm which account is active
            console.log(`Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
        } else {
            // This is unlikely if the ping call returns an error object, 
            // but catches unexpected successful return values.
            console.error('⚠️ CLOUDINARY ERROR: Ping failed with unknown status:', result);
        }
    } catch (error) {
        // This block catches authentication errors (e.g., wrong secret/key)
        console.error('❌ FAILED to connect to Cloudinary. Check credentials in .env file.');
        // Optionally log the detailed error message for debugging:
        // console.error(error.message); 
    }
})();

// Export the configured cloudinary object
module.exports = cloudinary;

// ⚠️ IMPORTANT: You must also define these three variables 
// in your .env file in the root of your 'server' directory.