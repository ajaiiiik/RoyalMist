const Wishlist = require("../../model/wishlistSchema");
const Product  = require("../../model/productSchema");
const Cart     = require("../../model/cartSchema");

const MAX_QUANTITY = 5;

// ── Add to wishlist ──────────────────────────────────────────────
const addToWishlistService = async (userId, productId) => {
  const product = await Product.findOne({
    _id: productId, isActive: true, isDeleted: false,
  });
  if (!product) throw { message: "Product not available" };

  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) wishlist = new Wishlist({ user: userId, items: [] });

  const exists = wishlist.items.some(
    item => item.product.toString() === productId.toString()
  );
  if (exists) throw { message: "Already in wishlist" };

  wishlist.items.push({ product: productId });
  await wishlist.save();

  return { message: "Added to wishlist", totalItems: wishlist.items.length };
};

// ── Remove from wishlist ─────────────────────────────────────────
const removeFromWishlistService = async (userId, productId) => {
  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) return { message: "Wishlist not found", totalItems: 0 };

  wishlist.items = wishlist.items.filter(
    item => item.product.toString() !== productId.toString()
  );
  await wishlist.save();

  return { message: "Removed from wishlist", totalItems: wishlist.items.length };
};

// ── Get wishlist ─────────────────────────────────────────────────
const getWishlistService = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId })
    .populate({
      path: "items.product",
      select: "name images volumes stock isActive isDeleted fragranceType category",
      populate: { path: "category", select: "name" },
    });

  if (!wishlist) return { items: [], totalItems: 0 };

  const validItems = wishlist.items.filter(
    item => item.product && item.product.isActive && !item.product.isDeleted
  );

  return { items: validItems, totalItems: validItems.length };
};

// ── Move to cart ─────────────────────────────────────────────────
const moveToCartService = async (userId, productId) => {
  const product = await Product.findOne({
    _id: productId, isActive: true, isDeleted: false,
  });
  if (!product) throw { message: "Product not available" };
 const allOut = !product.volumes || product.volumes.length === 0 ||
  product.volumes.every(v => v.stock === 0);
if (allOut) throw { message: "Product is out of stock" };
 


  const size  = product.volumes[0].size;
const price = product.volumes[0].price;
const stock = product.volumes[0].stock;
if (stock === 0) throw { message: "This variant is out of stock" };

  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = new Cart({ user: userId, items: [] });

  const existingIndex = cart.items.findIndex(
    i => i.product.toString() === productId.toString() && i.size === size
  );

  // ── Already in cart → just say so, don't touch wishlist ─────
  if (existingIndex > -1) {
    return { alreadyInCart: true };
  }

  // ── New → add to cart, remove from wishlist ──────────────────
  cart.items.push({ product: productId, size, price, quantity: 1 });
  await cart.save();

  const wishlist = await Wishlist.findOne({ user: userId });
  if (wishlist) {
    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId.toString()
    );
    await wishlist.save();
  }

  return {
    alreadyInCart: false,
    totalItems: wishlist ? wishlist.items.length : 0,
  };
};

module.exports = {
  addToWishlistService,
  removeFromWishlistService,
  getWishlistService,
  moveToCartService,
};