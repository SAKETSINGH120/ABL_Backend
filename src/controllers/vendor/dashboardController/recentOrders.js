const newOrder = require('../../../models/newOrder');
const catchAsync = require('../../../utils/catchAsync');

exports.getRecentOrders = catchAsync(async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const recentOrders = await newOrder.find({ vendorId, orderStatus: "accepted", paymentStatus: { $in: ["paid", "success"] } }).populate('userId', 'name email mobileNo').populate('assignedDriver', 'name').sort({ createdAt: -1 }).limit(10);

    // Transform orders data
    const orders = recentOrders.map((order) => ({
      _id: order._id,
      booking_id: order.booking_id,
      userId: order.userId,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      finalTotalPrice: order.finalTotalPrice,
      orderStatus: order.orderStatus,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      assignedDriver: order?.assignedDriver?.name || null,
      createdAt: order.createdAt
    }));

    return res.status(200).json({
      success: true,
      message: 'Recent orders fetched successfully',
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
});
