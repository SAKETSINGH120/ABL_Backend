const razorpay = require('../../../utils/razorpayInstance');
const WalletHistory = require('../../../models/walletHistory');

const createRazorpayOrderForWallet = async (req, res) => {
  try {
    const userData = req.user;
    const { amount } = req.body;

    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });

    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: 'abl_' + Math.floor(Math.random() * 10000)
    };

    const order = await razorpay.orders.create(options);

    await WalletHistory.create({
      userId: req.user._id,
      action: 'walletrecharge',
      amount: amount,
      balance_after_action: 100,
      description: 'Wallet recharge',
      razorpayOrderId: order.id,
      status: 'Pending'
    });

    console.log('Razorpay order created:', order);
    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      userData: userData
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    return res.status(500).json({ success: false, message: 'Payment initiation failed', error: error.message });
  }
};

module.exports = createRazorpayOrderForWallet;
