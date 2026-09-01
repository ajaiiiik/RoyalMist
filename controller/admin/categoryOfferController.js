// ================================================================
// controller/admin/categoryOfferController.js
// ================================================================
const Category = require("../../model/categorySchema");
const Product  = require("../../model/productSchema");

// ── GET /admin/category-offer ────────────────────────────────────
const getCategoryOfferController = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 }).lean();

    // Get product count per category
    for (const cat of categories) {
      cat.productCount = await Product.countDocuments({ category: cat._id, isDeleted: false, isActive: true });
    }

    const stats = {
      total:     categories.length,
      withOffer: categories.filter(c => c.offer?.isActive).length,
    };

    res.render("admin/categoryOffer", { categories, stats });
  } catch (err) {
    console.error("Category offer error:", err);
    res.status(500).send("Server error");
  }
};

// ── POST /admin/category-offer/:id ──────────────────────────────
const setCategoryOfferController = async (req, res) => {
  try {
    const { discountType, discountValue, offerLabel, startDate, endDate, isActive } = req.body;

    if (!discountType || !discountValue) {
      return res.json({ success: false, message: "Discount type and value are required" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) return res.json({ success: false, message: "Category not found" });

    category.offer = {
      discountType,
      discountValue: Number(discountValue),
      offerLabel:    offerLabel || "",
      startDate:     startDate  ? new Date(startDate)  : null,
      endDate:       endDate    ? new Date(endDate)     : null,
      isActive:      isActive === "true" || isActive === true,
    };

    await category.save();
    res.json({ success: true, message: "Category offer updated successfully" });
  } catch (err) {
    console.error("Set category offer error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

// ── PATCH /admin/category-offer/:id/toggle ───────────────────────
const toggleCategoryOfferController = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.json({ success: false, message: "Category not found" });

    if (!category.offer || !category.offer.discountValue) {
      return res.json({ success: false, message: "No offer set for this category" });
    }

    category.offer.isActive = !category.offer.isActive;
    await category.save();
    res.json({ success: true, isActive: category.offer.isActive, message: `Offer ${category.offer.isActive ? "activated" : "deactivated"}` });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

// ── DELETE /admin/category-offer/:id ────────────────────────────
const removeCategoryOfferController = async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, {
      $set: { offer: { discountType: null, discountValue: 0, offerLabel: "", startDate: null, endDate: null, isActive: false } }
    });
    res.json({ success: true, message: "Category offer removed" });
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
};

// ── GET /admin/category-offer/:id ───────────────────────────────
const getCategoryOfferByIdController = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).select("name offer").lean();
    if (!category) return res.json({ success: false });
    res.json({ success: true, category });
  } catch (err) {
    res.json({ success: false });
  }
};

module.exports = {
  getCategoryOfferController,
  setCategoryOfferController,
  toggleCategoryOfferController,
  removeCategoryOfferController,
  getCategoryOfferByIdController,
};
