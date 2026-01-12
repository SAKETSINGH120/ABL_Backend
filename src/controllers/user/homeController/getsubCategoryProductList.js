const Category = require('../../../models/category');
const User = require('../../../models/user');
const Vendor = require('../../../models/vendor');
const VendorProduct = require('../../../models/vendorProduct');
const { calculateOffer } = require('../../../utils/calculateOffer');
const catchAsync = require('../../../utils/catchAsync');
const mongoose = require('mongoose');

// exports.getsubCategoryProductList = catchAsync(async (req, res, next) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });

//     const subCategoryId = req.params.subCategoryId;

//     const productList = await VendorProduct.find({ subCategoryId: subCategoryId, isDeleted: false });

//     if (!productList || productList.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No product list found for this sub-category'
//       });
//     }

//     const productData = productList.map((prod) => ({
//       _id: prod._id,
//       subCategoryId: prod.subCategoryId,
//       name: prod.name,
//       shopId: prod.shopId,
//       vendorId: prod.vendorId,
//       image: prod.primary_image,
//       shortDescription: prod.shortDescription,
//       vendorSellingPrice: prod.vendorSellingPrice,
//       sellingUnit: prod.sellingUnit,
//       rating: prod.rating,
//       mrp: prod.mrp
//     }));

//     return res.status(200).json({
//       success: true,
//       message: 'Product List retrieved successfully',
//       productData
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

exports.getsubCategoryProductList = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const subCategoryId = new mongoose.Types.ObjectId(req.params.subCategoryId);
    console.log('🚀 ~ subCategoryId:', subCategoryId);

    const productList = await VendorProduct.aggregate([
      { $match: { subCategoryId: subCategoryId, isDeleted: false } },
      { $lookup: { from: 'vendorproductvariants', localField: '_id', foreignField: 'vendorProductId', as: 'variants' } },
      {
        $addFields: {
          defaultVariant: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$variants',
                  as: 'v',
                  cond: { $eq: ['$$v.isDefault', true] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          subCategoryId: 1,
          name: 1,
          shopId: 1,
          vendorId: 1,
          image: '$primary_image',
          shortDescription: 1,
          rating: 1,
          mrp: 1,

          // SAME KEYS (FT SAFE)
          vendorSellingPrice: {
            $ifNull: ['$defaultVariant.sellingPrice', '$vendorSellingPrice']
          },
          sellingUnit: {
            $ifNull: ['$defaultVariant.sellingUnit', '$sellingUnit']
          },

          // extra
          hasVariants: {
            $gt: [{ $size: '$variants' }, 0]
          },
          variants: 1 // Include variants array in output
        }
      }
    ]);
    console.log('🚀 ~ productList:', productList);

    if (!productList.length) {
      return res.status(404).json({
        success: false,
        message: 'No product list found for this sub-category'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product List retrieved successfully',
      productList
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
