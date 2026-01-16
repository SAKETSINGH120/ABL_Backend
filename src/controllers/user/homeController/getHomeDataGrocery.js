const banner = require('../../../models/banner');
const Category = require('../../../models/category');
const Explore = require('../../../models/explore');
const User = require('../../../models/user');
const VendorProduct = require('../../../models/vendorProduct');
const Setting = require('../../../models/settings');
const { calculateOffer } = require('../../../utils/calculateOffer');
const catchAsync = require('../../../utils/catchAsync');
const { MART_SERVICE_ID } = require('../../../utils/constants');
const checkServiceability = require('../../../utils/checkServiceability');
const newCart = require('../../../models/newCart');
const Vendor = require('../../../models/vendor');

const formatProduct = (prod, cartMap) => {
  const productKey = `${prod._id}_no-variant`;

  return ({
    _id: prod._id,
    name: prod.name,
    vendorId: prod.vendorId,
    primary_image: prod.primary_image,
    sellingUnit: prod.sellingUnit,
    mrp: prod.mrp,
    price: prod.vendorSellingPrice,
    offer: calculateOffer(prod.mrp, prod.vendorSellingPrice),
    shortDescription: prod.shortDescription,
    subCategoryId: prod.subCategoryId,
    unitOfMeasurement: prod.unitOfMeasurement,
    isInCart: cartMap.has(productKey),
    cartQty: cartMap.get(productKey) || 0,
    variants: prod.variants.map((variant) => {
      const variantKey = `${prod._id}_${variant._id}`;

      return {
        _id: variant._id,
        variantTypeId: variant.variantTypeId,
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
};

exports.getHomeDataGrocery = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const productLimit = 10;

  // Fetch initial data in parallel
  const [setting, user, userActiveCart] = await Promise.all([Setting.findById('680f1081aeb857eee4d456ab'), User.findById(userId), newCart.findOne({ userId: userId, status: 'active' })]);

  if (!user.pincode) {
    return res.status(400).json({
      success: false,
      message: 'Pincode is required'
    });
  }

  const vendor = await Vendor.findOne({ status: true, pincode: user.pincode }).select('_id');
  const vendorId = vendor?._id;


  // const apiKey = '';
  const userCoords = {
    lat: parseFloat(user.lat || 0),
    long: parseFloat(user.long || 0)
  };

  // const isServiceable = await checkServiceability(user._id, userCoords, apiKey);
  const isServiceable = vendor ? true : false;

  const typeFilter = {};
  const queryCommon = { status: 'active', ...typeFilter };
  if (vendorId) {
    queryCommon.vendorId = vendorId;
  }

  const [banners, middleBanner, categories, explore, featuredRaw, seasonalRaw, vegRaw, fruitRaw, dealOfTheDay, kitchenRaw] = await Promise.all([
    banner.find({ section: 'top' }).select('image').sort({ createdAt: -1 }),
    banner.find({ section: 'middle' }).select('image').sort({ createdAt: -1 }),
    Category.find({ cat_id: null }).select('name image').limit(8).sort({ createdAt: -1 }),
    Explore.find({}).select('name icon'),
    VendorProduct.find({ ...queryCommon, isFeatured: true, isDeleted: false })
      .limit(productLimit).populate('variants.variantTypeId', 'name')
      .populate('unitOfMeasurement', 'name -_id'),
    VendorProduct.find({ ...queryCommon, isSeasonal: true, isDeleted: false })
      .limit(productLimit).populate('variants.variantTypeId', 'name')
      .populate('unitOfMeasurement', 'name -_id'),
    VendorProduct.find({ ...queryCommon, isVegetableOfTheDay: true, isDeleted: false })
      .limit(productLimit).populate('variants.variantTypeId', 'name')
      .populate('unitOfMeasurement', 'name -_id'),
    VendorProduct.find({ ...queryCommon, isFruitOfTheDay: true, isDeleted: false })
      .limit(productLimit).populate('variants.variantTypeId', 'name')
      .populate('unitOfMeasurement', 'name -_id'),
    VendorProduct.find({ ...queryCommon, isDealOfTheDay: true, isDeleted: false })
      .limit(productLimit).populate('variants.variantTypeId', 'name')
      .populate('unitOfMeasurement', 'name -_id'),
    VendorProduct.find({ ...queryCommon, categoryId: '6854ffe193a2cab5ddcba4cf' }).limit(productLimit).populate('variants.variantTypeId', 'name')
      .populate('unitOfMeasurement', 'name -_id')
  ]);

  const cartMap = new Map();

  if (userActiveCart) {
    userActiveCart.items.forEach((item) => {
      const key = `${item.productId}_${item.variantId || 'no-variant'}`;
      cartMap.set(key, item.quantity);
    });
  }

  for (let i = 0; i < productLimit; i++) {
    if (featuredRaw[i]) featuredRaw[i] = formatProduct(featuredRaw[i], cartMap);
    if (seasonalRaw[i]) seasonalRaw[i] = formatProduct(seasonalRaw[i], cartMap);
    if (vegRaw[i]) vegRaw[i] = formatProduct(vegRaw[i], cartMap);
    if (fruitRaw[i]) fruitRaw[i] = formatProduct(fruitRaw[i], cartMap);
    if (dealOfTheDay[i]) dealOfTheDay[i] = formatProduct(dealOfTheDay[i], cartMap);
    if (kitchenRaw[i]) kitchenRaw[i] = formatProduct(kitchenRaw[i], cartMap);
  }

  res.status(200).json({
    success: true,
    message: 'Home data fetched successfully',
    data: {
      banners,
      middleBanner,
      categories,
      explore,
      featuredProducts: featuredRaw,
      seasonalProducts: seasonalRaw,
      vegetableslProducts: vegRaw,
      fruitsProducts: fruitRaw,
      dealOfTheDay: dealOfTheDay,
      kitchenProducts: kitchenRaw,
      isServiceable
    }
  });
});
