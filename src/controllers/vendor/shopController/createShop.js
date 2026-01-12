const Shop = require('../../../models/shop');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');

exports.createShop = catchAsync(async (req, res, next) => {
  const { name, shopType, address, pincode, city, state, lat, long, description, phone, rating, deliveryCharge, packingCharge } = req.body;

  const vendorId = req.vendor._id;

  const files = req.files;
  const shopImage = files.shopImage && files.shopImage[0] ? files.shopImage[0].path : '';
  const galleryImage = files.galleryImage ? files.galleryImage.map((file) => file.path) : [];

  if (!name) return next(new AppError('Name is required.', 404));
  if (!vendorId) return next(new AppError('Vendor is required.', 404));
  if (!address) return next(new AppError('Address is required.', 404));
  if (!lat) return next(new AppError('Latitude is required.', 404));
  if (!long) return next(new AppError('Longitude is required.', 404));
  if (!packingCharge && packingCharge !== 0) return next(new AppError('Packing charge is required.', 404));
  if (!phone) return next(new AppError('Phone number is required.', 404));
  // if (galleryImage.length === 0) return next(new AppError('Gallery images are required.', 404));

  // check if one shop or say vendor already exits in same pincode then we dont give permission to create shop
  const existingShopOnSamePincode = await Shop.findOne({ pincode: pincode });

  if (existingShopOnSamePincode) {
    return next(new AppError('Shop already present on this location or pincode', 404));
  }

  const location = {
    type: 'Point',
    coordinates: [parseFloat(long), parseFloat(lat)]
  };

  const shopDetails = {
    name,
    // serviceId,
    vendorId,
    shopType,
    shopImage,
    address,
    pincode,
    city,
    state,
    lat,
    long,
    description,
    phone,
    rating,
    deliveryCharge,
    packingCharge,
    location
  };

  if (galleryImage.length > 0) {
    shopDetails.galleryImage = galleryImage;
  }

  const newShop = await Shop.findOneAndUpdate({ vendorId: vendorId }, shopDetails, { upsert: true }, { new: true });

  return res.status(201).json({
    success: true,
    message: 'Shop created successfully',
    shop: newShop
  });
});
