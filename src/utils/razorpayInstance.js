const Razorpay = require("razorpay");

const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpayId = process.env.RAZORPAY_KEY_ID;

const razorpay = new Razorpay({
    key_id: razorpayId,
    key_secret: razorpaySecret,
    // key_id: "rzp_test_hCRLFPf6rY3elm",
    // key_secret: "m1lFhxsJTlb78bz2owxRy0E8",
});

module.exports = razorpay;

// const Razorpay = require("razorpay");
// let razorpay = null;

// const initRazorpay = (key_id, key_secret) => {
//     razorpay = new Razorpay({ key_id, key_secret });
//     console.log("🔄 Razorpay initialized with new keys");
// };

// const getRazorpay = () => {
//     if (!razorpay) throw new Error("Razorpay not initialized");
//     return razorpay;
// };

// module.exports = { initRazorpay, getRazorpay };
