const newOrder = require('../../../models/newOrder');
const Order = require('../../../models/order');
const Setting = require('../../../models/settings');
const AppError = require('../../../utils/AppError');
const catchAsync = require('../../../utils/catchAsync');
const getDistanceAndTime = require('../../../utils/getDistanceAndTime');

exports.orderDetails = catchAsync(async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const ord = await newOrder
      .findById(orderId)
      .populate('productData.productId')
      .populate('userId', 'name email mobileNo profileImage location')
      .populate('addressId', 'address1 address2 city pincode state location')
      .populate('assignedDriver', 'name')
      .populate('vendorId', 'name email mobile profileImg location address');

    if (!ord) {
      return next(new AppError('Order not found', 404));
    }

    const settings = await Setting.findOne();
    const googleMapApiKey = settings.googleMapApiKey;
    const driverLocation = {
      lat: req.driver.location.coordinates[1],
      long: req.driver.location.coordinates[0]
    };

    const vendorLocation = {
      lat: ord.vendorId.location.coordinates[1],
      long: ord.vendorId.location.coordinates[0]
    };

    const userLocation = {
      lat: ord.addressId.location.coordinates[1],
      long: ord.addressId.location.coordinates[0]
    };

    // const driverToVendor = await getDistanceAndTime(driverLocation, vendorLocation, googleMapApiKey);
    // const vendorToUser = await getDistanceAndTime(vendorLocation, userLocation, googleMapApiKey);

    const parseKm = (distanceText) => {
      if (!distanceText || distanceText === 'N/A') return 0;
      return parseFloat(distanceText.replace(',', '').replace(' km', ''));
    };

    const totalKm = 10; //parseKm(driverToVendor.distance) + parseKm(vendorToUser.distance);

    console.log(ord.productData[0]);

    const productCount = ord.productData.reduce((total, prod) => total + (prod.quantity || 0), 0);

    const orderDetails = {
      _id: ord._id,
      bookingId: ord.booking_id,
      orderId: ord.orderId,
      pickup: {
        name: ord.vendorId.name,
        address: ord.vendorId.address,
        image: ord.vendorId.profileImg,
        mobileNo: ord.vendorId.mobile,
        lat: ord.vendorId.location.coordinates[1],
        long: ord.vendorId.location.coordinates[0]
      },
      delivery: {
        image: ord.userId.profileImage || '',
        name: ord.userId.name,
        email: ord.userId.email,
        mobileNo: ord.userId.mobileNo,
        address1: ord.addressId.address1,
        address2: ord.addressId.address2,
        lat: ord.addressId.location.coordinates[1],
        long: ord.addressId.location.coordinates[0],
        city: ord.addressId.city,
        pincode: ord.addressId.pincode,
        state: ord.addressId.state,
        deliveryInsturction: ''
      },
      products: ord.productData.map((prod) => ({
        name: prod.productId?.name || 'product name',
        image: prod.productId?.primary_image || '',
        price: prod.price,
        mrp: prod?.productId?.mrp,
        quantity: prod.quantity,
        finalPrice: prod.finalPrice,
        unitOfMeasurement: prod.productId?.unitOfMeasurements || '',
        sellingUnit: prod.productId?.sellingUnit || ''
      })),
      status: ord.orderStatus,
      deliveryCharge: ord.driverDeliveryCharge,
      totalAmount: ord.finalTotalPrice,
      paymentMode: ord.paymentMode,
      createdAt: ord.createdAt,
      totalKm: Math.ceil(totalKm)
      // productCount: productCount
    };

    return res.status(200).json({
      success: true,
      message: 'Order details retrieved successfully',
      order: orderDetails
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return next(new AppError('Failed to get order details', 500));
  }
});
