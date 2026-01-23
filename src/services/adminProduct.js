const Product = require("../models/product");

exports.countProducts = async (query) => {
    const count = await Product.countDocuments(query);
    return count;
};