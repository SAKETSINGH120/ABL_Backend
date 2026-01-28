const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductDataSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'VendorProduct', required: true },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VariantType'
    },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    finalPrice: { type: Number, required: true }
    // cookingInstruction: { type: String, default: '' },
  },
  { _id: false }
);

const AppliedCouponSchema = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
    code: { type: String, required: true },
    discountAmount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    booking_id: { type: String, required: true },
    // shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    productData: { type: [ProductDataSchema], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addressId: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    // --- FINANCIALS ---
    itemTotal: { type: Number, required: true },
    // --- REVISED COUPON FIELDS ---
    appliedCoupons: { type: [AppliedCouponSchema], default: [] }, // Array to hold all applied coupons
    totalCouponDiscount: { type: Number, default: 0 }, // Total discount from all coupons for this order

    // --- COIN USAGE ---
    isUsedCoin: { type: Boolean, default: false },
    usedCoin: { type: Number, default: 0 },
    coinDiscount: { type: Number, default: 0 },

    deliveryDate: { type: Date, required: true },
    deliveryTime: { type: String, required: true },
    deliveryCharge: { type: Number, default: 0 },
    driverDeliveryCharge: { type: Number, default: 0 },
    plateFormFee: { type: Number, default: 0 },
    gstValue: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    packingCharge: { type: Number, default: 0 },
    // serviceType: { type: String, enum: ['food', 'grocery'], default: 'food' },
    finalTotalPrice: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'start_packing',
        'delay',
        'ready',
        'shipped',
        'picked up',
        'running',
        'out of delivery',
        'delivered',
        'cancelledByUser',
        'cancelledByVendor',
        'cancelledByDriver',
        'cancelledByAdmin',
        'cancelled'
      ],
      default: 'pending'
    },
    packingTime: { type: Number, default: null },
    preparationTime: { type: Number, default: null },
    packingStartedAt: { type: Date, default: null },
    preparationStartedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    dealyAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    pickedupAt: { type: Date, default: null },
    runningAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    paymentMode: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'cod', 'online'],
      required: true
    },
    paymentStatus: { type: String, enum: ['pending', 'success', 'paid', 'failed'], default: 'pending' },
    paymentId: { type: String, default: null },
    assignedDriver: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },
    razorpayOrderId: { type: String, default: null },
    isRated: { type: Boolean, default: false },
    isRefunded: { type: Boolean, default: false },
    deliveryProofImage: { type: String, default: null },
    deliveryInstruction: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('newOrder', OrderSchema);
