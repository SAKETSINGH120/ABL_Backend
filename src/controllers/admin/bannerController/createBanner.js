const Banner = require('../../../models/banner');
const AppError = require('../../../utils/AppError');
const catchAsync = require('../../../utils/catchAsync');

exports.createBanner = catchAsync(async (req, res) => {
  const { title, section } = req.body;

  if (!title || !title.trim()) throw new AppError('Title is required', 400);
  if (!section) throw new AppError('Invalid section', 400);

  let imagePath = '';
  if (req.files && req.files.image) {
    imagePath = `${req.files.image[0].destination}/${req.files.image[0].filename}`;
  } else {
    throw new AppError('Banner image is required', 400);
  }

  const banner = new Banner({ title, section, image: imagePath });
  await banner.save();

  return res.status(201).json({
    status: true,
    message: 'Banner created successfully',
    data: { banner }
  });
});
