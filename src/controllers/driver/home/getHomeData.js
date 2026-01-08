// const catchAsync = require("../../../utils/catchAsync");
// const WalletHistory = require("../../../models/walletHistory");

// exports.getHomeData = (req, res, next) => {
//     const driverId = req.driver._id;


//     const today = { totalOrders: 5, totalIncome: 750 };
//     const last7Days = { totalOrders: 38, totalIncome: 5400 };
//     const last30Days = { totalOrders: 160, totalIncome: 22000 };

//     const today = WalletHistory.aggregate([
//         {
//             $match: {
//                 driverId: driverId,
//                 createdAt: {
//                     $gte: new Date(new Date().setHours(0, 0, 0, 0)),
//                     $lt: new Date(new Date().setHours(23, 59, 59, 999))
//                 }
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 totalOrders: { $sum: 1 },



//     res.status(200).json({
//         success: true,
//         message: "Driver home data fetched successfully",
//         data: { today, last7Days, last30Days }
//     });
// };
const catchAsync = require("../../../utils/catchAsync");
const WalletHistory = require("../../../models/walletHistory");

exports.getHomeData = catchAsync(async (req, res, next) => {
    const driverId = req.driver._id;

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));

    const startOf7Days = new Date();
    startOf7Days.setDate(startOf7Days.getDate() - 6); // include today
    startOf7Days.setHours(0, 0, 0, 0);

    const startOf30Days = new Date();
    startOf30Days.setDate(startOf30Days.getDate() - 29); // include today
    startOf30Days.setHours(0, 0, 0, 0);

    const getEarnings = async (start, end) => {
        const result = await WalletHistory.aggregate([
            {
                $match: {
                    driverId,
                    action: { $in: ["credit", "settlement"] },
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: "$action",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        let credit = 0;
        let settlement = 0;
        let totalOrders = 0;

        result.forEach(entry => {
            if (entry._id === "credit") {
                credit = entry.totalAmount;
                totalOrders += entry.count;
            } else if (entry._id === "settlement") {
                settlement = entry.totalAmount;
                totalOrders += entry.count;
            }
        });

        const totalIncome = credit - settlement;

        return {
            totalOrders,
            totalIncome
        };
    };

    const [today, last7Days, last30Days] = await Promise.all([
        getEarnings(startOfToday, endOfToday),
        getEarnings(startOf7Days, new Date()),
        getEarnings(startOf30Days, new Date())
    ]);

    res.status(200).json({
        success: true,
        message: "Driver home data fetched successfully",
        data: { today, last7Days, last30Days }
    });
});

