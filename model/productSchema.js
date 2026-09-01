const mongoose = require('mongoose');

const volumeSchema = new mongoose.Schema({
  size:  { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0, min: 0 }, // ← ADD THIS LINE ONLY
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  fragranceType: {
    type: String,
     enum: ['Citrus', 'Woody', 'Floral', 'Oriental', 'Aquatic', 'Spicy', 'Musky', 'Fresh'],
    required: true,
  },
  volumes: {
    type: [volumeSchema],
    validate: {
      validator: v => v.length >= 1,
      message: 'At least one volume is required.',
    },
  },
  images: {
    type: [String], // Cloudinary URLs
    validate: {
      validator: v => v.length >= 3,
      message: 'Minimum 3 images required.',
    },
  },
  isActive:  { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },

  offer: {
  discountType:  { type: String, enum: ["percentage", "flat"], default: null },
  discountValue: { type: Number, default: 0 },
  offerLabel:    { type: String, default: "" },
  startDate:     { type: Date,   default: null },
  endDate:       { type: Date,   default: null },
  isActive:      { type: Boolean, default: false },
},
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);