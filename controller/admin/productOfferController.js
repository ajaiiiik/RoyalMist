// ================================================================
// controller/admin/productOfferController.js
// ================================================================
const Product  = require("../../model/productSchema");
const Category = require("../../model/categorySchema");

const PER_PAGE = 12;

// ── GET /admin/product-offer ─────────────────────────────────────
const getProductOfferController = async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const filter = req.query.filter || "all"; // all | active | inactive

    const query = { isDeleted: false, isActive: true };
    if (search) query.name = { $regex: search, $options: "i" };
    if (filter === "active")   query["offer.isActive"] = true;
    if (filter === "inactive") query["offer.isActive"] = { $ne: true };

    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean();

    const stats = {
      total:        await Product.countDocuments({ isDeleted: false, isActive: true }),
      withOffer:    await Product.countDocuments({ isDeleted: false, isActive: true, "offer.isActive": true }),
      withoutOffer: await Product.countDocuments({ isDeleted: false, isActive: true, "offer.isActive": { $ne: true } }),
    };

    res.render("admin/productOffer", {
      products,
      currentPage: page,
      totalPages:  Math.ceil(total / PER_PAGE),
      total,
      filters: { search, filter },
      stats,
    });
  } catch (err) {
    console.error("Product offer error:", err);
    res.status(500).send("Server error");
  }
};

// ── POST /admin/product-offer/:id ────────────────────────────────
const setProductOfferController = async (req, res) => {
  try {
    const { discountType, discountValue, offerLabel, startDate, endDate, isActive } = req.body;

    if (!discountType || !discountValue) {
      return res.json({ success: false, message: "Discount type and value are required" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.json({ success: false, message: "Product not found" });

    product.offer = {
      discountType,
      discountValue: Number(discountValue),
      offerLabel:    offerLabel || "",
      startDate:     startDate  ? new Date(startDate)  : null,
      endDate:       endDate    ? new Date(endDate)     : null,
      isActive:      isActive === "true" || isActive === true,
    };

    await product.save();
    res.json({ success: true, message: "Product offer updated successfully" });
  } catch (err) {
    console.error("Set product offer error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

// ── PATCH /admin/product-offer/:id/toggle ────────────────────────
const toggleProductOfferController = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.json({ success: false, message: "Product not found" });

    if (!product.offer || !product.offer.discountValue) {
      return res.json({ success: false, message: "No offer set for this product" });
    }

    product.offer.isActive = !product.offer.isActive;
    await product.save();
    res.json({ success: true, isActive: product.offer.isActive, message: `Offer ${product.offer.isActive ? "activated" : "deactivated"}` });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

// ── DELETE /admin/product-offer/:id ──────────────────────────────
const removeProductOfferController = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, {
      $set: { offer: { discountType: null, discountValue: 0, offerLabel: "", startDate: null, endDate: null, isActive: false } }
    });
    res.json({ success: true, message: "Offer removed successfully" });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

// ── GET /admin/product-offer/:id (for edit modal) ────────────────
const getProductOfferByIdController = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select("name offer volumes").lean();
    if (!product) return res.json({ success: false });
    res.json({ success: true, product });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getProductOfferController,
  setProductOfferController,
  toggleProductOfferController,
  removeProductOfferController,
  getProductOfferByIdController,
};
