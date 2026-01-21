const { default: mongoose } = require('mongoose');
const Driver = require('../../../models/driver');
const Vendor = require('../../../models/vendor');
const WalletHistory = require('../../../models/walletHistory');
const catchAsync = require('../../../utils/catchAsync');
const User = require('../../../models/user');

exports.walletHistoryOfUser = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { action } = req.query;

  if (!userId) {
    return res.status(400).json({
      status: false,
      message: 'User ID is required'
    });
  }

  let query = { userId };

  if (action) {
    query.action = action;
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      status: false,
      message: 'User not found'
    });
  }

  const history = await WalletHistory.find(query, {
    _id: 1,
    userId: 1,
    action: 1,
    amount: 1,
    balance_after_action: 1,
    status: 1,
    description: 1,
    orderId: 1
  }).sort({ createdAt: -1 });

  // Attach order details where applicable
  const historyWithOrder = await Promise.all(
    history.map(async (h) => {
      const historyDoc = h.toObject ? h.toObject() : h;
      if (!historyDoc.orderId) return historyDoc;

      // Try to find matching order by razorpayOrderId, booking_id or _id
      let order = null;
      try {
        order = await NewOrder.findOne({
          $or: [{ razorpayOrderId: historyDoc.orderId }, { booking_id: historyDoc.orderId }, { _id: historyDoc.orderId }]
        })
          .select('booking_id finalTotalPrice paymentMode paymentStatus productData createdAt')
          .lean();
      } catch (err) {
        order = null;
      }

      historyDoc.orderDetails = order || null;
      return historyDoc;
    })
  );

  return res.status(200).json({
    status: true,
    results: historyWithOrder.length,
    data: {
      history: historyWithOrder,
      wallet: user.wallet
    }
  });
  // const userId = req.user.id;
  // if (!userId) {
  //     return res.status(400).json({
  //         status: false,
  //         message: "User ID is required"
  //     });
  // }

  // const user = await User.findById(userId);
  // if (!user) {
  //     return res.status(404).json({
  //         status: false,
  //         message: "User not found"
  //     });
  // }

  // // Get wallet history with selected vendor details
  // const history = await WalletHistory.find({ userId })
  //     .sort({ createdAt: -1 });

  // return res.status(200).json({
  //     status: true,
  //     results: history.length,
  //     data: {
  //         history,
  //         wallet: user.wallet
  //     }
  // });
});
