const Brand = require("../../../models/brand");
const catchAsync = require("../../../utils/catchAsync");

exports.createBrand = catchAsync(async (req, res) => {
    const { name, status } = req.body;

    const brand = await Brand.create({ name, status });

    return res.status(200).json({
        status: true,
        data: brand
    })
})