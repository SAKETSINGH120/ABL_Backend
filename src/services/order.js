const Order = require("../models/newOrder");

exports.countOrders = async (query) => {
    const count = await Order.countDocuments(query);
    return count;
};