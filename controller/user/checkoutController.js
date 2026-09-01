// ================================================================
// controller/user/checkoutController.js9

const Cart    = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order   = require("../../model/orderSchema");
const User    = require("../../model/userSchema");
const Coupon  = require("../../model/couponSchema");
const Wallet  = require("../../model/walletSchema");
const Razorpay = require("razorpay");
const crypto   = require("crypto");

const sendOrderConfirmation = require("../../utils/sendOrderConfirmation");

const SERVICE_FEE_PERCENT = 2;
const SERVICE_FEE_CAP     = 99;

const calcServiceFee = (subtotal) =>
  Math.min(Math.round((subtotal * SERVICE_FEE_PERCENT) / 100), SERVICE_FEE_CAP);

// ── Razorpay instance

// ── GET /checkout ────────────────────────────────────────────────
const getCheckoutController = async (req, res) => {
  try {
    const userId    = req.session.user.id;
    const user      = req.session.user;
    const couponCode = req.query.coupon || null;

    // Cart
   const cart = await Cart.findOne({ user: userId }).populate({
  path: "items.product",
  select: "name images volumes isActive isDeleted fragranceType category",
  // ← removed stock, volumes already has stock inside!
      populate: { path: "category", select: "name" },
    });

    if (!cart || cart.items.length === 0) return res.redirect("/cart");

    const validItems = cart.items.filter(item => {
  if (!item.product || !item.product.isActive || item.product.isDeleted) 
    return false;
  const vol = item.product.volumes?.find(v => v.size === item.size);
  return vol && vol.stock > 0;
});
    if (validItems.length === 0) return res.redirect("/cart");

    // User addresses
    const userDoc = await User.findById(userId).select("addresses");

    // Wallet balance
    const wallet = await Wallet.findOne({ user: userId });
    const walletBalance = wallet ? wallet.balance : 0;

    const totalAmount    = validItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const serviceFee     = calcServiceFee(totalAmount);
    const deliveryCharge = totalAmount >= 1999 ? 0 : 99;

    // Apply coupon if passed from cart
    let discount = 0;
    let validCouponCode = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && new Date() <= coupon.expiryDate && totalAmount >= coupon.minOrderAmount) {
        if (coupon.discountType === "percentage") {
          discount = Math.round((totalAmount * coupon.discountValue) / 100);
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else {
          discount = coupon.discountValue;
        }
        discount = Math.min(discount, totalAmount);
        validCouponCode = coupon.code;
      }
    }

    const grandTotal = totalAmount + serviceFee + deliveryCharge - discount;

    res.render("user/checkout", {
      user,
      cartItems:     validItems,
      addresses:     userDoc.addresses || [],
      totalAmount,
      serviceFee,
      deliveryCharge,
      discount,
      grandTotal,
      couponCode:    validCouponCode,
      walletBalance,
    });

  } catch (err) {
    console.error("Get checkout error:", err);
    res.status(500).send("Server error");
  }
};

// ── POST /checkout/razorpay-order ────────────────────────────────
const createRazorpayOrderController = async (req, res) => {
  try {
    const userId = req.session.user.id;

   const cart = await Cart.findOne({ user: userId }).populate({
  path: "items.product",
  select: "name images volumes isActive isDeleted",
});

    if (!cart || cart.items.length === 0)
      return res.json({ success: false, message: "Cart is empty" });

    const validItems = cart.items.filter(i => {
  if (!i.product || !i.product.isActive || i.product.isDeleted) 
    return false;
  const vol = i.product.volumes?.find(v => v.size === i.size);
  return vol && vol.stock > 0;
});

    const totalAmount    = validItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
const serviceFee     = calcServiceFee(totalAmount);
const deliveryCharge = totalAmount >= 1999 ? 0 : 99;

// Apply coupon discount if present in query params
let discount = 0;
const couponCode = req.query.coupon || null;
if (couponCode) {
  const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
  if (coupon && new Date() <= coupon.expiryDate && totalAmount >= coupon.minOrderAmount) {
    if (coupon.discountType === "percentage") {
      discount = Math.round((totalAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }
    discount = Math.min(discount, totalAmount);
  }
}

const amount = totalAmount + serviceFee + deliveryCharge - discount;

if (!amount || amount <= 0)
  return res.json({ success: false, message: "Invalid amount" });

    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: "INR",
      receipt:  "receipt_" + Date.now(),
    });

    return res.json({
      success:         true,
      razorpayOrderId: order.id,
      amount:          order.amount,
      key:             process.env.RAZORPAY_KEY_ID,
    });

  } catch (err) {
    console.error("Razorpay order error:", err);
    res.json({ success: false, message: "Payment initialization failed" });
  }
};

// ── POST /checkout/place-order ───────────────────────────────────
const placeOrderController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { addressIndex, paymentMethod = "COD", couponCode, razorpayData } = req.body;

    // 1. User + address
   const userDoc = await User.findById(userId);
    if (!userDoc) return res.json({ success: false, message: "User not found" });
    const parsedIndex = parseInt(addressIndex);
    if (isNaN(parsedIndex)) return res.json({ success: false, message: "Invalid address selected" });
    const address = userDoc.addresses[parsedIndex];
    if (!address) return res.json({ success: false, message: "Invalid address selected" });


    // 2. Cart
    const cart = await Cart.findOne({ user: userId }).populate({
  path: "items.product",
  select: "name images volumes isActive isDeleted",
});
    if (!cart || cart.items.length === 0) return res.json({ success: false, message: "Cart is empty" });

   // 3. Validate stock
for (const item of cart.items) {
  const prod = item.product;
  if (!prod || !prod.isActive || prod.isDeleted)
    return res.json({ success: false, message: `"${prod?.name || "A product"}" is no longer available.` });

  // ← Find stock for this specific size/volume
  const volume = prod.volumes?.find(v => v.size === item.size);
  const availableStock = volume ? volume.stock : 0;

  if (availableStock < item.quantity)
    return res.json({ success: false, message: `Only ${availableStock} unit(s) of "${prod.name}" (${item.size}) available.` });
}

    // 4. Verify Razorpay signature if online payment
    if (paymentMethod === "Razorpay") {
      if (!razorpayData) return res.json({ success: false, message: "Payment verification failed" });
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = razorpayData;
      const expectedSig = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      if (expectedSig !== razorpaySignature)
        return res.json({ success: false, message: "Payment verification failed. Please contact support." });
    }

    // 5. Build order items
    const orderItems = cart.items.map((item) => ({
      product:  item.product._id,
      name:     item.product.name,
      image:    item.product.images?.[0] || "",
      size:     item.size,
      price:    item.price,
      quantity: item.quantity,
    }));

    const totalAmount    = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const serviceFee     = calcServiceFee(totalAmount);
    const deliveryCharge = totalAmount >= 1999 ? 0 : 99;

    // 6. Apply coupon
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && new Date() <= coupon.expiryDate) {
        if (coupon.discountType === "percentage") {
          discount = Math.round((totalAmount * coupon.discountValue) / 100);
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else {
          discount = coupon.discountValue;
        }
        discount = Math.min(discount, totalAmount);

        // Mark coupon used
        const userUsage = coupon.usedBy.find((u) => u.user.toString() === userId.toString());
        if (userUsage) { userUsage.count += 1; }
        else { coupon.usedBy.push({ user: userId, count: 1 }); }
        coupon.totalUsed += 1;
        await coupon.save();
      }
    }

    const grandTotal = totalAmount + serviceFee + deliveryCharge - discount;

    // 7. Wallet payment — check & debit
    if (paymentMethod === "Wallet") {
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet || wallet.balance < grandTotal)
        return res.json({ success: false, message: "Insufficient wallet balance" });

      wallet.balance -= grandTotal;
      wallet.transactions.push({
        type:        "debit",
        amount:      grandTotal,
        description: "Order payment",
      });
      await wallet.save();
    }

    // 8. Create order
    const order = new Order({
      user:    userId,
      items:   orderItems,
      shippingAddress: {
        fullName:     address.fullName,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        city:         address.city,
        state:        address.state,
        country:      address.country || "IN",
        zipCode:      address.zipCode,
        addressType:  address.addressType || "home",
      },
      paymentMethod,
      paymentStatus:  paymentMethod === "COD" ? "Pending" : "Paid",
      orderStatus:    "Pending",
      totalAmount,
      serviceFee,
      deliveryCharge,
      discount,
      grandTotal,
    });

    await order.save();

    // 9. Reduce stock
   // 9. Reduce stock per variant
for (const item of cart.items) {
  await Product.findOneAndUpdate(
    { 
      _id: item.product._id,
      "volumes.size": item.size  // ← find exact volume
    },
    { 
      $inc: { "volumes.$.stock": -item.quantity } // ← reduce that volume stock
    }
  );
}

   // 10. Clear cart
    cart.items = [];
    await cart.save();

    // 11. Send confirmation email
    const freshUser = await User.findById(userId).select("email firstName");
    if (freshUser) {
      sendOrderConfirmation(freshUser.email, order, freshUser.firstName).catch(err =>
        console.log("Email error (non-blocking):", err.message)
      );
    }

return res.json({ success: true, orderId: order.orderId, message: "Order placed successfully" });

  } catch (err) {
    console.error("Place order error:", err.message);
    console.error("Stack trace:", err.stack);
    res.json({ success: false, message: err.message || "Server error. Please try again." });
  }
};

// ── GET /order-success ───────────────────────────────────────────
const getOrderSuccessController = async (req, res) => {
  try {
    const { orderId } = req.query;
    const user  = req.session.user;
    const order = await Order.findOne({ orderId, user: req.session.user.id });
    if (!order) return res.redirect("/home");
    res.render("user/orderSuccess", { user, order });
  } catch (err) {
    console.error("Order success error:", err);
    res.redirect("/home");
  }
};

module.exports = {
  getCheckoutController,
  createRazorpayOrderController,
  placeOrderController,
  getOrderSuccessController,
};
