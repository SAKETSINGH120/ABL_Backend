const Category = require("../models/category");

exports.countCategories = async (query) => {
    const count = await Category.countDocuments(query);
    return count;
};