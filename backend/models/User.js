const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verifyToken: { type: String },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  // 6-digit numeric code for quick password reset flows
  resetCode: { type: String },
  resetCodeExpiry: { type: Date },
  // store issued refresh tokens so we can revoke them
  refreshTokens: [
    {
      token: String,
      expires: Date,
    }
  ],
}, { timestamps: true });

UserSchema.methods.generateVerifyToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.verifyToken = token;
  return token;
};

UserSchema.methods.generateResetToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetToken = token;
  this.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  return token;
};

// Generate a 6-digit numeric code and set expiry (default 15 minutes)
UserSchema.methods.generateResetCode = function (minutes = 15) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetCode = code;
  this.resetCodeExpiry = Date.now() + (minutes * 60 * 1000);
  return code;
};

module.exports = mongoose.model('User', UserSchema);

