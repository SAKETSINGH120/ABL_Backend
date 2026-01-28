const Driver = require('../../../models/driver');
const newOrder = require('../../../models/newOrder');
const catchAsync = require('../../../utils/catchAsync');

exports.getAllDriverForThisNewOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  // Fetch the order details
  const order = await newOrder.findById(orderId).populate('addressId');

  if (!order) {
    return res.status(404).json({
      status: false,
      message: 'Order not found'
    });
  }

  // Extract the delivery location coordinates from the order's address
  // const deliveryLocation = order.addressId.location.coordinates;
  const deliveryLocationPincode = order.addressId.pincode;
  console.log(deliveryLocationPincode);
  // Earth's radius in kilometers
  const earthRadius = 6378.1;

  // Radius in which to find drivers (5 km)
  const radius = 100 / earthRadius;

  // const allDriver = await Driver.aggregate([
  const allDriver = await Driver.find(
    { pincode: deliveryLocationPincode },
    // {
    //     $geoNear: {
    //         near: {
    //             type: "Point",
    //             coordinates: deliveryLocation, // [lng, lat]
    //         },
    //         distanceField: "distanceInMeters",
    //         spherical: true,
    //         maxDistance: 10000, // 10 km in meters
    //         query: {
    //             status: "active",
    //             currentOrderId: null
    //         }
    //     }
    // },

    {
      name: 1,
      mobileNo: 1,
      location: 1,
      distanceInMeters: 1 / 1000,
      currentOrderId: 1
    }
  );

  // const allDriver = await Driver.find();
  return res.status(200).json({
    status: true,
    results: allDriver.length,
    data: allDriver
  });
});

// exports.getAllDriverForThisNewOrder = catchAsync(async (req, res) => {

//     const {orderId} = req.params

//     const order = await newOrder.findById(orderId);

//     const allDriver = await Driver.find({status: "active"})

//     return res.status(200).json({
//         status: true,
//         results: allDriver.length,
//         data: allDriver
//     })

// })
