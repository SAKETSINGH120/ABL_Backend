const VendorProductVariant = require('../../../models/vendorProductVarient');
const VendorProduct = require('../../../models/vendorProduct');

exports.getVendorProductVariants = catchAsync(async (req, res, next) => {
  const { vendorProductId } = req.params;
  const vendorId = req.vendor._id;

  if (!vendorProductId) {
    return next(new AppError('Product ID is required.', 400));
  }

  // check product belongs to vendor
  const product = await VendorProduct.findOne({
    _id: vendorProductId,
    vendorId,
    isDeleted: false
  });

  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  const variants = await VendorProductVariant.find({
    vendorProductId,
    isDeleted: false
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    status: true,
    message: 'Variants fetched successfully.',
    data: { variants }
  });
});
