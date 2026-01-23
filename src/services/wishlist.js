const Wishlist = require(`../models/wishlist`);

exports.getWishlistByUserId = async (userId) => {
    return await Wishlist.findOne({ userId });
}