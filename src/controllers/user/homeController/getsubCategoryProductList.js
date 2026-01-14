const Category = require('../../../models/category');
const User = require('../../../models/user');
const newCart = require('../../../models/newCart');
const Vendor = require('../../../models/vendor');
const VendorProduct = require('../../../models/vendorProduct');
const { calculateOffer } = require('../../../utils/calculateOffer');
const catchAsync = require('../../../utils/catchAsync');
const mongoose = require('mongoose');

exports.getsubCategoryProductList = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log('🚀 ~ userId:', userId);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const subCategoryId = req.params.subCategoryId;

    const productList = await VendorProduct.find({ status: 'active', subCategoryId: subCategoryId, isDeleted: false })
      .populate('variants.variantTypeId', 'name')
      .populate('unitOfMeasurement', 'name -_id');
    const cartProducts = await newCart.findOne({ userId: userId });

    const cartProductIds = cartProducts ? cartProducts.items.map((item) => item?.productId.toString()) : [];
    const cartProductVariantIds = cartProducts ? cartProducts.items.map((item) => item?.variantId?.toString()) : [];
    console.log('🚀 ~ cartProducts:', JSON.stringify(cartProducts));

    if (!productList || productList.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No product list found for this sub-category'
      });
    }

    const cartMap = new Map();
    console.log('🚀 ~ cartMap:', cartMap);

    if (cartProducts) {
      cartProducts.items.forEach((item) => {
        const key = `${item.productId}_${item.variantId || 'no-variant'}`;
        cartMap.set(key, item.quantity);
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
        image: prod.primary_image,
        shortDescription: prod.shortDescription,
        vendorSellingPrice: prod.vendorSellingPrice,
        sellingUnit: prod.sellingUnit,
        rating: prod.rating,
        mrp: prod.mrp,
        unitOfMeasurement: prod.unitOfMeasurement,
        // ✅ FIXED
        isInCart: cartMap.has(productKey),
        cartQty: cartMap.get(productKey) || 0,
        // isInCart: cartProductIds.includes(prod._id.toString()),
        // variants: prod.variants.map((variant) => ({
        //   _id: variant._id,
        //   variantTypeId: variant.variantTypeId,
        //   sku: variant.sku || '',
        //   variantName: variant.variantName || '',
        //   mrp: variant.mrp,
        //   sellingPrice: variant.sellingPrice,
        //   sellingUnit: variant.sellingUnit,
        //   stock: variant.stock || 0,
        //   status: variant.status || 'active',
        //   isInCart: cartProductVariantIds.includes(variant._id.toString())
        // }))
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
      productData
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
