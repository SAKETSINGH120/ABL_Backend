const Address = require("../../../models/address");
const AppError = require("../../../utils/AppError");
const catchAsync = require("../../../utils/catchAsync");

exports.deleteAddress = catchAsync(async (req, res, next) => {
  const { addressId } = req.params;
  const userId = req.user._id;

  const address = await Address.findOne({ _id: addressId, userId });

  if (!address) return next(new AppError("Address not found", 404));

  // Update status to 'inactive' instead of deleting
  address.status = "inactive";
  await address.save();

  return res.status(200).json({
    status: true,
    message: "Address deactivated successfully",
  });
});
