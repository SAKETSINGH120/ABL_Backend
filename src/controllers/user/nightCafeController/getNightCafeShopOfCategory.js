// const Category = require("../../../models/category");
// const User = require("../../../models/user");
// const VendorProduct = require("../../../models/vendorProduct");
// const catchAsync = require("../../../utils/catchAsync");

// exports.getNightCafeShopOfCategory = catchAsync(async (req, res, next) => {
//     try {

//         const userId = req.user._id;
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }
//         const userType = user.userType;
//         const typeFilter = user.userType === "veg" ? { type: "veg" } : {}; 

//         const categoryId = req.params.categoryId;

//         const products = await VendorProduct.find({ status: "active", categoryId, ...typeFilter, isDeleted: false }).populate("shopId");

//         if (!products || products.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'No products found'
//             });
//         }

//         const uniqueShopsMap = new Map();
//         products.forEach((p) => {
//             if (p.shopId && p.shopId.isNightCafe == true && !uniqueShopsMap.has(p.shopId._id.toString())) {
//                 uniqueShopsMap.set(p.shopId._id.toString(), {
//                     _id: p.shopId._id,
//                     name: p.shopId.name,
//                     shopImage: p.shopId.shopImage,
//                     address: p.shopId.address,
//                     time: "15",
//                     distance: "3",
//                 })
//             }
//         })

//         const uniqueShops = Array.from(uniqueShopsMap.values());


//         return res.status(200).json({
//             success: true,
//             message: 'Products retrieved successfully',
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
// })

const Category = require("../../../models/category");
const User = require("../../../models/user");
const VendorProduct = require("../../../models/vendorProduct");
const catchAsync = require("../../../utils/catchAsync");
const getDistanceAndTime = require("../../../utils/getDistanceAndTime");
const Setting = require("../../../models/settings");

exports.getNightCafeShopOfCategory = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userCoords = {
            lat: parseFloat(user.lat || 0),
            long: parseFloat(user.long || 0),
        };

        const userType = user.userType;
        const typeFilter = user.userType === "veg" ? { type: "veg" } : {}; 

        const categoryId = req.params.categoryId;

        // Fetch products in the requested category
        const products = await VendorProduct.find({ 
            status: "active", 
            categoryId, 
            ...typeFilter, 
            isDeleted: false 
        }).populate("shopId");

        if (!products || products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No products found'
            });
        }

        // Fetch Google Maps API key from settings
        const setting = await Setting.findById("680f1081aeb857eee4d456ab");
        const apiKey = setting?.googleMapApiKey || "working";

        // Use a Map to ensure only unique night cafes are returned
        const uniqueShopsMap = new Map();

        // Iterate over products and calculate distance for each shop
        await Promise.all(products.map(async (product) => {
            if (product.shopId && product.shopId.isNightCafe === true) {
                // Check if the shop is already added
                if (!uniqueShopsMap.has(product.shopId._id.toString())) {
                    const shopCoords = {
                        lat: parseFloat(product.shopId.lat || 0),
                        long: parseFloat(product.shopId.long || 0)
                    };

                    const { distance, time } = await getDistanceAndTime(userCoords, shopCoords, apiKey);

                    uniqueShopsMap.set(product.shopId._id.toString(), {
                        _id: product.shopId._id,
                        name: product.shopId.name,
                        shopImage: product.shopId.shopImage,
                        address: product.shopId.address,
                        time: time || "15 min",
                        distance: distance || "3 km",
                    });
                }
            }
        }));

        // Convert map values to an array
        const uniqueShops = Array.from(uniqueShopsMap.values());

        // Optionally filter cafes based on distance (e.g., within 20 km)
        const filteredShops = uniqueShops.filter(shop => {
            const distanceKm = parseFloat(shop.distance.replace(" km", ""));
            return distanceKm <= 20; // Only include cafes within 20 km
        });

        return res.status(200).json({
            success: true,
            message: 'Night cafes for category retrieved successfully',
            length: filteredShops.length,
            data: filteredShops
        });

    } catch (error) {
        console.error('Error in get category controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});
