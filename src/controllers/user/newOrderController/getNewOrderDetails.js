const newOrder = require("../../../models/newOrder");
const catchAsync = require("../../../utils/catchAsync");

exports.getNewOrderDetails = catchAsync(async (req, res, next) => {
    try {
        const { orderId } = req.params;

        const order = await newOrder.findById(orderId)
            .populate("productData.productId", "name primary_image")
            .populate("userId", "name email location mobileNo")
            .populate("addressId", "name address1 address2 city pincode state location")
            .populate("assignedDriver", "name")
            .populate("vendorId", "name email");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const response = {
            success: true,
            order: {
                user: {
                    name: order.userId.name,
                    coordinates: order.userId.location?.coordinates || [],
                    mobileNo: order.userId.mobileNo
                },
                products: order.productData.map(item => ({
                    name: item.productId.name,
                    image: item.productId.primary_image || null,
                    price: item.price,
                    quantity: item.quantity,
                    finalPrice: item.finalPrice,
                })),
                address: {
                    name: order.addressId.name,
                    address1: order.addressId.address1,
                    address2: order.addressId.address2,
                    city: order.addressId.city,
                    pincode: order.addressId.pincode,
                    state: order.addressId.state,
                    coordinates: order.addressId.location?.coordinates || [],
                    landmark: order.addressId.landmark
                },
                statusData: {
                    assignTo: order.assignedDriver?.name,
                    status: order.orderStatus,
                },
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                totalAmount: order.totalAmount,
                discountAmount: order.discountAmount,
                finalAmount: order.finalTotalPrice,
                orderDate: order.createdAt,
                gstAmount: order.gstAmount,
                plateFormFee: order.plateFormFee,
                deliveryCharge: order.deliveryCharge,
                bookingId: order.booking_id
            }
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching order details:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
});
