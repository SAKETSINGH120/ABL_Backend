const banner = require('../../../models/banner');
const Category = require('../../../models/category');
const Product = require('../../../models/product');
const Service = require('../../../models/service');
const User = require('../../../models/user');
const Vendor = require('../../../models/vendor');
const VendorProduct = require('../../../models/vendorProduct');
const catchAsync = require('../../../utils/catchAsync');

exports.getAllData = catchAsync(async (req, res, next) => {
  try {
    // const categories = await Category.find({ cat_id: null }).populate({ path: "serviceId", select: "name" });

    // // let categoryWithProduct = [];
    // // for (let category of categories) {
    // //     const count = await Product.countDocuments({ categoryId: category._id })
    // //     categoryWithProduct.push({ ...category._doc, productCount: count })
    // // }

    // const subCategories = await Category.find({ cat_id: { $ne: null } });
    // // let subCategoryWithProduct = [];
    // // for (let subCategory of subCategories) {
    // //     const count = await Product.countDocuments({ subCategoryId: subCategory._id })
    // //     subCategoryWithProduct.push({ ...subCategory._doc, productCount: count })
    // // }

    // const services = await Service.find();
    // const productCount = [];
    // for (let service of services) {
    //     const count = await Product.countDocuments({ serviceId: service._id })
    //     productCount.push({ name: service.name, productCount: count })
    // }

    // const vendorCount = await Vendor.countDocuments()
    // const bannerCount = await banner.countDocuments()
    // const userCount = await User.countDocuments()

    let countData = {
      banner: 10, // bannerCount || 10,
      category: 10, //categories?.length || 10,
      subCategory: 10, //subCategories.length || 10,
      food:10, // productCount[0].productCount || 10,
      grocery: 10, // productCount[1].productCount || 10,
      vendor:10, // vendorCount || 10,
      user:10, // userCount || 10
    };

    return res.status(200).json({ success: true, message: 'Data found', data: { countData } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
