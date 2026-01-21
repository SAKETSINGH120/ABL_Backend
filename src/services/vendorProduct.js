const VendorProduct = require("../models/vendorProduct");

exports.getAllProducts = async (query, populate) => {
    const products = await VendorProduct.find(query).populate(populate);
    return products;
};

exports.getProductById = async (id) => {
    const product = await VendorProduct.findById(id);
    return product;
};