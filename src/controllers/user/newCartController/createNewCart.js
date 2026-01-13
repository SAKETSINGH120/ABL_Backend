const VendorProduct = require('../../../models/vendorProduct');
const Shop = require('../../../models/shop');
const newCart = require('../../../models/newCart');
const User = require('../../../models/user');

exports.createNewCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const { productId, quantity = 1 } = req.body;

    // variantId can be string OR null from frontend
    const rawVariantId = req.body.variantId;
    const variantId = typeof rawVariantId === 'string' && rawVariantId.trim() ? rawVariantId.trim() : null;

    // ❗ quantity = 0 is allowed (means remove)
    if (!productId || quantity < 0) {
      return res.status(400).json({
        message: 'productId and valid quantity are required'
      });
    }

    // Fetch product
    const product = await VendorProduct.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const vendorId = product.vendorId;

    let price;
    let mrp;
    let variantName = null;
    let sellingUnit;
    let availableStock;

    // ============================
    // VARIANT / NON-VARIANT LOGIC
    // ============================

    if (variantId) {
      // Variant product
      if (!product.variants || product.variants.length === 0) {
        return res.status(400).json({
          message: 'This product does not support variants'
        });
      }

      const variant = product.variants.id(variantId);
      if (!variant || variant.status !== 'active') {
        return res.status(404).json({
          message: 'Variant not found or inactive'
        });
      }

      availableStock = variant.stock;
      price = variant.sellingPrice;
      mrp = variant.mrp;
      variantName = variant.variantName;
      sellingUnit = variant.sellingUnit;
    } else {
      // Simple product (no variant)
      availableStock = product.stock;
      price = product.vendorSellingPrice;
      mrp = product.mrp;
      sellingUnit = product.sellingUnit;
    }

    // ❗ Stock check ONLY when quantity > 0
    if (quantity > 0 && availableStock < quantity) {
      return res.status(400).json({
        message: 'Insufficient stock'
      });
    }

    const finalPrice = price * quantity;

    // ============================
    // FIND ACTIVE CART
    // ============================
    let cart = await newCart.findOne({ userId, status: 'active' });

    // Normalize variantId for comparison
    const normalizedVariantId = variantId ? String(variantId) : null;

    // ============================
    // CART NOT EXISTS → CREATE
    // ============================
    if (!cart) {
      // If quantity = 0 & cart does not exist → nothing to remove
      if (quantity === 0) {
        return res.status(200).json({
          success: true,
          message: 'Item already not in cart',
          cart: null
        });
      }

      cart = new newCart({
        userId,
        vendorId,
        items: [
          {
            productId,
            variantId: normalizedVariantId,
            variantName,
            sellingUnit,
            mrp,
            price,
            quantity,
            finalPrice
          }
        ]
      });

      await cart.save();

      return res.status(200).json({
        success: true,
        message: 'Item added to cart',
        cart
      });
    }

    // ============================
    // CART EXISTS → FIND ITEM
    // ============================
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId && (item.variantId ? String(item.variantId) : null) === normalizedVariantId);

    // ============================
    // REMOVE ITEM (quantity === 0)
    // ============================
    if (itemIndex > -1 && quantity === 0) {
      cart.items.splice(itemIndex, 1);

      // ❗ DO NOT clear cart if other items exist
      await cart.save();

      return res.status(200).json({
        success: true,
        message: 'Item removed from cart',
        cart
      });
    }

    // ============================
    // UPDATE EXISTING ITEM
    // ============================
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].finalPrice = quantity * cart.items[itemIndex].price;
    }
    // ============================
    // ADD NEW ITEM
    // ============================
    else if (quantity > 0) {
      cart.items.push({
        productId,
        variantId: normalizedVariantId,
        variantName,
        sellingUnit,
        mrp,
        price,
        quantity,
        finalPrice
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      cart
    });
  } catch (error) {
    console.error('AddToCart Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// mostly correct
// exports.createNewCart = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // variantId OPTIONAL hai
//     const { productId, quantity = 1 } = req.body;
//     const rawVariantId = req.body.variantId;
//     const variantId = typeof rawVariantId === 'string' && rawVariantId.trim() ? rawVariantId.trim() : null;
//     console.log('🚀 ~ req.body:', req.body);

//     if (!productId || quantity < 0) {
//       return res.status(400).json({
//         message: 'productId and valid quantity are required.'
//       });
//     }

//     const product = await VendorProduct.findById(productId);
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found.' });
//     }

//     const vendorId = product.vendorId;

//     let price;
//     let mrp;
//     let variantName = null;
//     let sellingUnit;
//     let availableStock;

//     //CASE 1: Variant exists
//     if (variantId) {
//       const variant = product.variants.id(variantId);
//       console.log('🚀 ~ variant:', variant);

//       if (!variant || variant.status !== 'active') {
//         return res.status(404).json({
//           message: 'Variant not found or inactive.'
//         });
//       }

//       availableStock = variant.stock;

//       if (availableStock < quantity) {
//         return res.status(400).json({
//           message: 'Insufficient stock.'
//         });
//       }

//       price = variant.sellingPrice;
//       mrp = variant.mrp;
//       variantName = variant.variantName;
//       sellingUnit = variant.sellingUnit;
//     }
//     // CASE 2: No variant (simple product)
//     else {
//       availableStock = product.stock;

//       if (availableStock < quantity) {
//         return res.status(400).json({
//           message: 'Insufficient stock.'
//         });
//       }

//       price = product.vendorSellingPrice;
//       mrp = product.mrp;
//       sellingUnit = product.sellingUnit;
//     }

//     const finalPrice = price * quantity;

//     let cart = await newCart.findOne({ userId, status: 'active' });

//     if (!cart) {
//       cart = new newCart({
//         userId,
//         vendorId,
//         items: [
//           {
//             productId,
//             variantId, // null if no variant
//             variantName,
//             sellingUnit,
//             mrp,
//             price,
//             quantity,
//             finalPrice
//           }
//         ]
//       });
//     } else {
//       // MATCH BOTH CASES (variant OR no variant)
//       console.log('🚀 ~ cart.items:', cart.items, productId);
//       // console.log('🚀 ~ item.variantId:', item.variantId);
//       const existingItem = cart.items.find((item) => {
//         return item.productId.toString() === productId && String(item.variantId) === String(variantId);
//       });

//       console.log('🚀 ~ existingItem:', existingItem, quantity);

//       if (existingItem) {
//         // existingItem.quantity += quantity;
//         existingItem.quantity = quantity;
//         existingItem.finalPrice = existingItem.quantity * existingItem.price;
//       } else {
//         cart.items.push({
//           productId,
//           variantId,
//           variantName,
//           sellingUnit,
//           mrp,
//           price,
//           quantity,
//           finalPrice
//         });
//       }
//     }

//     await cart.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Item added to cart',
//       cart
//     });
//   } catch (error) {
//     console.error('AddToCart Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };

// // Comment
// exports.createNewCart = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { productId, price, quantity = 1 } = req.body;

//     // 🔹 Basic validation
//     if (!productId || typeof price !== 'number' || price < 0 || quantity < 1) {
//       return res.status(400).json({ message: 'Invalid product, price, or quantity.' });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     // 🔹 Fetch product
//     const product = await VendorProduct.findById(productId);
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found.' });
//     }

//     const vendorId = product.vendorId;

//     const finalPrice = price * quantity;

//     // 🔹 Find active cart
//     let cart = await newCart.findOne({
//       userId,
//       status: 'active'
//     });
//     console.log('🚀 ~ cart:', cart);

//     // 🔹 If cart does not exist → create new
//     if (!cart) {
//       cart = new newCart({
//         userId,
//         vendorId,
//         items: [
//           {
//             productId,
//             price,
//             quantity,
//             finalPrice
//           }
//         ]
//       });
//     } else {
//       // 🔒 Enforce single vendor rule
//       console.log('🚀 ~ cart.vendorId:', cart.vendorId);
//       if (cart.vendorId.toString() !== vendorId.toString()) {
//         return res.status(400).json({
//           message: 'You can order from only one vendor at a time.'
//         });
//       }

//       // 🔹 Check if product already exists in cart
//       const existingItem = cart.items.find((item) => item.productId.toString() === productId);

//       if (existingItem) {
//         existingItem.quantity += quantity;
//         existingItem.finalPrice += finalPrice;
//       } else {
//         cart.items.push({
//           productId,
//           price,
//           quantity,
//           finalPrice
//         });
//       }
//     }

//     await cart.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Item added to cart',
//       cart
//     });
//   } catch (error) {
//     console.error('AddToCart Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };
// // Comment

// exports.createNewCart = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const {
//       productId,
//       price,
//       quantity = 1
//       //  toppings = [], // [{ toppingId, price }]
//     } = req.body;

//     // Basic validations
//     if (!productId || typeof price !== 'number' || price < 0 || quantity < 1) {
//       return res.status(400).json({ message: 'Invalid product or price or quantity.' });
//     }

//     // for (const t of toppings) {
//     //   if (!t.toppingId || typeof t.price !== "number" || t.price < 0) {
//     //     return res.status(400).json({ message: "Invalid topping data." });
//     //   }
//     // }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     // Get shop & vendor from product
//     const product = await VendorProduct.findById(productId).populate('shopId vendorId');
//     if (!product) return res.status(404).json({ message: 'Product not found.' });

//     const shopId = product.shopId._id;
//     const vendorId = product.vendorId._id;

//     // Calculate finalPrice
//     // const toppingsCost = toppings.reduce((sum, t) => sum + t.price, 0);
//     const finalPrice = price * quantity;
//     // let serviceType;
//     // const serviceIdStr = product.serviceId.toString();
//     // Match serviceId with serviceType for food and grocery
//     // if (serviceIdStr === '67ecc79120a93fc0b92a8b19') {
//     //   serviceType = 'food';
//     // } else if (serviceIdStr === '67ecc79a20a93fc0b92a8b1b') {
//     //   serviceType = 'grocery';
//     // }

//     // Find existing cart
//     let cart = await newCart.findOne({
//       userId,
//       status: 'active'
//       // serviceType: user.serviceType
//     });

//     if (!cart) {
//       // If cart doesn't exist, create one
//       cart = new newCart({
//         userId,
//         // serviceType: serviceType,
//         shops: [
//           {
//             shopId,
//             vendorId,
//             items: [
//               {
//                 productId,
//                 price,
//                 quantity,
//                 // toppings,
//                 finalPrice
//               }
//             ]
//           }
//         ]
//       });
//     } else {
//       // Check if shop group exists
//       const shopGroup = cart.shops.find((s) => s.shopId.equals(shopId));
//       if (shopGroup) {
//         // Check if product already exists in the shop group
//         const existingItem = shopGroup.items.find((item) => item.productId.equals(productId));

//         if (existingItem) {
//           // If product exists, update quantity and finalPrice
//           existingItem.quantity += quantity;
//           existingItem.finalPrice += finalPrice;
//         } else {
//           // Add item to existing shop group
//           shopGroup.items.push({
//             productId,
//             price,
//             quantity,
//             finalPrice
//           });
//         }
//       } else {
//         // Add new shop group
//         cart.shops.push({
//           shopId,
//           vendorId,
//           items: [{ productId, price, quantity, finalPrice }]
//         });
//       }
//     }

//     await cart.save();
//     return res.status(200).json({ success: true, message: 'Item added to cart', cart });
//   } catch (error) {
//     console.error('AddToCart Error:', error);
//     return res.status(500).json({ success: false, message: 'Server error', error: error.message });
//   }
// };
