const Query = require('../../../models/query');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');

exports.updateQueryStatus = catchAsync(async (req, res, next) => {
  const { queryId } = req.params;
  const { status, adminReply } = req.body;

  if (!status || !['pending', 'in-progress', 'resolved', 'closed'].includes(status)) {
    return next(new AppError('Valid status is required', 400));
  }

  const updateData = { status };

  if (adminReply) {
    updateData.adminReply = adminReply;
    updateData.repliedAt = new Date();
  }

  const query = await Query.findByIdAndUpdate(queryId, updateData, { new: true, runValidators: true }).populate('userId', 'name email mobileNo mobile');

  if (!query) {
    return next(new AppError('Query not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Query updated successfully',
    query
  });
});
