// ================================================================
// controller/user/couponController.js
// ================================================================
const Coupon = require("../../model/couponSchema");

const SERVICE_FEE_PERCENT = 2;   // 2%
const SERVICE_FEE_CAP     = 99;  // max ₹99

// ── Helper: calculate service fee ───────────────────────────────
const calcServiceFee = (subtotal) => {
  const fee = Math.round((subtotal * SERVICE_FEE_PERCENT) / 100);
  return Math.min(fee, SERVICE_FEE_CAP);
};

// ── POST /cart/apply-coupon ──────────────────────────────────────
const applyCouponController = async (req, res) => {
  try {
    const userId   = req.session.user.id;
    const { code, subtotal } = req.body;

    console.log("STEP 1 - REQ BODY:", req.body);

    if (!code) return res.json({ success: false, message: "Enter a coupon code" });

    const searchCode = code.trim().toUpperCase();
    console.log("STEP 2 - SEARCHING FOR CODE:", searchCode);

    const coupon = await Coupon.findOne({ code: searchCode });

    console.log("STEP 3 - COUPON FOUND IN DB:", coupon);

    // ── Validations ──────────────────────────────────────────────
    if (!coupon || !coupon.isActive) {
      return res.json({ success: false, message: "Invalid or expired coupon" });
    }

    // Expiry check
    if (new Date() > new Date(coupon.expiryDate)) {
      return res.json({ success: false, message: "This coupon has expired" });
    }

    // Min order check
    if (subtotal < coupon.minOrderAmount) {
      return res.json({
        success: false,
        message: `Minimum order ₹${coupon.minOrderAmount} required for this coupon`,
      });
    }

    // Total usage limit
    if (coupon.usageLimit !== null && coupon.totalUsed >= coupon.usageLimit) {
      return res.json({ success: false, message: "Coupon usage limit reached" });
    }

    // Per user limit
    const userUsage = coupon.usedBy.find(
      (u) => u.user.toString() === userId.toString()
    );
    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      return res.json({ success: false, message: "You have already used this coupon" });
    }

    // ── Calculate discount ────────────────────────────────────────
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }

    // Discount can't exceed subtotal
    discount = Math.min(discount, subtotal);

    const serviceFee   = calcServiceFee(subtotal);
    const delivery     = subtotal >= 1999 ? 0 : 99;
    const grandTotal   = subtotal + serviceFee + delivery - discount;

    return res.json({
      success:      true,
      discount,
      serviceFee,
      delivery,
      grandTotal,
      couponCode:   coupon.code,
      message:      `Coupon applied! You saved ₹${discount.toLocaleString("en-IN")}`,
    });

  } catch (err) {
    console.error("Apply coupon error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

// ── POST /cart/remove-coupon ─────────────────────────────────────
const removeCouponController = async (req, res) => {
  try {
    const { subtotal } = req.body;
    const serviceFee = calcServiceFee(subtotal);
    const delivery   = subtotal >= 1999 ? 0 : 99;
    const grandTotal = subtotal + serviceFee + delivery;

    return res.json({
      success:    true,
      serviceFee,
      delivery,
      grandTotal,
    }); 
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

module.exports = { applyCouponController, removeCouponController, calcServiceFee };
