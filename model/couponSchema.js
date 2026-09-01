const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },

    // Only for percentage — max discount cap
    maxDiscount: {
      type: Number,
      default: null, // null = no cap
    },

    // Minimum cart value to apply coupon
    minOrderAmount: {
      type: Number,
      default: 0,
    },

    // How many times total this coupon can be used (across all users)
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },

    // How many times one user can use this coupon
    perUserLimit: {
      type: Number,
      default: 1,
    },

    // Track which users used this coupon and how many times
    usedBy: [
      {
        user:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 1 },
      },
    ],

    // Total times used across all users
    totalUsed: {
      type: Number,
      default: 0,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
