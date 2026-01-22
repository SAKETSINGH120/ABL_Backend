const Cart = require("../models/newCart");

exports.getCart = async (query) => {
    return await Cart.findOne(query);
}