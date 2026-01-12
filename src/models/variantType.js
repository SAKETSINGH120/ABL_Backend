const mongoose = require('mongoose');

const VariantTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Variant type name is required'],
    unique: true,
    trim: true
    // eg: "kg", "gm", "ml", "L", "piece"
  },
  category: {
    type: String,
    enum: ['weight', 'volume', 'quantity', 'other'],
    default: 'other'
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

VariantTypeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VariantType', VariantTypeSchema);
