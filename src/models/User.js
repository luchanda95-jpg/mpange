// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  businessName: { type: String, trim: true, default: '' },
  category: { type: String, trim: true, default: 'General' },
  avatarBase64: { type: String, default: '' }, // store base64 or a URL as you prefer
  passwordHash: { type: String, default: '' }, // empty for social-only accounts
  provider: { type: String, enum: ['local', 'google', 'apple'], default: 'local' },
  providerId: { type: String, default: '' }, // e.g. Google sub or Apple userIdentifier
}, {
  timestamps: true,
});

// Instance method to sanitize the user before sending to client
UserSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    businessName: this.businessName,
    category: this.category,
    avatarBase64: this.avatarBase64 || '',
    provider: this.provider || 'local',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
