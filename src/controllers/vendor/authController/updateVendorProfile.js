const Vendor = require("../../../models/vendor");
const AppError = require("../../../utils/AppError");
const catchAsync = require("../../../utils/catchAsync");

exports.updateVendorProfile = catchAsync(async (req, res, next) => {
    try {
        const vendorId = req.vendor._id;

        const { name, mobile, alternateMobile, email, address, pincode, city, state, latitude, longitude, deliveryCharge, packingCharge } = req.body;

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return next(new AppError("Vendor not found.", 404));

        const location = {
            type: "Point",
            coordinates: vendor.location?.coordinates || [longitude, latitude]
        }

        vendor.name = name || vendor.name
        vendor.mobile = mobile || vendor.mobile
        vendor.alternateMobile = alternateMobile || vendor.alternateMobile
        vendor.email = email || vendor.email
        vendor.address = address || vendor.address
        vendor.pincode = pincode || vendor.pincode
        vendor.city = city || vendor.city
        vendor.state = state || vendor.state
        vendor.deliveryCharge = deliveryCharge || vendor.deliveryCharge
        vendor.packingCharge = packingCharge || vendor.packingCharge

        if (longitude) {
            location.coordinates[0] = longitude
        }
        if (latitude) {
            location.coordinates[1] = latitude
        }

        vendor.location = location

        await vendor.save();

        return res.status(200).json({
            status: true,
            message: "Profile updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});
