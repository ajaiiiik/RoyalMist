const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim:true
  },
  lastName: {
    type:String,
    required:true,
    trim:true
},
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phoneNumber: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  referralCode: {
    type: String,
    default: null,
    trim:true
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);