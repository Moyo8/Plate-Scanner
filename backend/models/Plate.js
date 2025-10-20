const mongoose = require('mongoose');

const PlateSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, trim: true },
  ownerInfo: {
    name: { type: String, default: '' },
    phoneNo: { type: String, default: '' },
  },
  carInfo: {
    model: { type: String, default: '' },
    color: { type: String, default: '' },
    category: { type: String, default: 'Private' },
    expires: { type: Date },
  },
  status: { type: String, default: 'Valid' },
  registeredBy: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.Plate || mongoose.model('Plate', PlateSchema);
