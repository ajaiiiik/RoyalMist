// ================================================================
// controller/admin/inventoryController.js
// Stock management per variant (volumes[].stock)
// ================================================================

const Product = require("../../model/productSchema");

const LOW_STOCK_THRESHOLD = 10;
const PER_PAGE = 15;

// ── GET /admin/inventory ─────────────────────────────────────────
const getInventoryController = async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const search = req.query.search         || "";
    const filter = req.query.filter         || "all";
    const sort   = req.query.sort           || "name_asc";

    const query = { isDeleted: false };
    if (search) query.name = { $regex: search, $options: "i" };

    const allProducts = await Product.find(query)
      .populate("category", "name")
      .lean();

    // Filter based on volumes stock
    let filtered = allProducts;
    if (filter === "out") {
      filtered = allProducts.filter(p =>
        !p.volumes || p.volumes.length === 0 ||
        p.volumes.every(v => v.stock === 0)
      );
    } else if (filter === "low") {
      filtered = allProducts.filter(p =>
        p.volumes && p.volumes.some(v => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD) &&
        !p.volumes.every(v => v.stock === 0)
      );
    }

    // Sort
    if (sort === "name_asc")   filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "name_desc")  filtered.sort((a, b) => b.name.localeCompare(a.name));
    if (sort === "stock_asc")  filtered.sort((a, b) => {
      const aStock = (a.volumes || []).reduce((s, v) => s + v.stock, 0);
      const bStock = (b.volumes || []).reduce((s, v) => s + v.stock, 0);
      return aStock - bStock;
    });
    if (sort === "stock_desc") filtered.sort((a, b) => {
      const aStock = (a.volumes || []).reduce((s, v) => s + v.stock, 0);
      const bStock = (b.volumes || []).reduce((s, v) => s + v.stock, 0);
      return bStock - aStock;
    });

    const total    = filtered.length;
    const products = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    // Stats
    const totalProducts = allProducts.length;
    const outOfStock    = allProducts.filter(p =>
      !p.volumes || p.volumes.every(v => v.stock === 0)
    ).length;
    const lowStock = allProducts.filter(p =>
      p.volumes && p.volumes.some(v => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD) &&
      !p.volumes.every(v => v.stock === 0)
    ).length;
    const inStock = totalProducts - outOfStock - lowStock;

    res.render("admin/inventory", {
      products,
      currentPage: page,
      totalPages:  Math.ceil(total / PER_PAGE),
      total,
      filters: { search, filter, sort },
      stats: { totalProducts, outOfStock, lowStock, inStock },
      LOW_STOCK_THRESHOLD,
    });

  } catch (err) {
    console.error("Inventory error:", err);
    res.status(500).send("Server error");
  }
};

// ── PATCH /admin/inventory/:id/stock ────────────────────────────
// Body: { size, stock }  ← per variant update
const updateStockController = async (req, res) => {
  try {
    const { size, stock } = req.body;
    const newStock = parseInt(stock);

    if (!size)
      return res.json({ success: false, message: "Size is required" });
    if (isNaN(newStock) || newStock < 0)
      return res.json({ success: false, message: "Invalid stock value" });

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, "volumes.size": size },
      { $set: { "volumes.$.stock": newStock } },
      { new: true }
    );

    if (!product)
      return res.json({ success: false, message: "Product or size not found" });

    const updatedVol = product.volumes.find(v => v.size === size);

    res.json({
      success: true,
      stock:   updatedVol.stock,
      message: `Stock updated: ${size} → ${updatedVol.stock} units`,
    });
  } catch (err) {
    console.error("Update stock error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

module.exports = { getInventoryController, updateStockController };