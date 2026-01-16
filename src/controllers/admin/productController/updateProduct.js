const Product = require("../../../models/product");
const AppError = require("../../../utils/AppError");
const catchAsync = require("../../../utils/catchAsync");
const mongoose = require('mongoose');

// Simple validation helper (adjust as per your implementation)
function validateRequiredField(field, name) {
    if (field === undefined || field === null || field === "") {
        return new AppError(`${name} is required.`, 400);
    }
    return null;
}

const parseBool = (val) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
    return Boolean(val);
};

/*
exports.updateProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return next(new AppError("Product not found.", 404));

    let {
        name,
        categoryId,
        subCategoryId,
        mrp,
        sellingPrice,
        discount,
        unitOfMeasurement,
        sellingUnit,
        shortDescription,
        longDescription,
        serviceId,
        type,
    } = req.body;

    console.log("Request Body:", req.body);
    console.log("Request Files:", req.files);
    // Validate required fields
    const requiredFields = [
        { field: name, name: "Product name" },
        { field: categoryId, name: "Category ID" },
        { field: mrp, name: "MRP" },
        { field: sellingPrice, name: "Selling Price" },
        { field: unitOfMeasurement, name: "Unit of Measurement" },
        { field: sellingUnit, name: "Selling Unit" },
        { field: shortDescription, name: "Short Description" },
        { field: longDescription, name: "Long Description" },
        { field: serviceId, name: "Service Type" },
    ];

    for (const { field, name } of requiredFields) {
        const error = validateRequiredField(field, name);
        if (error) return next(error);
    }

    // Handle gallery images update safely
    let galleryimagePaths = product.gallery_image;
    if (
        req.files &&
        req.files.gallery_image &&
        Array.isArray(req.files.gallery_image) &&
        req.files.gallery_image.length > 0
    ) {
        galleryimagePaths = req.files.gallery_image.map(
            (file) => `${file.destination}/${file.filename}`
        );
    }

    // Handle primary image update safely
    let primaryImage = product.primary_image;
    if (req.files && req.files.primary_image && req.files.primary_image[0]) {
        primaryImage = `${req.files.primary_image[0].destination}/${req.files.primary_image[0].filename}`;
    }

    // Handle subCategoryId properly - convert string "null" or empty string to actual null
    if (!subCategoryId || subCategoryId.trim() === "" || subCategoryId === "null") {
        subCategoryId = null;
    }

    // Update product fields
    product.name = name;
    product.categoryId = categoryId;
    product.subCategoryId = subCategoryId;  // Already handled above, no need for ternary
    product.mrp = mrp;
    product.sellingPrice = sellingPrice;
    product.discount = discount || "";
    product.unitOfMeasurement = unitOfMeasurement;
    product.sellingUnit = sellingUnit;
    product.shortDescription = shortDescription;
    product.longDescription = longDescription;
    product.serviceId = serviceId;
    product.type = type;
    product.primary_image = primaryImage;
    product.gallery_image = galleryimagePaths;

    await product.save();

    res.status(200).json({
        status: true,
        message: "Product updated successfully.",
        data: { product },
    });
});
*/

exports.updateProduct = catchAsync(async (req, res, next) => {
    let id = (req.params.id || '').toString();
    id = decodeURIComponent(id).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid product id', 400));
    }

    const { name, categoryId, subCategoryId, brandId, mrp, sellingPrice, discount, unitOfMeasurement, sellingUnit, shortDescription, longDescription, variant, isRecommended, isFeatured, isSeasonal, isVegetableOfTheDay, isFruitOfTheDay, isDealOfTheDay } = req.body;

    const product = await Product.findById(id);
    if (!product) return next(new AppError('Product not found', 404));

    let primaryImage = product.primary_image;
    if (req.files && req.files.primary_image && req.files.primary_image.length > 0) {
        primaryImage = `${req.files.primary_image[0].destination}/${req.files.primary_image[0].filename}`;
    }

    let galleryImages = product.gallery_image;
    if (req.files && req.files.gallery_image && req.files.gallery_image.length > 0) {
        galleryImages = req.files.gallery_image.map((file) => `${file.destination}/${file.filename}`);
    }

    let variants = [];
    if (variant) {
        try {
            variants = typeof variant === 'string' ? JSON.parse(variant) : variant;
        } catch (err) {
            variants = [];
        }
    }

    if (Array.isArray(variants) && variants.length > 0) {
        const processedVariants = variants.map((variant) => ({
            variantTypeId: variant.variantId || variant.variantTypeId || null,
            variantName: variant.variantName || '',
            mrp: variant.mrp,
            sellingPrice: variant.sellingPrice,
            sellingUnit: variant.sellingUnit,
            stock: variant.stock || 0,
            status: variant.status || 'active'
        }));
        product.variants = processedVariants;
    }

    if (parseBool(isRecommended) !== undefined) product.isRecommended = parseBool(isRecommended);
    if (parseBool(isFeatured) !== undefined) product.isFeatured = parseBool(isFeatured);
    if (parseBool(isSeasonal) !== undefined) product.isSeasonal = parseBool(isSeasonal);
    if (parseBool(isVegetableOfTheDay) !== undefined) product.isVegetableOfTheDay = parseBool(isVegetableOfTheDay);
    if (parseBool(isFruitOfTheDay) !== undefined) product.isFruitOfTheDay = parseBool(isFruitOfTheDay);
    if (parseBool(isDealOfTheDay) !== undefined) product.isDealOfTheDay = parseBool(isDealOfTheDay);

    product.name = name || product.name;
    product.sellingPrice = sellingPrice || product.sellingPrice;
    product.categoryId = categoryId || product.categoryId;
    product.subCategoryId = subCategoryId || product.subCategoryId;
    product.brandId = brandId || product.brandId;
    product.mrp = mrp || product.mrp;
    product.discount = discount || product.discount;
    product.unitOfMeasurement = unitOfMeasurement || product.unitOfMeasurement;
    product.sellingUnit = sellingUnit || product.sellingUnit;
    product.shortDescription = shortDescription || product.shortDescription;
    product.longDescription = longDescription || product.longDescription;
    product.primary_image = primaryImage;
    product.gallery_image = galleryImages;

    await product.save();

    return res.status(200).json({
        status: true,
        message: 'Product updated successfully.',
        data: { product }
    });
});