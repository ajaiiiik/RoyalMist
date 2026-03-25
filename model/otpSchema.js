const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    email: 
    { type: String,
         required: true,
     lowercase:true },
    otp: 
    { type: String,
         required: true },
    },{timestamps:true} );

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 })
otpSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("Otp", otpSchema);