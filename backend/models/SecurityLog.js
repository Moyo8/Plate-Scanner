const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  username: { type: String, required: false },
  email: { type: String, required: false },
  status: { type: String, enum: ['success', 'fail'], required: true },
  ip: { type: String },
  userAgent: { type: String },
  recordAccessed: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
