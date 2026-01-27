const Brand = require("../../../models/brand");
const catchAsync = require("../../../utils/catchAsync");

exports.deleteBrand = catchAsync(async (req, res) => {
    const brandId = req.params.brandId;
    const brand = await Brand.findByIdAndDelete(brandId);

    return res.status(200).json({
        status: true,
        data: brand
    })
})