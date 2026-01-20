const newOrder = require("../../../models/newOrder");
const {
  FOOD_SERVICE_ID,
  MART_SERVICE_ID,
} = require("../../../utils/constants");

exports.getAllNewOrder = async (req, res) => {
  try {
    const orderStatus = req.query.orderStatus;
    // const serviceType = req.query.serviceType;

    const filter = {};

    // Apply filter based on orderStatus
    if (orderStatus && orderStatus !== "all") {
      if (orderStatus === "new") {
        filter.orderStatus = "pending";
      } else if (orderStatus === "preparing") {
        filter.orderStatus = { $in: ["preparing", "dealy"] };
      } else if (orderStatus === "cancelled") {
        filter.orderStatus = {
          $in: [
            "cancelledByUser",
            "cancelledByVendor",
            "cancelledByDriver",
            "cancelledByAdmin",
            "cancelled",
          ],
        };
      } else if (orderStatus === "accepted") {
        filter.orderStatus = { $in: ["accepted", "preparing"] };
      } else if (orderStatus === "ready") {
        filter.orderStatus = "ready";
      } else {
        filter.orderStatus = orderStatus;
      }
    }

    /*
    // Fetch orders with population
    const ordersRaw = await newOrder
      .find(filter)
      .populate("productData.productId")
      // .populate("couponId")
      .populate("addressId")
      // .populate("shopId", "name location packingCharge")
      .populate("vendorId", "name email")
      .populate("assignedDriver", "name")
      .sort({ createdAt: -1 });

    // Fetch counts for all statuses
    const allCounts = await newOrder.aggregate([
      {
        $match: {},
      },
      {
        $group: {
    //       _id: "$orderStatus",
    //       count: { $sum: 1 },
    //     },
    //   },
    // ]);
      */

    const [ordersRaw, allCounts] = await Promise.all([newOrder
      .find(filter)
      .populate("productData.productId")
      .populate("addressId")
      .populate("vendorId", "name email")
      .populate("assignedDriver", "name")
      .sort({ createdAt: -1 }), newOrder.aggregate([
        {
          $match: {},
        },
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
          },
        },
      ])])

    // Transform orders data
    const orders = ordersRaw.map((order) => ({
      _id: order._id,
      booking_id: order.booking_id,
      userId: order.userId,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      finalTotalPrice: order.finalTotalPrice,
      orderStatus: order.orderStatus,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      // shopName: order.shopId?.name || "Shop Deleted",
      assignedDriver: order?.assignedDriver?.name || null,
      isRefunded: order.isRefunded,
    }));

    // Map to a dictionary
    const statusCountMap = allCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    // Group similar statuses
    const totalCancelled =
      (statusCountMap.cancelledByUser || 0) +
      (statusCountMap.cancelledByVendor || 0) +
      (statusCountMap.cancelledByDriver || 0) +
      (statusCountMap.cancelledByAdmin || 0) +
      (statusCountMap.cancelled || 0);

    const counts = {
      new: statusCountMap.pending || 0,
      accepted: statusCountMap.accepted || 0,
      start_packing: (statusCountMap.start_packing || 0) + (statusCountMap.dealy || 0),
      ready: statusCountMap.ready || 0,
      shipped: statusCountMap.shipped || 0,
      pickedup: statusCountMap["picked up"] || 0,
      running: statusCountMap.running || 0,
      delivered: statusCountMap.delivered || 0,
      cancelled: totalCancelled,
      all: allCounts.reduce((acc, cur) => acc + cur.count, 0),
    };

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
      counts,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
