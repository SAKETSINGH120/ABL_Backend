const Category = require('../../../models/category');
const User = require('../../../models/user');
const newCart = require('../../../models/newCart');
const Wishlist = require('../../../models/wishlist');
const Vendor = require('../../../models/vendor');
const VendorProduct = require('../../../models/vendorProduct');
const { calculateOffer } = require('../../../utils/calculateOffer');
const catchAsync = require('../../../utils/catchAsync');
const applyPagination = require('../../../utils/pagination');
const mongoose = require('mongoose');
const getPagination = require('../../../utils/pagination');

exports.getsubCategoryProductList = catchAsync(async (req, res, next) => {
  try {
    let { sortBy, price, brand, page } = req.query;

    const sortMap = { price_low: { vendorSellingPrice: 1 }, price_high: { vendorSellingPrice: -1 } };
    const filterMap = {
      // for price filtering
      price_below_99: { $lte: 99 },
      price_100_199: { $lte: 199, $gte: 100 },
      price_200_299: { $lte: 299, $gte: 200 },
      price_300_399: { $lte: 399, $gte: 300 },
      price_avobe_500: { $gte: '500' }
    };

    let sortQuery = sortMap[sortBy];

    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const subCategoryId = req.params.subCategoryId;

    if (!user.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Pincode is required'
      });
    }

    // review for pincode
    const vendorMatchQuery = { status: true };

    const vendor = await Vendor.findOne(vendorMatchQuery).select('_id');

    const vendorId = vendor?._id;

    const productQuery = {
      status: 'active',
      subCategoryId: subCategoryId,
      isDeleted: false
    };

    if (price) {
      productQuery.vendorSellingPrice = filterMap[price];
    }

    if (brand) {
      productQuery.brandId = brand;
    }

    if (vendorId) {
      productQuery.vendorId = vendorId;
    }

    const { skip, limit } = getPagination(page);

    const [productList, cartProducts, wishlist] = await Promise.all([
      VendorProduct.find(productQuery).populate('variants.variantTypeId', 'name').populate('unitOfMeasurement', 'name -_id').populate('brandId', 'name').sort(sortQuery).skip(skip).limit(limit),
      newCart.findOne({ userId: userId, status: 'active' }),
      Wishlist.findOne({ userId })
    ]);

    if (!productList || productList.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No product list found for this sub-category'
      });
    }

    const cartMap = new Map();

    if (cartProducts) {
      cartProducts.items.forEach((item) => {
        const key = `${item.productId}_${item.variantId || 'no-variant'}`;
        cartMap.set(key, item.quantity);
      });
    }

    // this for wishlisted product tracking according to user
    const wishlistSet = new Set();

    if (wishlist) {
      wishlist.items.forEach((item) => {
        wishlistSet.add(item.productId.toString());
      });
    }

    const productData = productList.map((prod) => {
      const productKey = `${prod._id}_no-variant`;
      return {
        _id: prod._id,
        subCategoryId: prod.subCategoryId,
        name: prod.name,
        shopId: prod.shopId,
        vendorId: prod.vendorId,
        brand: prod.brandId,
        image: prod.primary_image,
        shortDescription: prod.shortDescription,
        vendorSellingPrice: prod.vendorSellingPrice,
        sellingUnit: prod.sellingUnit,
        rating: prod.rating,
        mrp: prod.mrp,
        unitOfMeasurement: prod.unitOfMeasurement,
        isInCart: cartMap.has(productKey),
        cartQty: cartMap.get(productKey) || 0,
        isInWishlist: wishlistSet.has(prod._id.toString()),
        variants: prod.variants.map((variant) => {
          const variantKey = `${prod._id}_${variant._id}`;

          return {
            _id: variant._id,
            variantTypeId: variant.variantTypeId,
            sku: variant.sku || '',
            variantName: variant.variantName || '',
            mrp: variant.mrp,
            sellingPrice: variant.sellingPrice,
            sellingUnit: variant.sellingUnit,
            stock: variant.stock || 0,
            status: variant.status || 'active',

            // ✅ FIXED
            isInCart: cartMap.has(variantKey),
            cartQty: cartMap.get(variantKey) || 0
          };
        })
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Product List retrieved successfully',
      productData,
      isServiceable: vendorId ? true : false
    });
  } catch (error) {
    console.error('Error in get sub category data controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// exports.getsubCategoryProductList = catchAsync(async (req, res, next) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });

//     const subCategoryId = new mongoose.Types.ObjectId(req.params.subCategoryId);
//     console.log('🚀 ~ subCategoryId:', subCategoryId);

//     const productList = await VendorProduct.aggregate([
//       { $match: { subCategoryId: subCategoryId, isDeleted: false } },
//       { $lookup: { from: 'vendorproductvariants', localField: '_id', foreignField: 'vendorProductId', as: 'variants' } },
//       {
//         $addFields: {
//           defaultVariant: {
//             $arrayElemAt: [
//               {
//                 $filter: {
//                   input: '$variants',
//                   as: 'v',
//                   cond: { $eq: ['$$v.isDefault', true] }
//                 }
//               },
//               0
//             ]
//           }
//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           subCategoryId: 1,
//           name: 1,
//           shopId: 1,
//           vendorId: 1,
//           image: '$primary_image',
//           shortDescription: 1,
//           rating: 1,
//           mrp: 1,

//           // SAME KEYS (FT SAFE)
//           vendorSellingPrice: {
//             $ifNull: ['$defaultVariant.sellingPrice', '$vendorSellingPrice']
//           },
//           sellingUnit: {
//             $ifNull: ['$defaultVariant.sellingUnit', '$sellingUnit']
//           },

//           // extra
//           hasVariants: {
//             $gt: [{ $size: '$variants' }, 0]
//           },
//           variants: 1 // Include variants array in output
//         }
//       }
//     ]);
//     console.log('🚀 ~ productList:', productList);

//     if (!productList.length) {
//       return res.status(404).json({
//         success: false,
//         message: 'No product list found for this sub-category'
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Product List retrieved successfully',
//       productList
//     });
//   } catch (error) {
//     console.error('Error in get sub category data controller:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// });
