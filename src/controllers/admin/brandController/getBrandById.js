const Brand = require("../../../models/brand");
const catchAsync = require("../../../utils/catchAsync");

exports.getBrandById = catchAsync(async (req, res) => {
    const brandId = req.params.brandId;
    const brand = await Brand.findById(brandId);

    return res.status(200).json({
        status: true,
        data: brand
    })
})