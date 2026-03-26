const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim:true
  },
  lastName: {
    type:String,
     required:  function () {
    return this.googleId?false:true
  },
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
    required:  function () {
    return this.googleId ?false:true
  }
  },

  password: {
    type: String,
    required:  function () {
    return this.googleId ?false:true
  }
  },

  referralCode: {
    type: String,
    default: null,
    trim:true
  },
  googleId:{
    type:String
  },

  
role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);