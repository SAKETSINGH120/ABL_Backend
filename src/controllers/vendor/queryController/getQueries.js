const Query = require('../../../models/query');
const catchAsync = require('../../../utils/catchAsync');

exports.getQueries = catchAsync(async (req, res, next) => {
  const queries = await Query.find({
    userId: req.vendor._id,
    userType: 'vendor'
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Queries fetched successfully',
    results: queries.length,
    queries
  });
});
