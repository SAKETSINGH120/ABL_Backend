const Category = require("../../../models/category");
const Setting = require("../../../models/settings");
const User = require("../../../models/user");
const VendorProduct = require("../../../models/vendorProduct");
const Shop = require("../../../models/shop");
const ShopCategoryPriority = require("../../../models/ShopCategoryPriority");
const catchAsync = require("../../../utils/catchAsync");
const getDistanceAndTime = require("../../../utils/getDistanceAndTime"); // Import the utility
const { default: mongoose } = require("mongoose");

// exports.getShopOfCategory = catchAsync(async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const userCoords = [parseFloat(user.long || 0), parseFloat(user.lat || 0)];
//     const categoryId = new mongoose.Types.ObjectId(req.params.categoryId);

//     // Get priority shops (your custom logic)
//     const priorityShops = await ShopCategoryPriority.aggregate([
//       { $match: { categoryId } },
//       { $sort: { priority: -1 } },
//       {
//         $lookup: {
//           from: "shops",
//           localField: "shopId",
//           foreignField: "_id",
//           as: "shop",
//         },
//       },
//       { $unwind: "$shop" },
//       { $match: { "shop.status": "active" } },
//     ]);

//     // Get shops within 7 km using $geoNear
//     const nearbyShops = await Shop.aggregate([
//       {
//         $geoNear: {
//           near: { type: "Point", coordinates: userCoords },
//           distanceField: "distance", // will return distance in meters
//           spherical: true,
//           maxDistance: 7000, // 7 km
//         },
//       },
//       { $match: { status: "active" } },
//       {
//         $lookup: {
//           from: "vendorproducts",
//           localField: "_id",
//           foreignField: "shopId",
//           as: "products",
//         },
//       },
//       { $match: { "products.categoryId": categoryId } },
//       {
//         $project: {
//           name: 1,
//           address: 1,
//           shopImage: 1,
//           rating: 1,
//           distance: 1,
//         },
//       },
//       { $sort: { distance: -1, rating: -1 } }, // closest + best rated
//     ]);

//     console.log("Priority Shops:", priorityShops);
//     console.log("Nearby Shops:", nearbyShops);
//     // Merge priority shops (they may overlap with nearbyShops)
//     const allShops = [
//       ...priorityShops.map((ps) => ({
//         _id: ps.shop._id,
//         name: ps.shop.name,
//         address: ps.shop.address,
//         rating: ps.shop.rating,
//         priority: ps.priority,
//         distance: null, // priority shops may skip geoNear
//       })),
//       ...nearbyShops,
//     ];

//     return res.status(200).json({
//       success: true,
//       message: "Shops fetched successfully",
//       count: allShops.length,
//       data: allShops,
//     });
//   } catch (error) {
//     console.error("Error in getShopOfCategory:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// });

//========= Distinct logic with distance and time calculation ==========//
exports.getShopOfCategory = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const setting = await Setting.findById("680f1081aeb857eee4d456ab");
    const apiKey = setting?.googleMapApiKey || "working";

    // User coords
    const userCoords = {
      lat: parseFloat(user.lat || 0),
      long: parseFloat(user.long || 0),
    };

    const typeFilter = user.userType === "veg" ? { type: "veg" } : {};
    const categoryId = req.params.categoryId;

    // 1️⃣ Get priority shops (with priority values)
    const priorityDocs = await ShopCategoryPriority.find({
      categoryId: new mongoose.Types.ObjectId(categoryId),
    });

    const priorityMap = new Map(); // shopId -> priority
    const priorityShopIds = [];
    priorityDocs.forEach((doc) => {
      priorityMap.set(doc.shopId.toString(), doc.priority);
      priorityShopIds.push(doc.shopId.toString());
    });

    // 2️⃣ Get shopIds from products
    const productShopIds = await VendorProduct.find({
      status: "active",
      categoryId,
      ...typeFilter,
      isDeleted: false,
    }).distinct("shopId");
    console.log("Product Shop IDs:", productShopIds);
    // 3️⃣ Merge shopIds (priority + product)
    const allShopIds = [...new Set([...priorityShopIds, ...productShopIds])];

    if (!allShopIds.length) {
      return res
        .status(404)
        .json({ success: false, message: "No shops found" });
    }

    // 4️⃣ Fetch shop details
    const shops = await Shop.find({
      _id: { $in: allShopIds },
      status: "active",
      // isClose:false
    }).select("name shopImage galleryImage address lat long rating isClose");

    const shopPromises = [];
    const shopList = [];

    shops.forEach((shop) => {
      const shopData = {
        _id: shop._id,
        name: shop.name,
        shopImage: shop.galleryImage?.length ? shop.galleryImage[0] : shop.shopImage,
        shopImage2: shop.shopImage,
        address: shop.address,
        priority: priorityMap.get(shop._id.toString()) || null,
        rating: parseFloat(shop.rating || 0),
        time: null,
        distance: null,
        shopLat: parseFloat(shop.lat || 0),
        shopLong: parseFloat(shop.long || 0),
        isClose:shop.isClose
      };

      shopList.push(shopData);

      // Calculate distance/time if coordinates are valid
      if (shopData.shopLat !== 0 || shopData.shopLong !== 0) {
        shopPromises.push(
          (async () => {
            const shopCoords = { lat: shopData.shopLat, long: shopData.shopLong };
            const { distance, time } = await getDistanceAndTime(
              userCoords,
              shopCoords,
              apiKey
            );
            shopData.distance = distance;
            shopData.time = time;
          })()
        );
      }
    });

    // 5️⃣ Wait for all distance/time
    await Promise.all(shopPromises);
    console.log("Shops with distance/time:", shopList);
    // 6️⃣ Filter by distance <= 7 km
    let filteredShops = shopList.filter((s) => {
      if (s.distance === null) return false;
      return parseFloat(s.distance) <= 20;
    });

    // 7️⃣ Sort by priority first, then rating
    filteredShops.sort((a, b) => {
      if (a.priority !== null && b.priority !== null) {
        return a.priority - b.priority; // lower number = higher priority
      }
      if (a.priority !== null) return -1;
      if (b.priority !== null) return 1;
      return b.rating - a.rating;
    });

    // 8️⃣ Clean up temporary fields
    filteredShops.forEach((shop) => {
      delete shop.shopLat;
      delete shop.shopLong;
    });

    console.log("filteredShops.length",filteredShops.length);
    return res.status(200).json({
      success: true,
      message: "Shops retrieved successfully",
      length: filteredShops.length,
      data: filteredShops,
    });
  } catch (error) {
    console.error("Error in get category controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});


// exports.getShopOfCategory = catchAsync(async (req, res, next) => {
//     try {

//         const userId = req.user._id;
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         const setting = await Setting.findById("680f1081aeb857eee4d456ab");
//         const apiKey = setting?.googleMapApiKey || "working";

//         // Get user's coordinates
//         const userCoords = {
//             lat: parseFloat(user.lat || 0),
//             long: parseFloat(user.long || 0),
//         };

//         const userType = user.userType;
//         const typeFilter = user.userType === "veg" ? { type: "veg" } : {}; // empty means no filter

//         const categoryId = req.params.categoryId;

//         // First get shops with priority for this category
//         const priorityShops = await ShopCategoryPriority.aggregate([
//             { $match: { categoryId: new mongoose.Types.ObjectId(categoryId) } },
//             { $sort: { priority: -1 } }, // Sort by priority in descending order (highest first)
//             {
//                 $lookup: {
//                     from: 'shops',
//                     localField: 'shopId',
//                     foreignField: '_id',
//                     as: 'shop'
//                 }
//             },
//             { $unwind: '$shop' },
//             { $match: { 'shop.status': 'active' } }
//         ]);
//         console.log("Priority Shops:", priorityShops);

//         // Get all active shops for this category
//         const products = await VendorProduct.find({
//             status: "active",
//             categoryId,
//             ...typeFilter,
//             isDeleted: false
//         }).populate("shopId", "name shopImage galleryImage address lat long rating");

//         console.log("Products found:", products.length);
//         if (!products || products.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'No products found'
//             });
//         }

//         const uniqueShopsMap = new Map();
//         const shopPromises = []; // To store promises for distance/time calculation

//         // First add priority shops
//         priorityShops.forEach((ps) => {
//             if (ps.shop && !uniqueShopsMap.has(ps.shop._id.toString())) {
//                 const shopData = {
//                     _id: ps.shop._id,
//                     name: ps.shop.name,
//                     shopImage: ps.shop.galleryImage ? ps.shop.galleryImage[0] : ps.shop.shopImage,
//                     shopImage2: ps.shop.shopImage,
//                     address: ps.shop.address,
//                     priority: ps.priority,
//                     rating: parseFloat(ps.shop.rating || 0),
//                     time: null,
//                     distance: null,
//                     shopLat: parseFloat(ps.shop.lat || 0),
//                     shopLong: parseFloat(ps.shop.long || 0),
//                 };
//                 uniqueShopsMap.set(ps.shop._id.toString(), shopData);

//                 // Add a promise to calculate distance and time for priority shops
//                 if (shopData.shopLat !== 0 || shopData.shopLong !== 0) {
//                     shopPromises.push(
//                         (async () => {
//                             const shopCoords = { lat: shopData.shopLat, long: shopData.shopLong };
//                             const { distance, time } = await getDistanceAndTime(userCoords, shopCoords, apiKey);
//                             shopData.distance = distance;
//                             shopData.time = time;
//                         })()
//                     );
//                 }
//             }
//         });

//         // Then add remaining shops
//         products.forEach((p) => {
//             if (p.shopId && !uniqueShopsMap.has(p.shopId._id.toString())) {
//                 const shopData = {
//                     _id: p.shopId._id,
//                     name: p.shopId.name,
//                     shopImage: p.shopId.galleryImage ? p.shopId.galleryImage[0] : p.shopId.shopImage,
//                     shopImage2: p.shopId.shopImage,
//                     address: p.shopId.address,
//                     priority: null,
//                     rating: parseFloat(p.shopId.rating || 0),
//                     time: null,
//                     distance: null,
//                     shopLat: parseFloat(p.shopId.lat || 0),
//                     shopLong: parseFloat(p.shopId.long || 0),
//                 };
//                 uniqueShopsMap.set(p.shopId._id.toString(), shopData);

//                 // Add a promise to calculate distance and time for this shop
//                 // Only add if shop has valid coordinates
//                 if (shopData.shopLat !== 0 || shopData.shopLong !== 0) { // Check if coordinates are valid
//                     shopPromises.push(
//                         (async () => {
//                             const shopCoords = { lat: shopData.shopLat, long: shopData.shopLong };
//                             const { distance, time } = await getDistanceAndTime(userCoords, shopCoords, apiKey);
//                             shopData.distance = distance;
//                             shopData.time = time;
//                         })()
//                     );
//                 }
//             }
//         });

//         // Wait for all distance/time calculations to complete
//         await Promise.all(shopPromises);

//         // Convert Map values to an array and sort
//         let uniqueShops = Array.from(uniqueShopsMap.values());


//         // ✅ Filter shops by distance (<= 7 km only)
//         // Assuming distance is in kilometers, if it's in meters adjust accordingly
//         uniqueShops = uniqueShops.filter(shop => {
//             if (shop.distance === null) return false; // remove shops with no distance
//             return parseFloat(shop.distance) <= 7;    // keep shops within 7 km
//         });



//         // Sort shops: first by priority (highest to lowest), then by rating (highest to lowest)
//         uniqueShops.sort((a, b) => {
//             // If both have priority, sort by priority (highest first)
//             if (a.priority !== null && b.priority !== null) {
//                 return a.priority - b.priority; // Lower priority number means higher priority
//             }
//             // If only one has priority, it should come first
//             if (a.priority !== null) return -1;
//             if (b.priority !== null) return 1;
//             // If neither has priority, sort by rating (highest first)
//             return b.rating - a.rating;
//         });

//         // Remove temporary properties
//         uniqueShops.forEach(shop => {
//             delete shop.shopLat;
//             delete shop.shopLong;
//         });


//         return res.status(200).json({
//             success: true,
//             message: 'Shops retrieved successfully',
//             length: uniqueShops.length,
//             data: uniqueShops
//         });

//     } catch (error) {
//         console.error('Error in get category controller:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Internal server error',
//             error: error.message
//         });
//     }
// });