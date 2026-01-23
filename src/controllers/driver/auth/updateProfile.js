const Driver = require("../../../models/driver");
const AppError = require("../../../utils/AppError");
const catchAsync = require("../../../utils/catchAsync");

exports.updateProfile = catchAsync(async (req, res, next) => {
    const driverId = req.driver._id;

    const { name,
        email,
        mobileNo,
        address,
        licenseNumber,
        adharNumber,
        vehicleType,
        vehicleModel,
        registrationNumber,
        insuranceNumber,
        deviceId,
        deviceToken,
        ifsc,
        bankName,
        branchName,
        accountNo,
        benificiaryName,
        personWithDisability,
        pincode } = req.body;

    let vehicleRcFrontImage = '';
    let vehicleRcBackImage = '';
    let idProofImage = '';
    let profileImage = '';
    if (req.files) {
        const files = req.files;
        vehicleRcFrontImage = files.vehicleRcFrontImage?.[0]?.path || '';
        vehicleRcBackImage = files.vehicleRcBackImage?.[0]?.path || '';
        idProofImage = files.idProofImage?.[0]?.path || '';
        profileImage = files.profileImage?.[0]?.path || '';
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return next(new AppError("Driver not found", 404));

    // Check for mobile number uniqueness if changed
    if (mobileNo && mobileNo !== driver.mobileNo) {
        const mobileExists = await Driver.findOne({ mobileNo });
        if (mobileExists) return next(new AppError("Mobile number already in use", 400));
    }

    // Check for registration number uniqueness if changed
    if (registrationNumber && registrationNumber !== driver.vehicle.registrationNumber) {
        const regExists = await Driver.findOne({ "vehicle.registrationNumber": registrationNumber });
        if (regExists) return next(new AppError("Vehicle registration number already in use", 400));
    }

    // const files = req.files || {};
    // if (files.image) driver.image = files.image[0].path;
    // if (files.vehicleRcImage) driver.vehicleRcImage = files.vehicleRcImage[0].path;
    // if (files.insuranceImage) driver.insuranceImage = files.insuranceImage[0].path;
    // if (files.licenseImage) driver.licenseImage = files.licenseImage[0].path;
    // if (files.adharImage) driver.adharImage = files.adharImage[0].path;

    if (name && name.trim()) driver.name = name.trim();
    if (email && email.trim()) driver.email = email.trim();
    if (mobileNo && mobileNo.trim()) driver.mobileNo = mobileNo.trim();
    if (address && address.trim()) driver.address = address.trim();
    if (licenseNumber && licenseNumber.trim()) driver.licenseNumber = licenseNumber.trim();
    if (adharNumber && adharNumber.trim()) driver.adharNumber = adharNumber.trim();
    if (vehicleType && vehicleType.trim()) driver.vehicle.type = vehicleType.trim();
    if (vehicleModel && vehicleModel.trim()) driver.vehicle.model = vehicleModel.trim();
    if (registrationNumber && registrationNumber.trim()) driver.vehicle.registrationNumber = registrationNumber.trim();
    if (insuranceNumber && insuranceNumber.trim()) driver.vehicle.insuranceNumber = insuranceNumber.trim();
    if (deviceId && deviceId.trim()) driver.deviceId = deviceId.trim();
    if (deviceToken && deviceToken.trim()) driver.deviceToken = deviceToken.trim();
    if (ifsc && ifsc.trim()) driver.ifsc = ifsc.trim();
    if (bankName && bankName.trim()) driver.bankName = bankName.trim();
    if (branchName && branchName.trim()) driver.branchName = branchName.trim();
    if (accountNo && accountNo.trim()) driver.accountNo = accountNo.trim();
    if (benificiaryName && benificiaryName.trim()) driver.benificiaryName = benificiaryName.trim();
    if (personWithDisability && personWithDisability.trim()) driver.personWithDisability = personWithDisability.trim();
    if (pincode && pincode.trim()) driver.pincode = pincode.trim();
    if (profileImage) {
        driver.profileImage = profileImage;
    }
    if (vehicleRcFrontImage) {
        driver.vehicleRcFrontImage = vehicleRcFrontImage;
    }
    if (vehicleRcBackImage) {
        driver.vehicleRcBackImage = vehicleRcBackImage;
    }
    if (idProofImage) {
        driver.idProofImage = idProofImage;
    }

    await driver.save();

    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
            _id: driver._id,
            name: driver.name,
            email: driver.email,
            mobileNo: driver.mobileNo,
            address: driver.address,
            licenseNumber: driver.licenseNumber,
            adharNumber: driver.adharNumber,
            vehicleType: driver.vehicle.type,
            vehicleModel: driver.vehicle.model,
            registrationNumber: driver.vehicle.registrationNumber,
            insuranceNumber: driver.vehicle.insuranceNumber,
            deviceId: driver.deviceId,
            deviceToken: driver.deviceToken,
            ifsc: driver.ifsc,
            bankName: driver.bankName,
            branchName: driver.branchName,
            accountNo: driver.accountNo,
            benificiaryName: driver.benificiaryName,
            personWithDisability: driver.personWithDisability,
            pincode: driver.pincode,
            profileImage: driver.profileImage,
            vehicleRcFrontImage: driver.vehicleRcFrontImage,
            vehicleRcBackImage: driver.vehicleRcBackImage,
            idProofImage: driver.idProofImage
        }
    });
});
