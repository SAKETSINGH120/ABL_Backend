const mongoose = require('mongoose');
const { Schema } = mongoose;

const WishlistItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'VendorProduct',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const WishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    items: [WishlistItemSchema]
  },
  { timestamps: true }
);

// Index for faster product lookup in wishlist
WishlistSchema.index({ userId: 1, 'items.productId': 1 });

module.exports = mongoose.model('Wishlist', WishlistSchema);
