const Setting = require("../../../models/settings");
const User = require("../../../models/user");
const createToken = require("../../../utils/createToken");
const sendPushNotification = require("../../../utils/sendPushNotification");

exports.verifyOtp = async (req, res) => {
    try {
        const { mobileNo, otp, deviceId, deviceToken } = req.body;

        if (!mobileNo || !otp)
            return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });

        const user = await User.findOne({ mobileNo });

        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });

        if (!user.otp || !user.otp.code || user.otp.code !== otp)
            return res.status(400).json({ success: false, message: 'Invalid OTP' });

        if (user.otp.expiresAt < new Date())
            return res.status(400).json({ success: false, message: 'OTP has expired' });

        user.isVerified = true;
        user.deviceId = deviceId || user.deviceId;
        user.deviceToken = deviceToken || user.deviceToken;
        user.lastLogin = new Date();

        user.otp = undefined;
        // user.googleMapApiKey = ""

        const setting = await Setting.findById("680f1081aeb857eee4d456ab");
        const apiKey = setting?.googleMapApiKey || "working";

        await user.save();
        console.log("user.isNewUser", user.isNewUser);
        if (user.isNewUser) {
            sendPushNotification({
                deviceToken: user.deviceToken,
                title: "Welcome to GoRabbit",
                body: "Your account has been created successfully."
            });
        } else {
            sendPushNotification({
                deviceToken: user.deviceToken,
                title: "Welcome back to GoRabbit",
                body: "You have logged in successfully."
            });
        }

        // Generate and send token with user info
        return createToken(user, 200, res, true, { googleMapApiKey: apiKey, newUser: user.isNewUser });

    } catch (error) {
        console.error('Error in verifyOtp controller:', error);
        return res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
    }
};
