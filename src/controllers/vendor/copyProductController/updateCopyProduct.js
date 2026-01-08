const Product = require("../../../models/product");
const VendorProduct = require("../../../models/vendorProduct");
const AppError = require("../../../utils/AppError");
const catchAsync = require("../../../utils/catchAsync");
const deleteOldFiles = require("../../../utils/deleteOldFiles");
const mongoose = require("mongoose");

exports.updateCopyProduct = catchAsync(async (req, res, next) => {
  try {
    // ensure id has no extra whitespace or encoded characters (fix CastError)
    let id = (req.params.id || "").toString();
    id = decodeURIComponent(id).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid product id", 400));
    }
    let {
      name,
      categoryId,
      subCategoryId,
      brandId,
      mrp,
      sellingPrice,
      discount,
      unitOfMeasurement,
      sellingUnit,
      shortDescription,
      longDescription,
      vendorSellingPrice,
    } = req.body;

    const product = await VendorProduct.findById(id);
    if (!product) return next(new AppError("Product not found", 404));

    console.log("Request Body:", req.body);
    console.log("Request Files:", req.files);
    console.log("sellingPrice============================", sellingPrice);

    let primaryImage = product.primary_image;
    if (
      req.files &&
      req.files.primary_image &&
      req.files.primary_image.length > 0
    ) {
      // Delete the old primary image if available.
      // if (product.primary_image) {
      //     await deleteOldFiles(product.primary_image);
      // }
      primaryImage = `${req.files.primary_image[0].destination}/${req.files.primary_image[0].filename}`;
    }

    // Update gallery images if new files were provided.
    let galleryImages = product.gallery_image;
    if (
      req.files &&
      req.files.gallery_image &&
      req.files.gallery_image.length > 0
    ) {
      galleryImages = req.files.gallery_image.map(
        (file) => `${file.destination}/${file.filename}`
      );
    }

    // If a new SKU is provided and it's different, verify uniqueness.
    // Update other fields.
    product.name = name || product.name;
    product.vendorSellingPrice = sellingPrice || product.sellingPrice;
    product.categoryId = categoryId || product.categoryId;
    product.subCategoryId = subCategoryId || product.subCategoryId;
    product.brandId = brandId || product.brandId;
    product.mrp = mrp || product.mrp;
    product.sellingPrice = sellingPrice || product.sellingPrice;
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
      message: "Product updated successfully.",
      data: { product },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return next(new AppError("Error updating product", 500));
  }
});
