const banner = require('../../../models/banner');
const User = require('../../../models/user');
const Vendor = require('../../../models/vendor');
const catchAsync = require('../../../utils/catchAsync');
const VendorServices = require("../../../services/vendorProduct");
const AdminProductServices = require("../../../services/adminProduct");
const CategoryServices = require("../../../services/category");
const OrderServices = require("../../../services/order")

exports.getAllData = catchAsync(async (req, res, next) => {
  try {

    const [categoryCount, subCategoryCount, vendorCount, bannerCount, userCount, vendorProductCount, adminProductCount, orderCount] = await Promise.all([
      CategoryServices.countCategories({ cat_id: null }),
      CategoryServices.countCategories({ cat_id: { $ne: null } }),
      Vendor.countDocuments(),
      banner.countDocuments(),
      User.countDocuments(),
      VendorServices.countProducts({ status: "active" }),
      AdminProductServices.countProducts({ status: "active" }),
      OrderServices.countOrders({ orderStatus: "accepted", paymentStatus: "paid" })
    ]);

    const countData = {
      banner: bannerCount || 0,
      category: categoryCount || 0,
      subCategory: subCategoryCount || 0,
      vendor: vendorCount || 0,
      user: userCount || 0,
      adminProduct: adminProductCount || 0,
      vendorProduct: vendorProductCount || 0,
      orderCount: orderCount || 0
    };

    return res.status(200).json({ success: true, message: 'Data fetched successfully', data: { countData } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
