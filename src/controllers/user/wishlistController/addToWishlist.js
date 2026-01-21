const Wishlist = require('../../../models/wishlist');
const VendorProduct = require('../../../models/vendorProduct');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');

exports.addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.body;
  const userId = req.user._id;

  if (!productId) {
    return next(new AppError('Product ID is required', 400));
  }

  // Verify product exists and is active
  const product = await VendorProduct.findOne({ _id: productId, status: 'active', isDeleted: false });
  if (!product) {
    return next(new AppError('Product not found or unavailable', 404));
  }

  // Find or create wishlist
  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    // Create new wishlist
    wishlist = await Wishlist.create({
      userId,
      items: [{ productId }]
    });

    return res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        wishlistCount: 1
      }
    });
  }

  // Check if product already in wishlist
  const existingItem = wishlist.items.find((item) => item.productId.toString() === productId);

  if (existingItem) {
    return res.status(200).json({
      success: true,
      message: 'Product already in wishlist',
      data: {
        wishlistCount: wishlist.items.length
      }
    });
  }

  // Add product to wishlist
  wishlist.items.push({ productId });
  await wishlist.save();

  return res.status(200).json({
    success: true,
    message: 'Product added to wishlist',
    data: {
      wishlistCount: wishlist.items.length
    }
  });
});
