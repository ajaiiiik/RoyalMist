const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product:    { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name:       { type: String, required: true },
  image:      { type: String, default: "" },
  size:       { type: String, required: true },
  price:      { type: Number, required: true },
  quantity:   { type: Number, required: true },
  itemStatus: {                              // ← ADD THIS
    type: String,
    enum: ["active", "cancelled", "return_requested", "returned"],
    default: "active"
  },
   cancelReason:      { type: String, default: "" },
  returnReason:      { type: String, default: "" },
  refundAmount:      { type: Number, default: 0  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    shippingAddress: {
      fullName:     { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: "" },
      city:         { type: String, required: true },
      state:        { type: String, required: true },
      country:      { type: String, default: "IN" },
      zipCode:      { type: String, required: true },
      addressType:  { type: String, default: "home" },
    },
    paymentMethod:  { type: String, enum: ["COD","Razorpay","Wallet"], default: "COD" },
    paymentStatus:  { type: String, enum: ["Pending","Paid","Failed","Refunded"], default: "Pending" },
    orderStatus:    { type: String, enum: ["Pending","Processing","Shipped","Delivered","Cancelled","Return Requested"], default: "Pending" },
    totalAmount:    { type: Number, required: true },
    serviceFee:     { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    discount:       { type: Number, default: 0 },
    grandTotal:     { type: Number, required: true },
    couponCode:     { type: String, default: null },
    cancelReason:   { type: String, default: "" },
    deliveredAt:    { type: Date },
    cancelledAt:    { type: Date },
    returnRequested: { type: Boolean, default: false },
returnReason:    { type: String,  default: "" },
returnStatus:    { type: String,  default: "Requested" },
  },
  { timestamps: true }
);

orderSchema.pre("save", function () {
  if (!this.orderId) {
    const year   = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    this.orderId = `RM-${year}-${random}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);
