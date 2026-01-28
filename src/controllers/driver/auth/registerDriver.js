const Driver = require('../../../models/driver');
const AppError = require('../../../utils/AppError');
const catchAsync = require('../../../utils/catchAsync');
// const bcrypt = require('bcrypt');

exports.registerDriver = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    mobileNo,
    // password,
    address,
    licenseNumber,
    adharNumber,
    vehicleType,
    vehicleModel,
    registrationNumber,
    insuranceNumber,
    deviceId,
    deviceToken,
    serviceType,
    ifsc,
    bankName,
    branchName,
    accountNo,
    benificiaryName,
    passbook,
    personWithDisability,
    pincode
  } = req.body;

  if (!name || !email || !mobileNo || !address || !licenseNumber || !adharNumber || !vehicleType || !pincode) {
    return next(new AppError('All fields are required.', 400));
  }

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

  if (!vehicleRcFrontImage || !vehicleRcBackImage || !idProofImage || !profileImage) {
    return next(new AppError('vehicleRcFrontImage, vehicleRcBackImage, idProofImage, profileImage are required.', 400));
  }

  const emailExists = await Driver.findOne({ email });
  if (emailExists) return next(new AppError('Email already exists.', 400));

  const mobileExists = await Driver.findOne({ mobileNo });
  if (mobileExists) return next(new AppError('Mobile number already exists.', 400));

  // const regExists = await Driver.findOne({ 'vehicle.registrationNumber': registrationNumber });
  // if (regExists) return next(new AppError('Vehicle registration number already exists.', 400));
  // const files = req.files || {};

  // const image = files.image?.[0]?.path || '';
  // const vehicleRcImage = files.vehicleRcImage?.[0]?.path || '';
  // const insuranceImage = files.insuranceImage?.[0]?.path || '';
  // const licenseImage = files.licenseImage?.[0]?.path || '';
  // const adharImage = files.adharImage?.[0]?.path || '';
  // const passbookImage = files.passbook?.[0]?.path || '';

  // var hashPassword = await bcrypt.hash(password, 12);

  const newDriver = await Driver.create({
    name,
    email,
    mobileNo,
    address,
    licenseNumber,
    adharNumber,
    vehicle: {
      type: vehicleType,
      // model: vehicleModel,
      // registrationNumber,
      // insuranceNumber
    },
    profileImage,
    vehicleRcFrontImage,
    vehicleRcBackImage,
    idProofImage,
    // insuranceImage,
    // licenseImage,
    // adharImage,
    // serviceType,
    // ifsc,
    // bankName,
    // branchName,
    // accountNo,
    // benificiaryName,
    // personWithDisability,
    // passbook: passbookImage,
    // deviceId,
    // deviceToken,
    pincode
  });

  res.status(201).json({
    success: true,
    message: 'Driver registered successfully',
    data: { name: newDriver.name, email: newDriver.email, mobileNo: newDriver.mobileNo, address: newDriver.address, pincode: newDriver.pincode, vehicleType: newDriver.vehicle.type, vehicleRcFrontImage: newDriver.vehicleRcFrontImage, vehicleRcBackImage: newDriver.vehicleRcBackImage, idProofImage: newDriver.idProofImage, profileImage: newDriver.profileImage, adharNumber: newDriver.adharNumber, licenseNumber: newDriver.licenseNumber }
  });
});
