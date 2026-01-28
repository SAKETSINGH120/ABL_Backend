const { mongoose } = require('mongoose');
const VendorProduct = require('../../../models/vendorProduct');
const catchAsync = require('../../../utils/catchAsync');
const newOrder = require('../../../models/newOrder');
const Vendor = require('../../../models/vendor');

exports.getCounts = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    if (!vendorId) {
      return res.status(400).json({ error: 'Vendor ID is required' });
    }
    const totalProduct = await VendorProduct.countDocuments({ isDeleted: false });
    const totalOrders = await newOrder.countDocuments({ vendorId: vendorId, orderStatus: 'accepted', paymentStatus: 'paid' });

    const todayOrder = await newOrder.countDocuments({ vendorId, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } });
    const walletBalance = await Vendor.findById(vendorId, 'wallet_balance');

    res.status(200).json({
      success: true,
      message: 'Dashboard counts fetched',
      data: {
        totalProduct,
        totalOrders,
        todayOrder,
        walletBalance: walletBalance ? walletBalance.wallet_balance : 0
      }
    });
  } catch (error) {
    console.log(error);
  }
};
