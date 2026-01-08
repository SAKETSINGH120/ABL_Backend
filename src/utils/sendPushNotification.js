const admin = require("../firebase/firebase");

const sendPushNotification = async ({ deviceToken, title, body,image = "http://192.168.1.14:5151/public/logo/logo-1756720964382-9276.png", data = {} }) => {
    if (!deviceToken) return;
    console.log("Sending notification to token:", deviceToken);
    const message = {
        token: deviceToken,
        notification: {
            title,
            body,
            ...(image && { image })  // ✅ Add image only if provided
        },
        data: {
            ...data,
            click_action: "FLUTTER_NOTIFICATION_CLICK" 
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("✅ Notification sent:", response);
        return response;
    } catch (error) {
        console.error("❌ Error sending notification:", error);
        // throw error;
    }
};

module.exports = sendPushNotification;
