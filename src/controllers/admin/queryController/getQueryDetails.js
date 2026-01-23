const Query = require('../../../models/query');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');

exports.getQueryDetails = catchAsync(async (req, res, next) => {
  const { queryId } = req.params;

  const query = await Query.findById(queryId).populate('userId', 'name email mobileNo mobile address image');

  if (!query) {
    return next(new AppError('Query not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Query details fetched successfully',
    query
  });
});
