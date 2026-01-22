const Explore = require("../../../models/explore");
const exploreSection = require("../../../models/exploreSection");
const { calculateOffer } = require("../../../utils/calculateOffer");
const catchAsync = require("../../../utils/catchAsync");
const UserServices = require("../../../services/user");
const VendorServices = require("../../../services/vendor")

const formatProduct = (prod) => ({
    _id: prod._id,
    name: prod.name,
    vendorId: prod.vendorId,
    primary_image: prod.primary_image,
    shortDescription: prod.shortDescription,
    price: prod.vendorSellingPrice,
    mrp: prod.mrp,
    offer: calculateOffer(prod.mrp, prod.vendorSellingPrice),
    distance: "3",
    time: "10"
});

// Get Single
exports.getExplore = catchAsync(async (req, res) => {
    const exploreId = req.params.exploreId
    const userId = req.user._id;
    const user = await UserServices.getUserById(userId);
    if (!user) return res.status(400).json({ success: false, message: 'Invalid userId' });

    if (!user.pincode) {
        return res.status(400).json({
            success: false,
            message: 'User pincode is required'
        });
    }

    const [explore, vendor] = await Promise.all([Explore.findById(exploreId).select("name bannerImg couponCode"), VendorServices.getVendor({ status: true })])

    if (!explore) throw new AppError("Invalid exploreId", 400);
    const vendorId = vendor?._id;

    const exploreSectionsRaw = await exploreSection.find({ exploreId: exploreId }).select("name products").populate({ path: "products" });

    if (!exploreSectionsRaw || exploreSectionsRaw.length === 0) {
        return res.status(200).json({
            status: true,
            message: "No sections found for this explore",
            exploreSections: {}
        });
    }

    const exploreSections = exploreSectionsRaw.map((section) => {
        return {
            _id: section._id,
            name: section.name,
            products: section.products.slice(0, 5).filter(product => product.vendorId.toString() === vendorId.toString()).map(product => formatProduct(product))
        }
    });

    return res.status(200).json({
        status: true,
        explore,
        exploreSections
    });
});