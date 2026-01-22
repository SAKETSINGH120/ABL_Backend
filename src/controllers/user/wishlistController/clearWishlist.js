const Wishlist = require('../../../models/wishlist');
const catchAsync = require('../../../utils/catchAsync');

exports.clearWishlist = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    return res.status(200).json({
      success: true,
      message: 'Wishlist is already empty',
      data: {
        wishlistCount: 0
      }
    });
  }

  wishlist.items = [];
  await wishlist.save();

  return res.status(200).json({
    success: true,
    message: 'Wishlist cleared successfully',
    data: {
      wishlistCount: 0
    }
  });
});
