const Brand = require('../../../models/brand');
const catchAsync = require('../../../utils/catchAsync');

exports.getAllBrands = catchAsync(async (req, res) => {
  const brands = await Brand.find({}, { name: 1, _id: 1 }).sort({ createdAt: -1 });

  return res.status(200).json({
    status: true,
    message: 'Brands fetched successfully',
    data: brands
  });
});
