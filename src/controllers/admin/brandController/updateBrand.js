const Brand = require("../../../models/brand");
const catchAsync = require("../../../utils/catchAsync");

exports.updateBrand = catchAsync(async (req, res) => {
    const brandId = req.params.brandId;
    const { name, status } = req.body;

    const updatedDetails = {};
    if (name) updatedDetails.name = name;
    if (status) updatedDetails.status = status;

    const brand = await Brand.findByIdAndUpdate(brandId, updatedDetails, { new: true });

    return res.status(200).json({
        status: true,
        data: brand
    })
})