const crypto = require("crypto");
const newOrder = require("../../../models/newOrder");
const newCart = require("../../../models/newCart");
const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpay = require("../../../utils/razorpayInstance");
const VendorProduct = require("../../../models/vendorProduct");
const User = require("../../../models/user");

async function deductStock(products) {
    const deducted = [];

    try {
        for (const item of products) {
            let result;

            if (item.variantId) {
                result = await VendorProduct.updateOne(
                    {
                        _id: item.productId,
                        variants: {
                            $elemMatch: {
                                _id: item.variantId,
                                stock: { $gte: item.quantity }
                            }
                        }
                    },
                    {
                        $inc: { "variants.$.stock": -item.quantity }
                    }
                );
            } else {
                result = await VendorProduct.updateOne(
                    {
                        _id: item.productId,
                        stock: { $gte: item.quantity }
                    },
                    {
                        $inc: { stock: -item.quantity }
                    }
                );
            }

            if (result.modifiedCount === 0) {
                throw new Error("Insufficient stock");
            }

            deducted.push(item);
        }

        return deducted;
    } catch (err) {
        await restock(deducted);
        throw err;
    }
}

async function refundRazorpay(paymentId, amount) {
    try {
        await razorpay.payments.refund(paymentId, {
            amount: Math.floor(amount * 100)
        });
    } catch (err) {
        console.error("Refund failed:", err);
    }
}

async function restock(products) {
    for (const item of products) {
        let result;
        if (item.variantId) {
            result = await VendorProduct.updateOne(
                {
                    _id: item.productId,
                    variants: { $elemMatch: { _id: item.variantId } }
                },
                {
                    $inc: { "variants.$.stock": item.quantity }
                }
            );
        } else {
            result = await VendorProduct.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } }
            );
        }

        if (result.modifiedCount === 0) {
            console.warn(`Restock failed for product ${item.productId} (Variant: ${item.variantId || 'N/A'}). Item might be deleted.`);
        }
    }
}

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

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.paymentStatus === "paid") {
            return res.status(200).json({ success: true, message: "Order already verified" });
        }

        try {
            await deductStock(order.productData);
        } catch (stockError) {
            await refundRazorpay(paymentId, order.finalTotalPrice);
            order.paymentStatus = "failed";
            order.orderStatus = "cancelled";
            await order.save();

            return res.status(409).json({
                success: false,
                message: "Stock unavailable. Payment refunded."
            });
        }

        order.paymentStatus = "paid";
        order.paymentId = paymentId;
        order.orderStatus = "accepted";
        await order.save();
        await newCart.updateOne({ userId: order.userId, status: "active" }, { status: "ordered" });
        const user = await User.findById(order.userId);
        io.to(`vendor-${order.vendorId}`).emit("new-order", {
            _id: order._id,
            customerName: user.name,
            items: order.productData,
            shopName: "",
            total: order.finalTotalPrice,
        });

        return res.status(200).json({
            success: true,
            message: "Payment verified & order confirmed"
        });
    } catch (err) {
        console.error("VerifyPayment Error:", err);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed"
        });
    }
};

module.exports = verifyPayment;