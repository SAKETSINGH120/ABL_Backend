const Driver = require("../../../models/driver");
const AppError = require("../../../utils/AppError");
const catchAsync = require("../../../utils/catchAsync");
const createToken = require("../../../utils/createToken");

exports.verifyOtp = catchAsync(async (req, res, next) => {
    const { otp, driverId, deviceId, deviceToken } = req.body;
    if (!driverId) {
        return next(new AppError("Driver Id is required.", 400));
    }
    if (!otp || !otp.trim()) {
        return next(new AppError("Otp is required.", 400));
    }

    const driver = await Driver.findOne({ _id: driverId });

    if (!driver) {
        return next(new AppError("Invalid mobile no.", 404));
    }

    if (driver.isBlocked) {
        return next(new AppError("Your account is blocked. Please contact support.", 403));
    }

    if (driver.isVerified === false) {
        return next(new AppError("Your account is waiting for verification. Please wait for approval.", 403));
    }

    if (driver.otp.code !== otp.trim()) {
        return next(new AppError("Invalid otp.", 400));
    }
    if (driver.otp.expiresAt < Date.now()) {
        return next(new AppError("Otp expired.", 400));
    }
    driver.otp = { code: "", expiresAt: null };
    driver.deviceId = deviceId || driver.deviceId;
    driver.deviceToken = deviceToken || driver.deviceToken;
    await driver.save();

    createToken({ name: driver.name, email: driver.email, mobileNo: driver.mobileNo, pincode: driver.pincode, _id: driver._id, deviceId: driver.deviceId, deviceToken: driver.deviceToken, address: driver.address }, 200, res);
});