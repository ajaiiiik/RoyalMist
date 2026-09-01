// ================================================================
// controller/admin/couponController.js
// ================================================================
const Coupon = require("../../model/couponSchema");

const PER_PAGE = 10;

// ── GET /admin/coupons ───────────────────────────────────────────
const getCouponsController = async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const search = req.query.search || "";

    const query = {};
    if (search) query.code = { $regex: search.toUpperCase(), $options: "i" };

    const total   = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean();

    const now = new Date();
    const stats = {
      total:   await Coupon.countDocuments({}),
      active:  await Coupon.countDocuments({ isActive: true, expiryDate: { $gt: now } }),
      expired: await Coupon.countDocuments({ expiryDate: { $lte: now } }),
      used:    await Coupon.countDocuments({ totalUsed: { $gt: 0 } }),
    };

    res.render("admin/coupons", {
      coupons,
      currentPage: page,
      totalPages:  Math.ceil(total / PER_PAGE),
      total,
      filters: { search },
      stats,
    });
  } catch (err) {
    console.error("Get coupons error:", err);
    res.status(500).send("Server error");
  }
};

// ── POST /admin/coupons/add ──────────────────────────────────────
const addCouponController = async (req, res) => {
  try {
    const {
      code, description, discountType, discountValue,
      maxDiscount, minOrderAmount, usageLimit, perUserLimit, expiryDate,
    } = req.body;

    if (!code || !discountType || !discountValue || !expiryDate) {
      return res.json({ success: false, message: "All required fields must be filled" });
    }

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) return res.json({ success: false, message: "Coupon code already exists" });

    const coupon = new Coupon({
      code:           code.trim().toUpperCase(),
      description:    description || "",
      discountType,
      discountValue:  Number(discountValue),
      maxDiscount:    maxDiscount ? Number(maxDiscount) : null,
      minOrderAmount: Number(minOrderAmount) || 0,
      usageLimit:     usageLimit ? Number(usageLimit) : null,
      perUserLimit:   Number(perUserLimit) || 1,
      expiryDate:     new Date(expiryDate),
      isActive:       true,
    });

    await coupon.save();
    res.json({ success: true, message: "Coupon created successfully" });
  } catch (err) {
    console.error("Add coupon error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

// ── POST /admin/coupons/edit/:id ─────────────────────────────────
const editCouponController = async (req, res) => {
  try {
    const {
      code, description, discountType, discountValue,
      maxDiscount, minOrderAmount, usageLimit, perUserLimit, expiryDate,
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.json({ success: false, message: "Coupon not found" });

    // Check code uniqueness if changed
    if (code.trim().toUpperCase() !== coupon.code) {
      const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
      if (existing) return res.json({ success: false, message: "Coupon code already exists" });
    }

    coupon.code           = code.trim().toUpperCase();
    coupon.description    = description || "";
    coupon.discountType   = discountType;
    coupon.discountValue  = Number(discountValue);
    coupon.maxDiscount    = maxDiscount ? Number(maxDiscount) : null;
    coupon.minOrderAmount = Number(minOrderAmount) || 0;
    coupon.usageLimit     = usageLimit ? Number(usageLimit) : null;
    coupon.perUserLimit   = Number(perUserLimit) || 1;
    coupon.expiryDate     = new Date(expiryDate);

    await coupon.save();
    res.json({ success: true, message: "Coupon updated successfully" });
  } catch (err) {
    console.error("Edit coupon error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

// ── PATCH /admin/coupons/toggle/:id ─────────────────────────────
const toggleCouponController = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.json({ success: false, message: "Coupon not found" });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, isActive: coupon.isActive, message: `Coupon ${coupon.isActive ? "activated" : "deactivated"}` });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

// ── DELETE /admin/coupons/delete/:id ────────────────────────────
const deleteCouponController = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

// ── GET /admin/coupons/:id (for edit modal) ──────────────────────
const getCouponByIdController = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) return res.json({ success: false, message: "Not found" });
    res.json({ success: true, coupon });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getCouponsController,
  addCouponController,
  editCouponController,
  toggleCouponController,
  deleteCouponController,
  getCouponByIdController,
};
