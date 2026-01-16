const crypto = require("crypto");
// const Order = require("../../../models/order");
const newOrder = require("../../../models/newOrder");
const newCart = require("../../../models/newCart");
const razorpaySecret = process.env.RAZORPAY_WEBHOOK_SECRET;

const verifyRazorpayWebhook = async (req, res) => {
    // const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // const secret = "abcdefghijklmnop";
    const secret = razorpaySecret;
    const receivedSignature = req.headers["x-razorpay-signature"];
    const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (receivedSignature !== generatedSignature) {
        return res.status(400).json({ success: false, message: "Invalid signature", generatedSignature });
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    console.log("Event:", event);
    console.log("Payload:", payload);

    if (event === "payment.captured") {
        try {
            const order = await newOrder.findOne({ razorpayOrderId: payload.order_id });
            await newCart.updateOne({ userId: order.userId }, { status: "ordered" });

            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }

            order.paymentStatus = "paid";
            order.paymentId = payload.id;
            order.orderStatus = "confirmed";
            await order.save();

            return res.status(200).json({ success: true, message: "Payment verified and order updated" });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Error updating order", error: err.message });
        }
    }

    res.status(200).json({ success: true, message: "Event ignored" });
};

module.exports = verifyRazorpayWebhook;
