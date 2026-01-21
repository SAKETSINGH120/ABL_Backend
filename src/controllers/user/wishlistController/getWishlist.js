const Wishlist = require('../../../models/wishlist');
const catchAsync = require('../../../utils/catchAsync');

exports.getWishlist = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ userId }).populate({
    path: 'items.productId',
    select: 'name primary_image vendorSellingPrice mrp shortDescription rating status isDeleted subCategoryId brandId unitOfMeasurement',
    populate: [
      { path: 'brandId', select: 'name' },
      { path: 'unitOfMeasurement', select: 'name' }
    ]
  });

  if (!wishlist || wishlist.items.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'Wishlist is empty',
      data: {
        items: [],
        count: 0
      }
    });
  }

  // Filter out deleted or inactive products
  const activeItems = wishlist.items.filter((item) => item.productId && item.productId.status === 'active' && !item.productId.isDeleted);

  // Format response
  const formattedItems = activeItems.map((item) => ({
    _id: item.productId._id,
    name: item.productId.name,
    image: item.productId.primary_image,
    vendorSellingPrice: item.productId.vendorSellingPrice,
    mrp: item.productId.mrp,
    shortDescription: item.productId.shortDescription,
    rating: item.productId.rating,
    brand: item.productId.brandId,
    unitOfMeasurement: item.productId.unitOfMeasurement,
    addedAt: item.addedAt
  }));

  return res.status(200).json({
    success: true,
    message: 'Wishlist retrieved successfully',
    data: {
      items: formattedItems,
      count: formattedItems.length
    }
  });
});
