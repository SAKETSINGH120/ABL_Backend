const User = require("../models/user");

exports.getUserById = async (userId) => {
    return await User.findById(userId);
}