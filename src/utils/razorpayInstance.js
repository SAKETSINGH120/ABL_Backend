const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    // key_id: process.env.RAZORPAY_KEY_ID,
    // key_secret: process.env.RAZORPAY_KEY_SECRET,
    key_id: "rzp_live_RYRPjickRNSkJx",
    key_secret: "E2t722jQK7aZBHRhKeGPvFq4",
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
