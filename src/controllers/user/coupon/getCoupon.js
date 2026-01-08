// const mongoose = require("mongoose");
// const Coupon = require("../../../models/coupon");
// const Cart = require("../../../models/newCart"); // Assuming it's the correct path
// const catchAsync = require("../../../utils/catchAsync");

// exports.getCoupons = catchAsync(async (req, res, next) => {
//     const userId = req.user?._id || req.query.userId;
//     const today = new Date();

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//         return res.status(400).json({
//             status: false,
//             message: "Invalid or missing user ID.",
//         });
//     }
//     console.log("User ID:", userId);
//     // 1. Get active cart for the user
//     const cart = await Cart.findOne({ userId, status: "active" });  
    
//     let shopIds = [];

//     if (cart && cart.shops && cart.shops.length > 0) {
//         const shopIdSet = new Set();

//         for (const shop of cart.shops) {
//             if (shop.vendorId) {
//                 shopIdSet.add(shop.shopId.toString());
//             }
//         }

//         shopIds = Array.from(shopIdSet).map(id => new mongoose.Types.ObjectId(id));
       
//     }

//     console.log("shop IDs from cart:", shopIds);
//     // 3. Common coupon filter
//     const baseCouponFilter = {
//         status: "active",
//         startDate: { $lte: today },
//         expiryDate: { $gte: today }
//     };

//     console.log("Base Coupon Filter:", baseCouponFilter);
//     // 4. Fetch admin coupons (vendorId: null)
//     const adminCoupons = await Coupon.find({
//         ...baseCouponFilter,
//         vendorId: null
//     }).sort({ createdAt: -1 });

//     // 5. Fetch vendor-specific coupons
//     let vendorCoupons = [];
//     if (shopIds.length > 0) {
//         vendorCoupons = await Coupon.find({
//             // ...baseCouponFilter,
//             shopId: { $in: shopIds }
//         }).sort({ createdAt: -1 });
//     }

//     // 6. Send response
//     res.status(200).json({
//         status: true,
//         message: "Coupons fetched successfully.",
//         data: {
//             adminCoupons,
//             vendorCoupons
//         }
//     });
// });

const mongoose = require("mongoose");
const Coupon = require("../../../models/coupon");
const Cart = require("../../../models/newCart");
const Shop = require("../../../models/shop"); // make sure correct path
const catchAsync = require("../../../utils/catchAsync");

exports.getCoupons = catchAsync(async (req, res, next) => {
  const userId = req.user?._id || req.query.userId;
  const today = new Date();

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid or missing user ID.",
    });
  }

  console.log("User ID:", userId);

  // 1. Get active cart for the user
  const cart = await Cart.findOne({ userId, status: "active" ,serviceType:"food"});
  console.log("CART DATA",cart);
  let shopIds = [];

  if (cart && cart.shops && cart.shops.length > 0) {
    const shopIdSet = new Set();

    for (const shop of cart.shops) {
      if (shop.shopId) {
        shopIdSet.add(shop.shopId.toString());
      }
    }

    shopIds = Array.from(shopIdSet).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
  }

  console.log("shop IDs from cart:", shopIds);

  // 2. Common coupon filter
  const baseCouponFilter = {
    status: "active",
    startDate: { $lte: today },
    expiryDate: { $gte: today },
  };

  console.log("Base Coupon Filter:", baseCouponFilter);

  // 3. Fetch admin coupons (vendorId: null)
  const adminCoupons = await Coupon.find({
    ...baseCouponFilter,
    vendorId: null,
  }).sort({ createdAt: -1 });

  // 4. Fetch vendor-specific coupons grouped by shop name
  let vendorCouponsGrouped = {};
  if (shopIds.length > 0) {
    const vendorCoupons = await Coupon.find({
      ...baseCouponFilter,
      shopId: { $in: shopIds },
    })
      .sort({ createdAt: -1 })
      .populate("shopId", "name"); // populate shop name only

      console.log("vendorCoupons",vendorCoupons);
    vendorCoupons.forEach((coupon) => {
      const shopName = coupon.shopId?.name || "Unknown Shop";
      if (!vendorCouponsGrouped[shopName]) {
        vendorCouponsGrouped[shopName] = [];
      }
      vendorCouponsGrouped[shopName].push(coupon);
    });
  }

  // 5. Send response
  res.status(200).json({
    status: true,
    message: "Coupons fetched successfully.",
    data: {
      adminCoupons,
      vendorCoupons: vendorCouponsGrouped,
    },
  });
});
