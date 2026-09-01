const Review  = require("../../model/reviewSchema");
const Product = require("../../model/productSchema");

// ── Submit review ────────────────────────────────────────────
const submitReviewService = async (productId, userId, rating, comment) => {

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    isDeleted: false,
  });
  if (!product) throw { message: "Product not found" };

  const ratingNum = parseInt(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    throw { message: "Please select a rating (1-5)" };
  }

  if (!comment || comment.trim().length < 5) {
    throw { message: "Review must be at least 5 characters" };
  }

  const existing = await Review.findOne({ product: productId, user: userId });
  if (existing) throw { message: "You have already reviewed this product" };

  const review = await Review.create({
    product: productId,
    user:    userId,
    rating:  ratingNum,
    comment: comment.trim(),
  });

  return review;
};

// ── Delete review ────────────────────────────────────────────
const deleteReviewService = async (productId, userId) => {
  await Review.findOneAndDelete({ product: productId, user: userId });
  return { message: "Review deleted" };
};

// ── Get reviews for product details page ─────────────────────
const getProductReviewsService = async (productId, userId) => {

  const reviews = await Review.find({
    product:   productId,
    isDeleted: false,
  })
  .populate("user", "firstName lastName")
  .sort({ createdAt: -1 })
  .lean();

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
    : 0;

  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    ratingBreakdown[r.rating] = (ratingBreakdown[r.rating] || 0) + 1;
  });

  const userReview = userId
  ? reviews.find(r => r.user && r.user._id && r.user._id.toString() === userId.toString())
  : null;

  return { reviews, totalReviews, avgRating, ratingBreakdown, userReview };
};

// ── Get ratings for shop listing page ────────────────────────
const getProductsRatingService = async (productIds) => {
  const ratings = await Review.aggregate([
    { $match: { product: { $in: productIds }, isDeleted: false } },
    { $group: { 
        _id: "$product", 
        avgRating:    { $avg: "$rating" }, 
        totalReviews: { $sum: 1 } 
    }},
  ]);

  const ratingMap = {};
  ratings.forEach(r => { ratingMap[r._id.toString()] = r; });
  return ratingMap;
};

module.exports = {
  submitReviewService,
  deleteReviewService,
  getProductReviewsService,
  getProductsRatingService,
};