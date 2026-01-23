const mongoose = require("mongoose");
const Category = require("../../../models/category");
const Toppins = require("../../../models/toppins");
const User = require("../../../models/user");
const Vendor = require("../../../models/vendor");
const VendorProduct = require("../../../models/vendorProduct");
const { calculateOffer } = require("../../../utils/calculateOffer");
const catchAsync = require("../../../utils/catchAsync");
const newCart = require("../../../models/newCart");
const WishlistServices = require("../../../services/wishlist");

exports.getProductDetail = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const productId = req.params.productId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const [activeCart, wishlist] = await Promise.all([
            newCart.findOne({ userId: userId, status: 'active' }),
            WishlistServices.getWishlistByUserId(userId)
        ])

        const wishlistSet = new Set();

        if (wishlist) {
            wishlist.items.forEach((item) => {
                wishlistSet.add(item.productId.toString());
            });
        }

        const cartMap = new Map();

        if (activeCart) {
            activeCart.items.forEach((item) => {
                const key = `${item.productId}_${item.variantId || 'no-variant'}`;
                cartMap.set(key, item.quantity);
            });
        }

        const product = await VendorProduct.findById({ _id: productId }).populate('variants.variantTypeId', 'name')
            .populate('unitOfMeasurement', 'name -_id');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const vendorId = product.vendorId;

        const vendor = await Vendor.findById({ _id: vendorId });
        const vendorName = vendor.name;
        const productKey = `${product._id}_no-variant`;

        const productData = {
            _id: product._id,
            name: product.name,
            vendorName,
            vendorId: product.vendorId,
            primaryImage: product.primary_image,
            mrp: product.mrp,
            price: product.vendorSellingPrice,
            offer: calculateOffer(product.mrp, product.vendorSellingPrice),
            shortDescription: product.shortDescription,
            longDescription: product.longDescription,
            subCategoryId: product.subCategoryId,
            sellingUnit: product.sellingUnit,
            mrp: product.mrp,
            unitOfMeasurement: product.unitOfMeasurement,
            isInCart: cartMap.has(productKey),
            isInWishlist: wishlistSet.has(product._id.toString()),
            cartQty: cartMap.get(productKey) || 0,
            variants: product.variants.map((variant) => {
                const variantKey = `${product._id}_${variant._id}`;

                return {
                    _id: variant._id,
                    variantTypeId: variant.variantTypeId,
                    variantName: variant.variantName || '',
                    mrp: variant.mrp,
                    sellingPrice: variant.sellingPrice,
                    sellingUnit: variant.sellingUnit,
                    stock: variant.stock || 0,
                    status: variant.status || 'active',
                    isInCart: cartMap.has(variantKey),
                    cartQty: cartMap.get(variantKey) || 0
                };
            })
        }


        return res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: productData
        });

    } catch (error) {
        console.error('Error in get product details controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
})