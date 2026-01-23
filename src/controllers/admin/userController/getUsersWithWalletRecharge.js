const User = require('../../../models/user');
const WalletHistory = require('../../../models/walletHistory');
const catchAsync = require('../../../utils/catchAsync');

exports.getUsersWithWalletRecharge = catchAsync(async (req, res, next) => {
  try {
    // Find all users who have wallet recharge history (walletrecharge action with status Completed)
    const walletRecharges = await WalletHistory.aggregate([
      {
        $match: {
          userId: { $exists: true, $ne: null },
          action: 'walletrecharge',
          status: 'Completed'
        }
      },
      {
        $group: {
          _id: '$userId',
          totalRecharges: { $sum: 1 },
          totalRechargeAmount: { $sum: '$amount' },
          lastRechargeDate: { $max: '$createdAt' }
        }
      }
    ]);

    // Get user IDs who have done recharges
    const userIds = walletRecharges.map((item) => item._id);

    // Fetch user details with current wallet balance
    const users = await User.find({ _id: { $in: userIds } })
      .select('name mobileNo email wallet profileImage createdAt')
      .lean();

    // Merge user data with recharge statistics
    const usersWithWalletData = users.map((user) => {
      const rechargeData = walletRecharges.find((r) => r._id.toString() === user._id.toString());
      return {
        _id: user._id,
        name: user.name || 'N/A',
        mobileNo: user.mobileNo || 'N/A',
        email: user.email || 'N/A',
        profileImage: user.profileImage,
        currentWalletBalance: user.wallet || 0,
        totalRecharges: rechargeData?.totalRecharges || 0,
        totalRechargeAmount: rechargeData?.totalRechargeAmount || 0,
        lastRechargeDate: rechargeData?.lastRechargeDate || null,
        userSince: user.createdAt
      };
    });

    // Sort by last recharge date (most recent first)
    usersWithWalletData.sort((a, b) => {
      if (!a.lastRechargeDate) return 1;
      if (!b.lastRechargeDate) return -1;
      return new Date(b.lastRechargeDate) - new Date(a.lastRechargeDate);
    });

    res.status(200).json({
      success: true,
      message: 'Users with wallet recharge fetched successfully',
      results: usersWithWalletData.length,
      users: usersWithWalletData
    });
  } catch (error) {
    console.error('Error fetching users with wallet recharge:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});
