const razorpay = require("../../../utils/razorpayInstance");
const newOrder = require("../../../models/newOrder");

const createRazorpayOrder = async (req, res) => {
    try {
        const userData = req.user;
        const { amount, orderId } = req.body;

        if (!amount) return res.status(400).json({ success: false, message: "Amount is required" });

        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: "abl_" + Math.floor(Math.random() * 10000),
        };

        const order = await razorpay.orders.create(options);
        await newOrder.updateOne({ _id: orderId }, { razorpayOrderId: order.id });

        console.log("Razorpay order created:", order);
        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            userData: userData,
        });
    } catch (error) {
        console.error("Razorpay order error:", error);
        return res.status(500).json({ success: false, message: "Payment initiation failed", error: error.message });
    }
};

module.exports = createRazorpayOrder;
