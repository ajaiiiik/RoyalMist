const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {   
    type: Date,
    required: true
  }
}, { timestamps: true });

otpSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("Otp", otpSchema);