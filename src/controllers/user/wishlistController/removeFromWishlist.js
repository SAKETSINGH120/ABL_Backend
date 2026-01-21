const Wishlist = require('../../../models/wishlist');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');

exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const userId = req.user._id;

  if (!productId) {
    return next(new AppError('Product ID is required', 400));
  }

  const wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    return next(new AppError('Wishlist not found', 404));
  }

  // Remove product from wishlist
  const initialLength = wishlist.items.length;
  wishlist.items = wishlist.items.filter((item) => item.productId.toString() !== productId);

  if (wishlist.items.length === initialLength) {
    return next(new AppError('Product not found in wishlist', 404));
  }

  await wishlist.save();

  return res.status(200).json({
    success: true,
    message: 'Product removed from wishlist',
    data: {
      wishlistCount: wishlist.items.length
    }
  });
});
