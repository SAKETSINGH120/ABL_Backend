const newCart = require("../../../models/newCart");
const Shop = require("../../../models/shop");
const newOrder = require("../../../models/newOrder");
const User = require("../../../models/user");
const Address = require("../../../models/address");
const WalletHistory = require("../../../models/walletHistory");
const Setting = require("../../../models/settings")
const getDeliveryCharge = require("../../../utils/getDeliveryCharge");
const Vendor = require("../../../models/vendor");
const razorpay = require("../../../utils/razorpayInstance");

/**
 * Creates one or more orders from a user's cart, with one order per shop.
 * Supports applying multiple shop-specific and general coupons.
 */
/*
exports.createNewOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    // Destructure request body. 'coupons' is now expected to be an array.
    const {
      deliveryDate = new Date(),
      deliveryTime = "15 minutes",
      paymentMode,
      deliveryCharges = [],
      // coupons: 
      appliedCouponsFromRequest = [], // Expect an array of coupon objects
      paymentId,
      paymentStatus,
      // deliveryInstruction, // New field for delivery instructions
      // cookingInstructions = [], // ✅ Added
      isUsedCoin = false,
      usedCoin = 0,
      coinDiscount = 0,
    } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const address = await Address.findOne({ userId, isDefault: true });
    if (!address) {
      return res.status(400).json({ message: "Default address not found." });
    }

    const cart = await newCart.findOne({
      userId,
      status: "active",
      serviceType: user.serviceType,
    });
    if (!cart || !cart.shops.length) {
      return res.status(400).json({ message: "Cart is empty or not found." });
    }

    const createdOrders = []; // To store all newly created orders

    // Loop through each shop in the cart to create a separate order for each
    for (const shopData of cart.shops) {
      const { shopId, vendorId, items } = shopData;

      const shop = await Shop.findById(shopId);
      if (!shop) {
        console.warn(
          `Shop with ID ${shopId} not found, skipping order creation for this shop.`
        );
        continue; // Skip to the next shop if this one doesn't exist
      }

      // --- Generate a unique Booking ID ---
      const orderCount = await newOrder.countDocuments();
      const orderNumber = (orderCount + 1).toString().padStart(4, "0");
      const booking_id = `ORD${orderNumber}`;

      // --- Calculate Charges ---
      const deliveryChargeObj = deliveryCharges.find(
        (d) => d.shopId === shopId.toString()
      );

      const defaultAddress = await Address.findOne({ userId, isDefault: true });
      const setting = await Setting.findById("680f1081aeb857eee4d456ab").lean();
      var isDefaultAddress = defaultAddress ? true : false;

      let destination;
      if (defaultAddress) {
        destination = {
          lat: defaultAddress.location.coordinates[1],
          long: defaultAddress.location.coordinates[0],
        };
      } else {
        destination = {
          lat: Number(user.lat),
          long: Number(user.long),
        };
      }

      const origin = {
        lat: shop?.lat,
        long: shop?.long,
      };
      let perKmCost = 0;
      let driverDeliveryCharge = 0;
      const {
        deliveryChrge,
        distanceKm,
        durationText,
      } = await getDeliveryCharge(origin, destination, setting.googleMapApiKey);

      if (distanceKm < 3) {
        console.log("inside less than 3 km");
        driverDeliveryCharge = setting.driverPayoutLessThan3;
        // perKmCost = setting.driverPayoutLessThan3;
      }

      if (distanceKm >= 3) {
        console.log("inside more than 3 km");
        perKmCost = setting.driverPayoutMoreThan3;
        driverDeliveryCharge = distanceKm * perKmCost; // Example calculation
      }

      console.log("perKmCost", perKmCost);
      console.log("distanceKm", distanceKm);
      console.log("driverDeliveryCharge", driverDeliveryCharge);
      const deliveryCharge = deliveryChargeObj ? deliveryChargeObj.charge : 0;
      const packingCharge = shop.packingCharge || 0;

      const productData = items.map((item) => {
        // Try to find matching cooking instruction for this product
        const instructionObj = cookingInstructions.find(
          (c) =>
            c.shopId.toString() === shopId.toString() &&
            c.productId.toString() === item.productId.toString()
        );

        return {
          productId: item.productId,
          price: item.price,
          quantity: item.quantity,
          toppings: item.toppings,
          finalPrice: item.finalPrice,
          cookingInstruction: instructionObj?.note || "", // ✅ Add this line
        };
      });

      const itemTotal = productData.reduce((sum, p) => sum + p.finalPrice, 0);

      // --- NEW COUPON LOGIC ---
      // Filter coupons to find ones applicable to this specific shop order
      const applicableCoupons = appliedCouponsFromRequest.filter(
        (coupon) =>
          !coupon.shopId || coupon.shopId.toString() === shopId.toString()
      );

      // Prepare coupon data for the OrderSchema
      const appliedCouponsForSchema = applicableCoupons.map((c) => ({
        couponId: c.couponId,
        code: c.code,
        discountAmount: c.discountAmount,
      }));

      // Calculate the total discount for THIS order
      const totalCouponDiscount = appliedCouponsForSchema.reduce(
        (sum, c) => sum + c.discountAmount,
        0
      );

      const totalDiscount = +totalCouponDiscount + (isUsedCoin ? +coinDiscount : 0);



      const plateFormFee = +setting.plateformFee || 0;
      const gstValue = +setting.gst || 0;
      const gstAmount = (+itemTotal * gstValue) / 100;

      const finalTotalPrice =
        Math.max(0, +itemTotal - totalDiscount) +
        +deliveryCharge +
        +packingCharge +
        plateFormFee +
        gstAmount;

      // --- Create the new Order instance ---
      const order = new newOrder({
        booking_id,
        shopId,
        vendorId,
        userId,
        addressId: address._id, // Use the found address's ID
        deliveryDate,
        deliveryTime,
        paymentMode,
        productData,
        itemTotal,
        plateFormFee,
        gstValue,
        gstAmount,
        appliedCoupons: appliedCouponsForSchema, // New field
        totalCouponDiscount, // New field
        deliveryCharge,
        driverDeliveryCharge,
        packingCharge,
        finalTotalPrice,
        serviceType: cart.serviceType,
        paymentId,
        paymentStatus,
        deliveryInstruction, // Save delivery instructions
        // cookingInstruction, // Save cooking instructions
        // Set default values for other fields as needed by your schema

        isUsedCoin,
        usedCoin: isUsedCoin ? usedCoin : 0,
        coinDiscount: isUsedCoin ? coinDiscount : 0,
      });

      // Emit a real-time event to the vendor
      io.to(`vendor-${vendorId}`).emit("new-order", {
        _id: order._id,
        customerName: user.name,
        items: productData,
        shopName: shop.name,
        total: finalTotalPrice,
      });

      await order.save();
      createdOrders.push(order);
    }

    // Mark the cart as ordered once all orders are successfully created
    cart.status = "ordered";
    await cart.save();

    // --- Handle First Order Referral Bonus ---
    const userOrderCount = await newOrder.countDocuments({ userId });
    if (userOrderCount === createdOrders.length && user.referredBy) {
      // Check if these are the user's very first orders
      const referredUser = await User.findById(user.referredBy);
      if (referredUser) {
        let bonusAmount = 20;
        await WalletHistory.create({
          userId: referredUser._id,
          action: "credit",
          amount: bonusAmount,
          balance_after_action: referredUser.wallet + bonusAmount,
          description: `Credit ${bonusAmount} by goRabit for referral bonus`,
        });
        referredUser.wallet += bonusAmount;
        await referredUser.save();
      }
    }

    if (isUsedCoin && usedCoin > 0 && user.wallet >= usedCoin) {
      await WalletHistory.create({
        userId,
        action: "debit",
        amount: usedCoin,
        balance_after_action: user.wallet - usedCoin,
        description: `Used ${usedCoin} coins for order discount`,
      });
      user.wallet -= usedCoin;
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: "Orders created successfully",
      orders: createdOrders, // Send back all the orders that were created
    });
  } catch (error) {
    console.error("CreateOrder Error:", error);
    res.status(500).json({
      message: "Something went wrong while creating orders",
      error: error.message,
    });
  }
};
*/

exports.createNewOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      deliveryDate = new Date(),
      deliveryTime = "15",
      paymentMode,
      deliveryCharges,
      appliedCouponsFromRequest = [],
      paymentId,
      paymentStatus = "pending",
      deliveryInstruction,
      isUsedCoin = false,
      usedCoin = 0,
      coinDiscount = 0,
      addressId
    } = req.body;

    const [user, address, cart] = await Promise.all([
      User.findById(userId),
      Address.findOne({ userId, _id: addressId }),
      newCart.findOne({ userId, status: "active" })
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!address) {
      return res.status(400).json({ message: "Address not found." });
    }

    if (!cart) {
      return res.status(400).json({ message: "Cart not found." });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    const products = [];
    for (const productData of cart.items) {
      products.push({
        productId: productData.productId,
        variantId: productData.variantId,
        price: productData.price,
        quantity: productData.quantity,
        finalPrice: productData.finalPrice,
      });
    }
    const totalPrice = products.reduce((sum, p) => sum + p.finalPrice, 0);

    const vendorId = cart.vendorId;
    const [vendor, orderCount, setting] = await Promise.all([
      Vendor.findById(vendorId),
      newOrder.countDocuments(), Setting.findById("680f1081aeb857eee4d456ab").lean()
    ]);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    const orderNumber = (orderCount + 1).toString().padStart(4, "0");
    const booking_id = `ORD${orderNumber}`;
    const destination = {
      lat: address.location.coordinates[1],
      long: address.location.coordinates[0],
    };
    const origin = {
      lat: vendor.location?.coordinates?.[1] ?? "28.639",
      long: vendor.location?.coordinates?.[0] ?? "77.236",
    }

    // const {
    //   deliveryCharge,
    //   distanceKm,
    //   durationText,
    // } = await getDeliveryCharge(origin, destination, setting.googleMapApiKey);

    // if (distanceKm < 3) {
    //   driverDeliveryCharge = setting.driverPayoutLessThan3;
    //   perKmCost = setting.driverPayoutLessThan3;
    // }

    // if (distanceKm >= 3) {
    //   perKmCost = setting.driverPayoutMoreThan3;
    //   driverDeliveryCharge = distanceKm * perKmCost;
    // }

    // const deliveryChargeAmount = deliveryCharges ? deliveryCharges.charge : vendor.deliveryCharge ?? 10;

    let perKmCost = 0;
    let driverDeliveryCharge = 10;
    const packingCharge = setting.packingCharge || vendor.packingCharge || 0;
    const deliveryChargeAmount = setting.deliveryCharge || vendor.deliveryCharge || 10;
    const platformFee = Number(setting?.plateformFee) || 10;

    const gstValue = Number(setting?.gst) || 18;
    const gstAmount = Math.ceil((totalPrice + deliveryChargeAmount + packingCharge + platformFee) * (gstValue / 100));
    const finalTotalPrice =
      Number(totalPrice) +
      Number(deliveryChargeAmount) +
      Number(packingCharge) +
      Number(platformFee) +
      Number(gstAmount);

    const razorpayAmount = Math.floor(finalTotalPrice * 100);

    const options = {
      amount: razorpayAmount,
      currency: "INR",
      receipt: "abl_" + Math.floor(Math.random() * 10000),
    };

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create(options);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Failed to create Razorpay order" });
    }

    const order = new newOrder({
      booking_id,
      vendorId,
      userId,
      addressId: address._id,
      deliveryDate,
      deliveryTime,
      paymentMode,
      productData: products,
      itemTotal: totalPrice,
      plateFormFee: platformFee,
      gstValue,
      gstAmount,
      appliedCoupons: [], // New field
      totalCouponDiscount: 0, // New field
      deliveryCharge: deliveryChargeAmount,
      driverDeliveryCharge,
      packingCharge,
      finalTotalPrice,
      paymentId: paymentId || "",
      paymentStatus,
      deliveryInstruction,
      isUsedCoin,
      usedCoin: isUsedCoin ? usedCoin : 0,
      coinDiscount: isUsedCoin ? coinDiscount : 0,
      razorpayOrderId: razorpayOrder.id
    });

    io.to(`vendor-${vendorId}`).emit("new-order", {
      _id: order._id,
      customerName: user.name,
      items: products,
      shopName: "",
      total: finalTotalPrice,
    });

    // cart.status = "ordered";
    order.save();

    // await Promise.all([
    //   ,
    //   // cart.save(),
    // ]);

    // const createdOrders = [];
    /*
        for (const shopData of cart.shops) {
          const { shopId, vendorId, items } = shopData;
          // --- Calculate Charges ---
          const deliveryChargeObj = deliveryCharges.find(
            (d) => d.shopId === shopId.toString()
          );
    
          const defaultAddress = await Address.findOne({ userId, isDefault: true });
    
          var isDefaultAddress = defaultAddress ? true : false;
    
          let destination;
          if (defaultAddress) {
            destination = {
              lat: defaultAddress.location.coordinates[1],
              long: defaultAddress.location.coordinates[0],
            };
          } else {
            destination = {
              lat: Number(user.lat),
              long: Number(user.long),
            };
          }
    
          // let perKmCost = 0;
          // let driverDeliveryCharge = 0;
          // const {
          //   deliveryChrge,
          //   distanceKm,
          //   durationText,
          // } = await getDeliveryCharge(origin, destination, setting.googleMapApiKey);
    
          // if (distanceKm < 3) {
          //   console.log("inside less than 3 km");
          //   driverDeliveryCharge = setting.driverPayoutLessThan3;
          //   perKmCost = setting.driverPayoutLessThan3;
          // }
    
          // if (distanceKm >= 3) {
          //   console.log("inside more than 3 km");
          //   perKmCost = setting.driverPayoutMoreThan3;
          //   driverDeliveryCharge = distanceKm * perKmCost; // Example calculation
          // }
    
          // console.log("perKmCost", perKmCost);
          // console.log("distanceKm", distanceKm);
          // console.log("driverDeliveryCharge", driverDeliveryCharge);
          // const deliveryCharge = deliveryChargeObj ? deliveryChargeObj.charge : 0;
          // const packingCharge = shop.packingCharge || 0;
    
          const productData = items.map((item) => {
            // Try to find matching cooking instruction for this product
            const instructionObj = cookingInstructions.find(
              (c) =>
                c.shopId.toString() === shopId.toString() &&
                c.productId.toString() === item.productId.toString()
            );
    
            return {
              productId: item.productId,
              price: item.price,
              quantity: item.quantity,
              toppings: item.toppings,
              finalPrice: item.finalPrice,
              cookingInstruction: instructionObj?.note || "", // ✅ Add this line
            };
          });
    
          const itemTotal = productData.reduce((sum, p) => sum + p.finalPrice, 0);
    
          // --- NEW COUPON LOGIC ---
          // Filter coupons to find ones applicable to this specific shop order
          // const applicableCoupons = appliedCouponsFromRequest.filter(
          //   (coupon) =>
          //     !coupon.shopId || coupon.shopId.toString() === shopId.toString()
          // );
    
          // Prepare coupon data for the OrderSchema
          // const appliedCouponsForSchema = applicableCoupons.map((c) => ({
          //   couponId: c.couponId,
          //   code: c.code,
          //   discountAmount: c.discountAmount,
          // }));
    
          // Calculate the total discount for THIS order
          // const totalCouponDiscount = appliedCouponsForSchema.reduce(
          //   (sum, c) => sum + c.discountAmount,
          //   0
          // );
    
          // const totalDiscount = +totalCouponDiscount + (isUsedCoin ? +coinDiscount : 0);
    
    
    
          const plateFormFee = +setting.plateformFee || 0;
          const gstValue = +setting.gst || 0;
          const gstAmount = (+itemTotal * gstValue) / 100;
    
          const finalTotalPrice =
            Math.max(0, +itemTotal - totalDiscount) +
            +deliveryCharge +
            +packingCharge +
            plateFormFee +
            gstAmount;
    
          // --- Create the new Order instance ---
          const order = new newOrder({
            booking_id,
            shopId,
            vendorId,
            userId,
            addressId: address._id, // Use the found address's ID
            deliveryDate,
            deliveryTime,
            paymentMode,
            productData,
            itemTotal,
            plateFormFee,
            gstValue,
            gstAmount,
            appliedCoupons: appliedCouponsForSchema, // New field
            totalCouponDiscount, // New field
            deliveryCharge,
            driverDeliveryCharge,
            packingCharge,
            finalTotalPrice,
            serviceType: cart.serviceType,
            paymentId,
            paymentStatus,
            deliveryInstruction, // Save delivery instructions
            // cookingInstruction, // Save cooking instructions
            // Set default values for other fields as needed by your schema
    
            isUsedCoin,
            usedCoin: isUsedCoin ? usedCoin : 0,
            coinDiscount: isUsedCoin ? coinDiscount : 0,
          });
    
          // Emit a real-time event to the vendor
          io.to(`vendor-${vendorId}`).emit("new-order", {
            _id: order._id,
            customerName: user.name,
            items: productData,
            shopName: shop.name,
            total: finalTotalPrice,
          });
    
          await order.save();
          createdOrders.push(order);
        }
    */
    // Mark the cart as ordered once all orders are successfully created

    // --- Handle First Order Referral Bonus ---
    // const userOrderCount = await newOrder.countDocuments({ userId });
    // if (userOrderCount === createdOrders.length && user.referredBy) {
    //   // Check if these are the user's very first orders
    //   const referredUser = await User.findById(user.referredBy);
    //   if (referredUser) {
    //     let bonusAmount = 20;
    //     await WalletHistory.create({
    //       userId: referredUser._id,
    //       action: "credit",
    //       amount: bonusAmount,
    //       balance_after_action: referredUser.wallet + bonusAmount,
    //       description: `Credit ${bonusAmount} by goRabit for referral bonus`,
    //     });
    //     referredUser.wallet += bonusAmount;
    //     await referredUser.save();
    //   }
    // }

    if (isUsedCoin && usedCoin > 0 && user.wallet >= usedCoin) {
      await WalletHistory.create({
        userId,
        action: "debit",
        amount: usedCoin,
        balance_after_action: user.wallet - usedCoin,
        description: `Used ${usedCoin} coins for order discount`,
      });
      user.wallet -= usedCoin;
      await user.save();
    }

    return res.status(201).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      userData: user,
    });
  } catch (error) {
    console.error("CreateOrder Error:", error);
    res.status(500).json({
      message: "Something went wrong while creating orders",
      error: error.message,
    });
  }
};