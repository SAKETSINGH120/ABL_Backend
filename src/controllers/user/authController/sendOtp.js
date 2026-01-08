const User = require("../../../models/user");
const generateReferralCode = require("../../../utils/generateReferralCode");
const sendSmsOtp = require("../../../utils/sendSmsOtp");
const Setting = require("../../../models/settings");
const createToken = require("../../../utils/createToken");
const { generateOTP } = require("../../../utils/generateOtp");

// Send OTP to mobile number
const sendOtp = async (req, res) => {
  try {
    let { mobileNo, userName, isGuest, lat, long } = req.body;
    console.log("sendOtp request body:", req.body);
    if (isGuest) {
      // Guest user logic

      if (!lat || !long) {
        lat = "28.6259138";
        long = "77.3772432";
      }

      const userCreate = await User.create({
        lat: lat,
        long: long,
        location: {
          type: "Point",
          coordinates: [long, lat],
        },
        isGuest: true,
      });

      console.log("Guest user created:", userCreate);
      const setting = await Setting.findById("680f1081aeb857eee4d456ab");
      const apiKey = setting?.googleMapApiKey || "working";
      return createToken(userCreate, 200, res, true, {
        googleMapApiKey: apiKey,
        newUser: true,
      });
    }

    if (!mobileNo) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required" });
    }

    // Generate OTP
    const otp = "1234";
    // let otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Check if user exists
    let user = await User.findOne({ mobileNo });
    let isNewUser = false;

    // if (mobileNo === "8002647070") {
    //   otp = "1234"; // For testing purpose
    // }
    if (!user) {
      // Generate unique referral code
      const referralCode = await generateReferralCode();

      // Create new user if not exists
      user = new User({
        mobileNo,
        otp: {
          code: otp,
          expiresAt: otpExpiry,
        },
        name: userName || "",
        referralCode,
      });
      await user.save();
      isNewUser = true;
    } else {
      // Update existing user's OTP
      user.otp = {
        code: otp,
        expiresAt: otpExpiry,
      };
      await user.save();
    }

    // send OTP via SMS
    // try {
    //     await sendSmsOtp(mobileNo, otp);
    //     console.log("OTP sent successfully");
    // } catch (error) {
    //     console.error("Failed to send OTP:", error.message || error);
    //     return res.status(500).json({
    //         success: false,
    //         message: "Failed to send OTP"
    //     });
    // }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      // We're returning the OTP in the response for testing purposes
      // In production, remove this and actually send it via SMS
      // otp
    });
  } catch (error) {
    console.error("Error in sendOtp controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = sendOtp;
