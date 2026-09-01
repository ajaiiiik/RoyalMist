const {
  addToWishlistService,
  removeFromWishlistService,
  getWishlistService,
  moveToCartService,
} = require("../../services/user/wishlistService");

const getWishlistController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user   = req.session.user;
    const { items, totalItems } = await getWishlistService(userId);
    res.render("user/wishlist", { user, wishlistItems: items, totalItems });
  } catch (err) {
    console.error("Get wishlist error:", err);
    res.status(500).send("Server error");
  }
};

const addToWishlistController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId } = req.body;
    if (!productId)
      return res.json({ success: false, message: "Product ID required" });
    const result = await addToWishlistService(userId, productId);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.json({ success: false, message: err.message || "Server error" });
  }
};

const removeFromWishlistController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId } = req.body;
    if (!productId)
      return res.json({ success: false, message: "Product ID required" });
    const result = await removeFromWishlistService(userId, productId);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.json({ success: false, message: err.message || "Server error" });
  }
};

const moveToCartController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId } = req.body;
    if (!productId)
      return res.json({ success: false, message: "Product ID required" });
    const result = await moveToCartService(userId, productId);
    return res.json({
      success: true,
      alreadyInCart: result.alreadyInCart,
      totalItems: result.totalItems,
    });
  } catch (err) {
    return res.json({ success: false, message: err.message || "Server error" });
  }
};

module.exports = {
  getWishlistController,
  addToWishlistController,
  removeFromWishlistController,
  moveToCartController,
};