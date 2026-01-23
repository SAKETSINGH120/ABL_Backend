const Driver = require('../../../models/driver');
const newOrder = require('../../../models/newOrder');
const order = require('../../../models/order');
const Setting = require('../../../models/settings');
const AppError = require('../../../utils/AppError');
const catchAsync = require('../../../utils/catchAsync');
const getDistanceAndTime = require('../../../utils/getDistanceAndTime');

exports.orderList = catchAsync(async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const type = req.query.type || 'all';
    const days = req.query.days; // send days from query like 1, 7 etc.

    let filter = { assignedDriver: driverId };

    if (type === 'history') {
      filter.orderStatus = 'delivered';
    } else if (type === 'new') {
      filter.orderStatus = 'shipped';
    } else if (type === 'ongoing') {
      filter.orderStatus = { $in: ['running', 'picked up', 'out of delivery'] };
    }

    // Add date range filter if days parameter is provided
    if (days) {
      const numDays = parseInt(days);
      if (!isNaN(numDays) && numDays > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays);
        startDate.setHours(0, 0, 0, 0);
        filter.createdAt = { $gte: startDate };
      }
    }

    const orderListRaw = await newOrder
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('addressId', 'address1 address2 city pincode state location')
      .populate('userId', 'name email mobileNo lat long profileImage location')
      .populate('vendorId', 'name email mobile profileImg location address')
      .populate('productData.productId');

    if (!orderListRaw || orderListRaw.length === 0) {
      return next(new AppError('No orders found for this driver', 404));
    }

    const settings = await Setting.findOne();
    const googleMapApiKey = settings.googleMapApiKey;
    const driverLocation = {
      lat: req.driver.location.coordinates[1],
      long: req.driver.location.coordinates[0]
    };

    const orderList = await Promise.all(
      orderListRaw.map(async (ord) => {
        const vendorLocation = {
          lat: ord.vendorId.location.coordinates[1],
          long: ord.vendorId.location.coordinates[0]
        };

        const userLocation = {
          lat: ord.addressId.location.coordinates[1],
          long: ord.addressId.location.coordinates[0]
        };

        const driverToShop = await getDistanceAndTime(driverLocation, vendorLocation, googleMapApiKey);
        const shopToUser = await getDistanceAndTime(vendorLocation, userLocation, googleMapApiKey);
        console.log('🚀 ~ shopToUser:', shopToUser, driverToShop);

        const parseKm = (distanceText) => {
          if (!distanceText || distanceText === 'N/A') return 0;
          return parseFloat(distanceText.replace(',', '').replace(' km', ''));
        };

        const totalKm = parseKm(driverToShop.distance) + parseKm(shopToUser.distance);

        return {
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
            state: ord.addressId.state
          },
          products: ord.productData.map((prod) => ({
            name: prod.productId?.name || 'product name',
            price: prod.price,
            quantity: prod.quantity,
            finalPrice: prod.finalPrice
          })),
          status: ord.orderStatus,
          deliveryCharge: ord.driverDeliveryCharge,
          totalAmount: ord.finalTotalPrice,
          paymentMode: ord.paymentMode,
          createdAt: ord.createdAt,
          totalKm: Math.ceil(totalKm)
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Order list retrieved successfully',
      count: orderList.length,
      orderList
    });
  } catch (error) {
    console.error('Error in order list:', error);
    return next(new AppError('Failed to get order list', 500));
  }
});
