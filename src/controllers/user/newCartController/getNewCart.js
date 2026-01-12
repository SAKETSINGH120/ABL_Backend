// const { axios } = require('axios');
// const Address = require('../../../models/address');
// const newCart = require('../../../models/newCart');
// const Setting = require('../../../models/settings');
// const User = require('../../../models/user');
// const getDeliveryCharge = require('../../../utils/getDeliveryCharge');

// Main Controller

const Address = require('../../../models/address');
const Cart = require('../../../models/newCart');
const Setting = require('../../../models/settings');
const User = require('../../../models/user');
const Vendor = require('../../../models/vendor');
const getDeliveryCharge = require('../../../utils/getDeliveryCharge');

exports.getNewCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    /* ---------------- USER DELIVERY LOCATION ---------------- */
    const defaultAddress = await Address.findOne({ userId, isDefault: true });

    let destination;
    if (defaultAddress) {
      destination = {
        lat: defaultAddress.location.coordinates[1],
        long: defaultAddress.location.coordinates[0]
      };
    } else if (user.lat && user.long) {
      destination = {
        lat: Number(user.lat),
        long: Number(user.long)
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'No delivery location found'
      });
    }

    /* ---------------- FETCH CART ---------------- */
    const cartDoc = await Cart.findOne({
      userId,
      status: 'active'
    }).populate({
      path: 'items.productId',
      select: 'name sellingPrice primary_image'
    });

    const setting = await Setting.findById('680f1081aeb857eee4d456ab');
    const platformFee = Number(setting?.plateformFee) || 10;

    if (!cartDoc || cartDoc.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        cart: null,
        platformFee
      });
    }

    /* ---------------- FETCH VENDOR ---------------- */
    const vendor = await Vendor.findById(cartDoc.vendorId).select('name lat long packingCharge');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const origin = {
      lat: Number(vendor.lat),
      long: Number(vendor.long)
    };

    // const { distanceKm, durationText, deliveryCharge } = await getDeliveryCharge(origin, destination, setting?.googleMapApiKey);
    const distanceKm = 3;
    const durationText = 'OK';
    const deliveryCharge = 10;

    const isDeliveryAvailable = !isNaN(distanceKm) && distanceKm <= 20;

    /* ---------------- CALCULATIONS ---------------- */
    let subtotal = 0;

    const items = cartDoc.items.map((item) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      return {
        ...item.toObject(),
        itemTotal
      };
    });

    const packingCharge = Number(vendor.packingCharge) || 0;
    const gst = Math.ceil((subtotal + packingCharge + deliveryCharge + platformFee) * 0.18);

    const grandTotal = subtotal + packingCharge + deliveryCharge + platformFee + gst;

    /* ---------------- RESPONSE ---------------- */
    return res.status(200).json({
      success: true,
      cart: {
        vendor: {
          vendorId: vendor._id,
          name: vendor.name
        },
        items,
        deliveryInfo: {
          distanceKm,
          durationText,
          deliveryCharge,
          isDeliveryAvailable
        }
      },
      charges: {
        subtotal: Number(subtotal.toFixed(2)),
        packingCharge,
        deliveryCharge,
        platformFee,
        gst,
        grandTotal: Number(grandTotal.toFixed(2))
      }
    });
  } catch (error) {
    console.error('GetCart Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// exports.getNewCart = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     const defaultAddress = await Address.findOne({ userId, isDefault: true });

//     let destination;
//     if (defaultAddress) {
//       // Fix coordinate order: MongoDB stores as [longitude, latitude]
//       destination = {
//         lat: defaultAddress.location.coordinates[1], // Second value is latitude
//         long: defaultAddress.location.coordinates[0] // First value is longitude
//       };
//     } else if (user.lat && user.long) {
//       destination = {
//         lat: Number(user.lat),
//         long: Number(user.long)
//       };
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'No delivery location found (default address or user location missing)'
//       });
//     }

//     const cartDoc = await newCart
//       .findOne({
//         userId,
//         status: 'active'
//         // serviceType: user.serviceType,
//       })
//       .populate({
//         path: 'shops.shopId',
//         select: 'name address packingCharge lat long'
//       })
//       .populate({ path: 'shops.vendorId', select: 'name' })
//       .populate({
//         path: 'shops.items.productId',
//         select: 'name price primary_image'
//       });
//     // .populate({
//     //   path: "shops.items.toppings.toppingId",
//     //   select: "name price",
//     // });

//     const setting = await Setting.findById('680f1081aeb857eee4d456ab');
//     const apiKey = setting?.googleMapApiKey;
//     const plateformFee = Number(setting?.plateformFee) || 10;

//     console.log('cartDoc', cartDoc);
//     if (!cartDoc || cartDoc.shops.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: 'Cart is empty',
//         cart: null,
//         platformFee: plateformFee
//       });
//     }

//     // console.log(typeof(plateformFee), "plateformFee");

//     const cart = cartDoc.toObject();
//     const platformFee = plateformFee;
//     let totalPackingCharge = 0;
//     let totalDeliveryCharge = 0;
//     let subtotal = 0;

//     const shopBreakdown = [];

//     cart.shops = await Promise.all(
//       cart.shops.map(async (shop) => {
//         const packingCharge = shop.shopId?.packingCharge || 0;

//         // Validate and parse shop coordinates
//         const shopLat = parseFloat(shop.shopId?.lat);
//         const shopLong = parseFloat(shop.shopId?.long);

//         if (isNaN(shopLat) || isNaN(shopLong)) {
//           console.error(`Invalid shop coordinates for shop ${shop.shopId?._id}:`, {
//             lat: shop.shopId?.lat,
//             long: shop.shopId?.long
//           });
//         }

//         const origin = {
//           lat: shopLat,
//           long: shopLong
//         };

//         // Log coordinates for debugging
//         console.log('Distance calculation coordinates:', {
//           origin: { lat: shopLat, long: shopLong },
//           destination: { lat: destination.lat, long: destination.long }
//         });

//         const { distanceKm, durationText, deliveryCharge } = await getDeliveryCharge(origin, destination, apiKey);

//         // Check if delivery is possible (within 5km range)
//         const isDeliveryAvailable = !isNaN(distanceKm) && distanceKm <= 20;
//         const deliveryMessage = isDeliveryAvailable ? 'Delivery available' : 'Delivery not available - Outside delivery range';

//         let shopItemTotal = 0;

//         const updatedItems = shop.items.map((item) => {
//           // const toppingsTotal = item.toppings.reduce(
//           //   (sum, topping) => sum + topping.price,
//           //   0
//           // );
//           const itemTotal = item.price * item.quantity;
//           shopItemTotal += itemTotal;

//           return {
//             ...item,
//             // toppings: item.toppings.map((t) => ({
//             //   topping_id: t.toppingId?._id,
//             //   name: t.toppingId?.name,
//             //   price: t.price
//             // }))
//           };
//         });

//         totalPackingCharge += packingCharge;
//         totalDeliveryCharge += deliveryCharge;
//         subtotal += shopItemTotal;

//         shopBreakdown.push({
//           shopId: shop.shopId._id,
//           shopName: shop.shopId.name,
//           itemTotal: Number(shopItemTotal.toFixed(2)),
//           packingCharge: Number(packingCharge.toFixed(2)),
//           deliveryCharge: Number(deliveryCharge.toFixed(2)),
//           distanceKm,
//           durationText,
//           isDeliveryAvailable,
//           deliveryMessage,
//           shopTotal: Number((shopItemTotal + packingCharge + deliveryCharge).toFixed(2))
//         });

//         return {
//           ...shop,
//           items: updatedItems,
//           deliveryInfo: {
//             distanceKm,
//             durationText,
//             deliveryCharge,
//             isDeliveryAvailable,
//             deliveryMessage
//           }
//         };
//       })
//     );

//     // const gst = Number(((subtotal + totalPackingCharge + totalDeliveryCharge + platformFee) * 0.18).toFixed(2));
//     const gst = Math.ceil((subtotal + totalPackingCharge + totalDeliveryCharge + platformFee) * 0.18);
//     const grandTotal = subtotal + totalPackingCharge + totalDeliveryCharge + platformFee + gst;

//     return res.status(200).json({
//       success: true,
//       cart,
//       charges: {
//         platformFee,
//         gst,
//         grandTotal: Number(grandTotal.toFixed(2))
//       },
//       breakdown: {
//         subtotal: Number(subtotal.toFixed(2)),
//         totalPackingCharge: Number(totalPackingCharge.toFixed(2)),
//         totalDeliveryCharge: Number(totalDeliveryCharge.toFixed(2)),
//         shops: shopBreakdown
//       }
//     });
//   } catch (error) {
//     console.error('GetCart Error:', error);
//     return res.status(500).json({ success: false, message: 'Server error', error: error.message });
//   }
// };
