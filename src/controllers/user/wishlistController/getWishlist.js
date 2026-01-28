const newCart = require('../../../models/newCart');
const Wishlist = require('../../../models/wishlist');
const catchAsync = require('../../../utils/catchAsync');

exports.getWishlist = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const [wishlist, cartProducts] = await Promise.all([Wishlist.findOne({ userId }).populate({
    path: 'items.productId',
    select: 'name primary_image vendorSellingPrice mrp shortDescription rating status isDeleted subCategoryId brandId unitOfMeasurement variants sellingUnit',
    populate: [
      { path: 'brandId', select: 'name' },
      { path: 'unitOfMeasurement', select: 'name' },
    ]
  }), newCart.findOne({ userId: userId, status: 'active' })])

  if (!wishlist || wishlist.items.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'Wishlist is empty',
      data: {
        items: [],
        count: 0
      }
    });
  }

  const cartMap = new Map();

  if (cartProducts) {
    cartProducts.items.forEach((item) => {
      const key = `${item.productId}_${item.variantId || 'no-variant'}`;
      cartMap.set(key, item.quantity);
    });
  }

  // Filter out deleted or inactive products
  const activeItems = wishlist.items.filter((item) => item.productId && item.productId.status === 'active' && !item.productId.isDeleted);

  // Format response
  const formattedItems = activeItems.map((item) => {
    const productKey = `${item.productId._id}_no-variant`;
    return ({
      _id: item.productId._id,
      name: item.productId.name,
      image: item.productId.primary_image,
      vendorSellingPrice: item.productId.vendorSellingPrice,
      mrp: item.productId.mrp,
      shortDescription: item.productId.shortDescription,
      rating: item.productId.rating,
      brand: item.productId.brandId,
      unitOfMeasurement: item.productId.unitOfMeasurement,
      sellingUnit: item.productId.sellingUnit,
      addedAt: item.addedAt,
      isInCart: cartMap.has(productKey),
      cartQty: cartMap.get(productKey) || 0,
      variants: item.productId.variants.map((variant) => {
        const variantKey = `${item.productId._id}_${variant._id}`;

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
          isInCart: cartMap.has(variantKey),
          cartQty: cartMap.get(variantKey) || 0
        };
      })
    })
  });

  return res.status(200).json({
    success: true,
    message: 'Wishlist retrieved successfully',
    data: {
      items: formattedItems,
      count: formattedItems.length
    }
  });
});
