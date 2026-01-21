const Vendor = require("../models/vendor");

exports.getVendorById = async (vendorId) => {
    return await Vendor.findById(vendorId);
}

exports.getVendor = async (query) => {
    return await Vendor.findOne(query);
}

exports.getVendors = async (query, populate) => {
    return await Vendor.find(query).populate(populate);
}