const mongoose = require('mongoose');

const VendorProductVariantSchema = new mongoose.Schema({
  vendorProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProduct',
    required: true
  },

  sku: { type: String, default: '' },

  variantName: {
    type: String,
    required: true
    // eg: "500 gm", "1 kg", "1 L"
  },

  mrp: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },

  unitOfMeasurement: { type: String, required: true },
  sellingUnit: { type: String, required: true },

  stock: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },

  createdAt: { type: Date, default: Date.now }
});

// only ONE default variant per product
VendorProductVariantSchema.index({ vendorProductId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

module.exports = mongoose.model('VendorProductVariant', VendorProductVariantSchema);
