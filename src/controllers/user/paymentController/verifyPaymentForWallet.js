const crypto = require('crypto');
const WalletHistory = require('../../../models/walletHistory');
const User = require('../../../models/user');
const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

const verifyPaymentForWallet = async (req, res) => {
  const { paymentId, orderId, signature: receivedSignature } = req.body;
  const secret = razorpaySecret;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + '|' + paymentId)
    .digest('hex');

  console.log('signature');

  if (receivedSignature !== generatedSignature) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  try {
    const history = await WalletHistory.findOne({ razorpayOrderId: orderId });

    if (!history) {
      return res.status(404).json({ success: false, message: 'History not found' });
    }

    // Find the user
    const user = await User.findById(history.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Add amount to user wallet
    user.wallet = (user.wallet || 0) + history.amount;
    await user.save();

    // Update wallet history balance and status
    history.balance_after_action = user.wallet;
    history.status = 'Completed';
    history.paymentId = paymentId;
    await history.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified and wallet credited successfully',
      wallet: user.wallet,
      amountAdded: history.amount
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Error updating order' });
  }
};

module.exports = verifyPaymentForWallet;
