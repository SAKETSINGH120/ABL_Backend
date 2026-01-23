const Query = require('../../../models/query');
const catchAsync = require('../../../utils/catchAsync');

exports.getAllQueries = catchAsync(async (req, res, next) => {
  const { userType, status } = req.query;

  // Build filter
  let filter = {};
  if (userType && ['driver', 'vendor', 'user'].includes(userType)) {
    filter.userType = userType;
  }
  if (status && ['pending', 'in-progress', 'resolved', 'closed'].includes(status)) {
    filter.status = status;
  }

  const queries = await Query.find(filter).populate('userId', 'name email mobileNo mobile').sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Queries fetched successfully',
    results: queries.length,
    queries
  });
});
