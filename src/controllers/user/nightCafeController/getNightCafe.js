// const Category = require("../../../models/category");
// const Shop = require("../../../models/shop");
// const VendorProduct = require("../../../models/vendorProduct");
// const { calculateOffer } = require("../../../utils/calculateOffer");
// const catchAsync = require("../../../utils/catchAsync");
// const { FOOD_SERVICE_ID } = require("../../../utils/constants");

// exports.getNightCafe = catchAsync(async (req, res) => {
//   const pageData = {
//     name: "Night Cafe",
//     bannerImg: "public/banners/banner-night-cafe.png",
//     promoText: "Hunger Never Sleeps, Neither Do We!",
//   };

//   const cafeQuery = Shop.find({
//     isNightCafe: true,
//     isClose: false,
//     status: "active",
//   }).sort({ createdAt: -1 });
//   // .limit();

//   const categoryQuery = Category.find({ serviceId: FOOD_SERVICE_ID })
//     .select("name image")
//     .sort({ createdAt: -1 });

//   // Wait for cafeList and categoryList in parallel
//   const [cafeList, categoryList] = await Promise.all([
//     cafeQuery,
//     categoryQuery,
//   ]);

//   const cafeIds = cafeList.map((cafe) => cafe._id);

//   const productList = await VendorProduct.find({
//     serviceId: FOOD_SERVICE_ID,
//     status: "active",
//     $or: [{ isRecommended: true }, { isFeatured: true }],
//     isRecommended: true,
//     isDeleted: false,
//     shopId: { $in: cafeIds },
//   })
//     .populate("shopId", "name shopImage")
//     .sort({ createdAt: -1 })
//     .limit(20);

//   const categoryIdSet = new Set();

//   productList.forEach((product) => {
//     if (product.categoryId) {
//       categoryIdSet.add(String(product.categoryId));
//     }
//   });

//   const uniqueCategoryIds = Array.from(categoryIdSet);

//   const categoryDetails = await Category.find({
//     _id: { $in: uniqueCategoryIds },
//   })
//     .select("name image")
//     .sort({ createdAt: -1 });

//   // Build response data (mapping)
//   const cafes = cafeList.map((cafe) => ({
//     _id: cafe._id,
//     name: cafe.name || "",
//     image: cafe.shopImage || "",
//     time: cafe.deliveryTime || "15 min",
//     distance: cafe.distance || "3 km",
//     rating: cafe.rating || 4.0,
//     offer: cafe.offer || "50% OFF",
//   }));

//   const cravings = categoryDetails.map((cat) => ({
//     _id: cat._id,
//     name: cat.name || "",
//     image: cat.image || "public/images/default-category.png",
//   }));

//   const specials = cafeList.map((cafe) => ({
//     _id: cafe._id,
//     name: cafe.name || "",
//     image: cafe.shopImage || "",
//     offer: cafe.offer || "50% OFF",
//   }));

//   const trending = productList.map((prod) => ({
//     _id: prod._id,
//     name: prod.name || "",
//     shopId: prod.shopId?._id || "",
//     vendorId: prod.vendorId || "",
//     shopName: prod.shopId?.name || "",
//     primary_image: prod.primary_image || "public/images/default-product.png",
//     price: prod.vendorSellingPrice || 0,
//     mrp: prod.mrp || 0,
//     offer: calculateOffer(prod.mrp, prod.vendorSellingPrice),
//     label: prod.isRecommended
//       ? "RECOMMENDED"
//       : prod.isFeatured
//       ? "FEATURED"
//       : "",
//   }));

//   return res.status(200).json({
//     status: true,
//     pageData,
//     cafes,
//     cravings,
//     specials,
//     trending,
//   });
// });


const Category = require("../../../models/category");
const Shop = require("../../../models/shop");
const VendorProduct = require("../../../models/vendorProduct");
const { calculateOffer } = require("../../../utils/calculateOffer");
const catchAsync = require("../../../utils/catchAsync");
const { FOOD_SERVICE_ID } = require("../../../utils/constants");
const User = require("../../../models/user");
const findNearbyShops = require("../../../utils/findNearbyShops");
const getDistanceAndTime = require("../../../utils/getDistanceAndTime");

exports.getNightCafe = catchAsync(async (req, res) => {
  const pageData = {
    name: "Night Cafe",
    bannerImg: "public/banners/banner-night-cafe.png",
    promoText: "Hunger Never Sleeps, Neither Do We!",
  };

  const user = await User.findById(req.user._id).lean();
  const userCoords = {
    lat: parseFloat(user.lat || 0),
    long: parseFloat(user.long || 0),
  };

  // Find all nearby night cafes within 15 km (you can adjust the radius)
  const nearbyNightCafes = await findNearbyShops(userCoords, FOOD_SERVICE_ID, 15, {
    isNightCafe: true,
    isClose: false,
    status: "active",
  });

  if (nearbyNightCafes.length === 0) {
    return res.status(200).json({
      status: true,
      message: "No nearby night cafes found",
      pageData,
      cafes: [],
      cravings: [],
      specials: [],
      trending: [],
    });
  }

  const cafeIds = nearbyNightCafes.map((cafe) => cafe._id);

  // Fetch product list from those cafes
  const productList = await VendorProduct.find({
    serviceId: FOOD_SERVICE_ID,
    status: "active",
    $or: [{ isRecommended: true }, { isFeatured: true }],
    isDeleted: false,
    shopId: { $in: cafeIds },
  })
    .populate("shopId", "name shopImage lat long")
    .sort({ createdAt: -1 })
    .limit(20);

  // Collect unique category IDs
  const categoryIdSet = new Set();
  productList.forEach((product) => {
    if (product.categoryId) {
      categoryIdSet.add(String(product.categoryId));
    }
  });

  const uniqueCategoryIds = Array.from(categoryIdSet);

  const categoryDetails = await Category.find({
    _id: { $in: uniqueCategoryIds },
  })
    .select("name image")
    .sort({ createdAt: -1 });

  // Build location-aware cafe list
  const cafes = await Promise.all(
    nearbyNightCafes.map(async (cafe) => {
      const cafeCoords = {
        lat: parseFloat(cafe.lat || 0),
        long: parseFloat(cafe.long || 0),
      };

      const { distance, time } = await getDistanceAndTime(userCoords, cafeCoords);

      return {
        _id: cafe._id,
        name: cafe.name || "",
        image: cafe.shopImage || "",
        time: time || "15 min",
        distance: distance || "3 km",
        rating: cafe.rating || 4.0,
        offer: cafe.offer || "50% OFF",
      };
    })
  );

  const cravings = categoryDetails.map((cat) => ({
    _id: cat._id,
    name: cat.name || "",
    image: cat.image || "public/images/default-category.png",
  }));

  const specials = cafes.map((cafe) => ({
    _id: cafe._id,
    name: cafe.name || "",
    image: cafe.image || "",
    offer: cafe.offer || "50% OFF",
  }));

  const trending = productList.map((prod) => ({
    _id: prod._id,
    name: prod.name || "",
    shopId: prod.shopId?._id || "",
    vendorId: prod.vendorId || "",
    shopName: prod.shopId?.name || "",
    primary_image: prod.primary_image || "public/images/default-product.png",
    price: prod.vendorSellingPrice || 0,
    mrp: prod.mrp || 0,
    offer: calculateOffer(prod.mrp, prod.vendorSellingPrice),
    label: prod.isRecommended
      ? "RECOMMENDED"
      : prod.isFeatured
      ? "FEATURED"
      : "",
  }));

  return res.status(200).json({
    status: true,
    pageData,
    cafes,
    cravings,
    specials,
    trending,
  });
});
