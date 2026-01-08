const Order = require("../../../models/order");

const getAllOrder = async (req, res) => {
    try {

        const orderStatus = req.query.orderStatus;

        let orders;

        if (orderStatus === "all") {
            orders = await Order.find().populate("productData.product_id").populate("couponId").populate("addressId").populate("shopId", "name location packingCharge").populate("vendorId", "name email").sort({ createdAt: -1 });
        } else {
            orders = await Order.find({ orderStatus }).populate("productData.product_id").populate("couponId").populate("addressId").populate("shopId", "name location packingCharge").populate("vendorId", "name email").sort({ createdAt: -1 });
        }

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No orders found'
            });
        }

        return res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

module.exports = getAllOrder;
