const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  variantTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VariantType'
  },
  sku: { type: String, default: '' },
  variantName: { type: String },
  mrp: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  // unitOfMeasurement: { type: String, required: true },
  sellingUnit: { type: String, required: true },
  stock: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
});

const VendorProductSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: false },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  sku: { type: String, unique: false, default: '' },
  type: { type: String, default: '' },
  primary_image: { type: String, required: true },
  gallery_image: [{ type: String, required: true }],
  name: { type: String, required: true },
  mrp: { type: String, required: true },
  vendorSellingPrice: { type: String, required: true },
  unitOfMeasurement: { type: mongoose.Schema.Types.ObjectId, ref: 'VariantType', required: true },
  sellingUnit: { type: String, required: true },
  shortDescription: { type: String, required: true },
  longDescription: { type: String },
  stock: {
    type: Number,
    default: 0
  },
  isRecommended: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isSeasonal: { type: Boolean, default: false },
  isVegetableOfTheDay: { type: Boolean, default: false },
  isFruitOfTheDay: { type: Boolean, default: false },
  isDealOfTheDay: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  rating: { type: String, default: '0' },
  variants: [productVariantSchema],
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const VendorProduct = mongoose.model('VendorProduct', VendorProductSchema);
module.exports = VendorProduct;
