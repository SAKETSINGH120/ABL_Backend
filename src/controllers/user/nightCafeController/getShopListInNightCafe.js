// const Category = require("../../../models/category");
// const Shop = require("../../../models/shop");
// const VendorProduct = require("../../../models/vendorProduct");
// const { calculateOffer } = require("../../../utils/calculateOffer");
// const catchAsync = require("../../../utils/catchAsync");

// exports.getShopListInNightCafe = catchAsync(async (req, res) => {

//     const cafeList = await Shop.find({ isNightCafe: true, isClose: false, status: "active" }).sort({ createdAt: -1 });

//     const cafes = cafeList.map(cafe => ({
//         _id: cafe._id,
//         name: cafe.name || "",
//         image: cafe.shopImage || "",
//         address: cafe.address,
//         time: cafe.deliveryTime || "15 min",
//         distance: cafe.distance || "3 km",
//         rating: cafe.rating || 4.0,
//         offer: cafe.offer || "50% OFF"
//     }));

//     return res.status(200).json({
//         status: true,
//         cafes
//     });
// });

const Category = require("../../../models/category");
const Shop = require("../../../models/shop");
const VendorProduct = require("../../../models/vendorProduct");
const { calculateOffer } = require("../../../utils/calculateOffer");
const catchAsync = require("../../../utils/catchAsync");
const getDistanceAndTime = require("../../../utils/getDistanceAndTime");
const Setting = require("../../../models/settings");
const User = require("../../../models/user");
const { FOOD_SERVICE_ID } = require("../../../utils/constants");

exports.getShopListInNightCafe = catchAsync(async (req, res) => {
  // Get current user and settings
  const [user, setting] = await Promise.all([
    User.findById(req.user._id),
    Setting.findById("680f1081aeb857eee4d456ab")
  ]);

  const apiKey = setting?.googleMapApiKey || "working";
  const userCoords = {
    lat: parseFloat(user.lat || 0),
    long: parseFloat(user.long || 0),
  };

  // Find all active night cafes (limit radius to 20km as an example)
  const allNightCafes = await Shop.find({
    isNightCafe: true,
    isClose: false,
    status: "active"
  }).select("name shopImage lat long address deliveryTime rating offer");

  // Calculate distance for each cafe and filter within 20km
  const cafesWithDistance = await Promise.all(
    allNightCafes.map(async cafe => {
      const shopCoords = {
        lat: parseFloat(cafe.lat || 0),
        long: parseFloat(cafe.long || 0)
      };

      const { distance, time } = await getDistanceAndTime(userCoords, shopCoords, apiKey);

      return {
        _id: cafe._id,
        name: cafe.name || "",
        image: cafe.shopImage || "",
        address: cafe.address,
        time: time || cafe.deliveryTime || "15 min",
        distance,
        rating: cafe.rating || 4.0,
        offer: cafe.offer || "50% OFF",
        distanceKm: parseFloat(distance.replace(" km", "")) || 0
      };
    })
  );

  // Filter shops within 20km
  const filteredCafes = cafesWithDistance.filter(cafe => cafe.distanceKm <= 20);

  return res.status(200).json({
    status: true,
    cafes: filteredCafes
  });
});
