const catchAsync = require('../../../utils/catchAsync');
const UserServices = require('../../../services/user');
const VendorServices = require('../../../services/vendor');
const VendorProductServices = require('../../../services/vendorProduct');
const CartServices = require('../../../services/cart');
const { parseToBoolean } = require('../../../utils/parseToBoolean');
const WishlistServices = require('../../../services/wishlist');

exports.getProducts = catchAsync(async (req, res, next) => {
    try {
        const {
            name,
            isRecommended,
            isFeatured,
            isSeasonal,
            isVegetableOfTheDay,
            isFruitOfTheDay,
            isDealOfTheDay } = req.query;
        const userId = req.user._id;

        const user = await UserServices.getUserById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (!user.pincode) {
            return res.status(400).json({
                success: false,
                message: 'Pincode is required'
            });
        }

        const vendorQuery = { status: true };

        // will uncomment this code when we will add pincode in vendor
        // if (user.pincode) {
        //     vendorQuery.pincode = user.pincode;
        // }

        const vendor = await VendorServices.getVendor(vendorQuery)
        const vendorId = vendor?._id;

        const productQuery = {
            status: 'active',
            isDeleted: false,
        };
        if (name && name.trim() !== "") {
            productQuery.name = { $regex: name.trim(), $options: 'i' };
        }
        if (isRecommended && isRecommended.trim() !== "") {
            productQuery.isRecommended = parseToBoolean(isRecommended.trim());
        }
        if (isFeatured && isFeatured.trim() !== "") {
            productQuery.isFeatured = parseToBoolean(isFeatured.trim());
        }
        if (isSeasonal && isSeasonal.trim() !== "") {
            productQuery.isSeasonal = parseToBoolean(isSeasonal.trim());
        }
        if (isVegetableOfTheDay && isVegetableOfTheDay.trim() !== "") {
            productQuery.isVegetableOfTheDay = parseToBoolean(isVegetableOfTheDay.trim());
        }
        if (isFruitOfTheDay && isFruitOfTheDay.trim() !== "") {
            productQuery.isFruitOfTheDay = parseToBoolean(isFruitOfTheDay.trim());
        }
        if (isDealOfTheDay && isDealOfTheDay.trim() !== "") {
            productQuery.isDealOfTheDay = parseToBoolean(isDealOfTheDay.trim());
        }
        if (vendorId) {
            productQuery.vendorId = vendorId;
        }

        const [productList, cartProducts, wishlist] = await Promise.all([VendorProductServices.getAllProducts(productQuery, [
            { path: 'variants.variantTypeId', select: 'name' },
            { path: 'unitOfMeasurement', select: 'name -_id' }
        ]), CartServices.getCart({ userId: userId, status: 'active' }), WishlistServices.getWishlistByUserId(userId)])

        if (!productList || productList.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No product list found',
                productData: [],
                isServiceable: vendorId ? true : false
            });
        }

        const cartMap = new Map();

        if (cartProducts) {
            cartProducts.items.forEach((item) => {
                const key = `${item.productId}_${item.variantId || 'no-variant'}`;
                cartMap.set(key, item.quantity);
            });
        }

        const wishlistSet = new Set();

        if (wishlist) {
            wishlist.items.forEach((item) => {
                wishlistSet.add(item.productId.toString());
            });
        }

        const productData = productList.map((prod) => {
            const productKey = `${prod._id}_no-variant`;
            return {
                _id: prod._id,
                subCategoryId: prod.subCategoryId,
                name: prod.name,
                shopId: prod.shopId,
                vendorId: prod.vendorId,
                image: prod.primary_image,
                shortDescription: prod.shortDescription,
                vendorSellingPrice: prod.vendorSellingPrice,
                sellingUnit: prod.sellingUnit,
                rating: prod.rating,
                mrp: prod.mrp,
                unitOfMeasurement: prod.unitOfMeasurement,
                isInCart: cartMap.has(productKey),
                cartQty: cartMap.get(productKey) || 0,
                isInWishlist: wishlistSet.has(prod._id.toString()),
                variants: prod.variants.map((variant) => {
                    const variantKey = `${prod._id}_${variant._id}`;

                    return {
                        _id: variant._id,
                        variantTypeId: variant.variantTypeId,
                        sku: variant.sku || '',
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
            };
        });

        return res.status(200).json({
            success: true,
            message: 'Product List retrieved successfully',
            productData,
            isServiceable: vendorId ? true : false
        });
    } catch (error) {
        console.error('Error in get products data:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});