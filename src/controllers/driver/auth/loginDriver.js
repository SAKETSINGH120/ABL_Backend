const Driver = require("../../../models/driver");
const AppError = require("../../../utils/AppError");
const catchAsync = require("../../../utils/catchAsync");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const createToken = require("../../../utils/createToken");

exports.loginDriver = catchAsync(async (req, res, next) => {
    const { mobileNo, password, deviceId, deviceToken } = req.body;

    // if (!mobileNo || !password) {
    //     return next(new AppError("Mobile No and Password are required.", 400));
    // }
    if (!mobileNo) {
        return next(new AppError("Mobile No is required.", 400));
    }

    const driver = await Driver.findOne({ mobileNo });

    // if (!driver || !(await bcrypt.compare(password, driver.password))) {
    //     return next(new AppError("Invalid mobile no or password.", 404));
    // }

    if (!driver) {
        return next(new AppError("Invalid mobile no.", 404));
    }

    if (driver.isBlocked) {
        return next(new AppError("Your account is blocked. Please contact support.", 403));
    }

    if (driver.isVerified === false) {
        return next(new AppError("Your account is waiting for verification. Please wait for approval.", 403));
    }
    const otp = "1234";
    driver.otp = { code: otp, expiresAt: new Date(Date.now() + 60 * 60 * 1000) };
    driver.deviceId = deviceId || driver.deviceId;
    driver.deviceToken = deviceToken || driver.deviceToken;
    await driver.save();

    res.status(200).json({
        status: true,
        message: 'Otp sent Successfully.',
        data: {
            driverId: driver._id,
            mobileNo: driver.mobileNo
        }
    });

    // createToken(driver, 200, res);
});