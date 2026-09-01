const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    offer: {
      discountType: {
        type: String,
        enum: ["percentage", "flat"],
        default: "percentage",
      },
      discountValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      offerLabel: {
        type: String,
        trim: true,
        default: "",
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);