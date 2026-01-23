const Driver = require('../../../models/driver');
const newOrder = require('../../../models/newOrder');
const Order = require('../../../models/order');
const Setting = require('../../../models/settings');
const Shop = require('../../../models/shop');
const Vendor = require('../../../models/vendor');
const WalletHistory = require('../../../models/walletHistory');
const WalletTransaction = require('../../../models/walletTransaction');
const catchAsync = require('../../../utils/catchAsync');

exports.orderStatusChange = catchAsync(async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { orderId } = req.params;
    const status = req.body.status;

    let deliveryProofImage;
    if (req.files && req.files.deliveryProofImage) {
      const url = `${req.files.deliveryProofImage[0].destination}/${req.files.deliveryProofImage[0].filename}`;
      deliveryProofImage = url;
    }

    const order = await newOrder.findById(orderId);
    const driver = await Driver.findById(driverId);
    if (!order) return res.status(404).json({ status: false, message: 'Order not found' });

    if (status == 'cancelled') {
      order.orderStatus = 'cancelled';
      order.assignedDriver = null; // Clear assigned driver
      driver.currentOrderId = null; // Clear current order for driver
      await driver.save();
      await order.save();
      return res.status(200).json({ status: true, message: 'Order cancelled successfully' });
    }

    if (status == 'accepted') {
      order.orderStatus = 'running';
      driver.currentOrderId = order._id; // Set current order for driver
      await driver.save();
      await order.save();
      return res.status(200).json({ status: true, message: 'Order accepted successfully' });
    }

    if (status == 'picked up') {
      order.orderStatus = 'picked up';
      await order.save();
      return res.status(200).json({ status: true, message: 'Order picked up successfully' });
    }

    const { itemTotal, couponAmount, afterCouponAmount, packingCharge, driverDeliveryCharge, vendorId } = order;
    const { gst: gstRate, finialPlateformFee: plateformFee } = await Setting.findById('680f1081aeb857eee4d456ab');

    // return res.status(200).json({ commissionRate, gstRate, plateformFee, driver });

    const vendor = await Vendor.findById(vendorId);
    let commissionRate = vendor ? vendor.commission : 10; // Default to 10% if vendor not found
    if (commissionRate == null || commissionRate === undefined) {
      commissionRate = 15; // Default to 15% if vendor's commission is not set
    }
    // Calculate amounts
    const commissionAmount = Math.ceil((itemTotal * commissionRate) / 100);
    const gstAmount = Math.ceil((commissionAmount * gstRate) / 100);
    const vendorAmount = Math.ceil(itemTotal - commissionAmount - gstAmount + packingCharge);
    const deliveryBoyAmount = Math.ceil(driverDeliveryCharge);

    if (order.paymentMode === 'cod') {
      driver.cashCollection += order.finalTotalPrice;
    }

    // Update wallet transaction
    const walletTx = await WalletTransaction.create({
      vendorId,
      orderId: order._id,
      amount: itemTotal,
      commission: commissionRate,
      commission_amount: commissionAmount,
      gst: gstRate,
      gst_amount: gstAmount,
      type: 'Order Payment',
      is_bonus: false,
      final_amount: vendorAmount
    });

    // Update vendor wallet
    vendor.wallet_balance += Math.ceil(vendorAmount);
    await vendor.save();

    // const driver = await Driver.findById(driverId);
    driver.wallet_balance += Math.ceil(deliveryBoyAmount);
    driver.currentOrderId = null;
    await driver.save();

    // Record wallet history for vendor
    await WalletHistory.create({
      vendorId,
      action: 'credit',
      amount: vendorAmount,
      balance_after_action: vendor.wallet_balance,
      description: 'Order payout',
      status: 'Completed'
    });

    // Record wallet history for driver
    await WalletHistory.create({
      driverId,
      action: 'credit',
      amount: deliveryBoyAmount,
      balance_after_action: driver.wallet_balance,
      description: 'Order payout',
      status: 'Completed'
    });

    order.orderStatus = 'delivered';
    if (deliveryProofImage) {
      order.deliveryProofImage = deliveryProofImage;
    }
    await order.save();

    res.status(200).json({
      status: true,
      message: 'Order completed successfully',
      data: { itemTotal, couponAmount, afterCouponAmount, packingCharge, driverDeliveryCharge, vendorAmount },
      walletTransaction: walletTx,
      newWalletBalance: vendor.wallet_balance,
      driverWalletBalance: driver.wallet_balance
    });
  } catch (error) {
    console.error('Order Complete Error:', error);
    return res.status(500).json({ success: false, message: 'Server error while order complete.', error: error.message });
  }
});
