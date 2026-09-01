const {
  submitReviewService,
  deleteReviewService,
} = require("../../services/user/reviewService");

// POST /shop/:id/review
const postReviewController = async (req, res) => {
  try {
    const userId    = req.session.user.id;
    const productId = req.params.id;
    const { rating, comment } = req.body;

    const review = await submitReviewService(productId, userId, rating, comment);

    return res.json({
      success: true,
      message: "Review submitted!",
      review: {
        rating:    review.rating,
        comment:   review.comment,
        userName:  req.session.user.firstName,
        createdAt: new Date().toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric"
        }),
      },
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.json({ success: false, message: "Already reviewed" });
    }
    return res.json({ success: false, message: err.message || "Server error" });
  }
};

// DELETE /shop/:id/review
const deleteReviewController = async (req, res) => {
  try {
    const userId    = req.session.user.id;
    const productId = req.params.id;

    await deleteReviewService(productId, userId);
    return res.json({ success: true, message: "Review deleted" });

  } catch (err) {
    return res.json({ success: false, message: err.message || "Server error" });
  }
};

module.exports = { postReviewController, deleteReviewController };