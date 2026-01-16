const crypto = require("crypto");
const newOrder = require("../../../models/newOrder");
const newCart = require("../../../models/newCart");
const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

const verifyPayment = async (req, res) => {
    const { paymentId, orderId, signature: receivedSignature } = req.body;
    const secret = razorpaySecret;
    const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(orderId + "|" + paymentId)
        .digest("hex");

    if (receivedSignature !== generatedSignature) {
        return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    try {
        const order = await newOrder.findOne({ razorpayOrderId: orderId });
        await newCart.updateOne({ userId: order.userId, status: "active" }, { status: "ordered" });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.paymentStatus = "paid";
        order.paymentId = paymentId;
        order.orderStatus = "accepted";
        await order.save();

        return res.status(200).json({ success: true, message: "Payment verified and order updated" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Error updating order" });
    }
};

module.exports = verifyPayment;