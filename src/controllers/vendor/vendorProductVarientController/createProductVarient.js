const VendorProduct = require('../../../models/vendorProduct');
const VendorProductVariant = require('../../../models/vendorProductVarient');
const AppError = require('../../../utils/AppError');
const catchAsync = require('../../../utils/catchAsync');

const validateRequiredField = (field, fieldName) => {
  if (field === undefined || field === null || field === '') return new AppError(`${fieldName} is required.`, 400);
  return null;
};

exports.createVendorProductVariant = catchAsync(async (req, res, next) => {
  const { vendorProductId, variantName, mrp, sellingPrice, unitOfMeasurement, sellingUnit, stock } = req.body;

  const requiredFields = [
    { field: vendorProductId, name: 'Product ID' },
    { field: variantName, name: 'Variant Name' },
    { field: mrp, name: 'MRP' },
    { field: sellingPrice, name: 'Selling Price' },
    { field: unitOfMeasurement, name: 'Unit Of Measurement' },
    { field: sellingUnit, name: 'Selling Unit' }
  ];

  for (const { field, name } of requiredFields) {
    const error = validateRequiredField(field, name);
    if (error) return next(error);
  }

  const vendorId = req.vendor._id;
  if (!vendorId) {
    return next(new AppError('Vendor ID is required.', 400));
  }

  // ✅ Check product exists
  const product = await VendorProduct.findOne({
    _id: vendorProductId,
    vendorId,
    isDeleted: false
  });

  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  // ✅ Create variant (simple)
  const variant = new VendorProductVariant({
    vendorProductId,
    sku: '',
    variantName,
    mrp,
    sellingPrice,
    unitOfMeasurement,
    sellingUnit,
    stock: stock || 0
  });

  await variant.save();

  // ✅ Mark product has variants
  if (!product.hasVariants) {
    product.hasVariants = true;
    await product.save();
  }

  return res.status(201).json({
    status: true,
    message: 'Product variant added successfully.',
    data: { variant }
  });
});
