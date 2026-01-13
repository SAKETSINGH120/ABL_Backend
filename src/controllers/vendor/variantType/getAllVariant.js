const variantType = require('../../../models/variantType');
const catchAsync = require('../../../utils/catchAsync');

exports.getAllVariantTypes = catchAsync(async (req, res, next) => {
  try {
    const { status, category, search } = req.query;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }];
    }

    const variantTypes = await variantType.find(query).sort({ category: 1, name: 1 });

    return res.status(200).json({
      success: true,
      message: 'Variant types retrieved successfully',
      data: variantTypes
    });
  } catch (error) {
    console.error('Error in get all variant types:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});
