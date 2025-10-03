// models/Project.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    creatorName: { type: String, required: true, trim: true },
    // Cloudinary URL for the main image
    assetPath: { type: String, required: true }, 
    // Cloudinary public_id for image management/deletion
    assetPublicId: { type: String, required: true }, 
    tags: { type: [String], default: [] },
    category: { type: String, required: true, trim: true },
    // Stored as a Number in MongoDB
    aspectRatio: { type: Number, default: 1.0 }, 
    description: { type: String, default: '' },
    // Reference to the User who created the project (assuming a User model exists)
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Project', ProjectSchema);