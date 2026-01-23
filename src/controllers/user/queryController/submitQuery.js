const Query = require('../../../models/query');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');

exports.submitQuery = catchAsync(async (req, res, next) => {
  const { name, number, remark } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return next(new AppError('Name is required', 400));
  }
  if (!number || !number.trim()) {
    return next(new AppError('Contact number is required', 400));
  }
  if (!remark || !remark.trim()) {
    return next(new AppError('Remark is required', 400));
  }

  // Create query
  const query = await Query.create({
    name: name.trim(),
    number: number.trim(),
    remark: remark.trim(),
    userType: 'user',
    userId: req.user._id,
    userModel: 'User'
  });

  res.status(201).json({
    success: true,
    message: 'Query submitted successfully',
    query
  });
});
