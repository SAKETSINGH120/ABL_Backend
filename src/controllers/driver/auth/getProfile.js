const Driver = require("../../../models/driver");
const catchAsync = require("../../../utils/catchAsync");

exports.getProfile = catchAsync(async (req, res, next) => {

    const driver = await Driver.findById(req.driver._id);

    return res.status(200).json({
        status: true,
        message: "Driver Profile",
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