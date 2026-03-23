const User = require("../../model/userSchema");
const bcrypt = require("bcryptjs");
const Otp = require("../../model/otpSchema")
const sendOtp = require("../../utils/generateOtp");

const signupService = async (data,req) => {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    confirmPassword,
    referralCode
  } = data;

  const errors = {};

  //VALIDATION
  if (!firstName) errors.firstName = "First name is required";
  if (!lastName) errors.lastName = "Last name is required";

  const emailRegex = /\S+@\S+\.\S+/;
  if (!email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(email)) {
    errors.email = "Invalid email format";
  } else if (email !== email.toLowerCase()) {
    errors.email = "Email must be lowercase";
  }

if (!phoneNumber) {
  errors.phoneNumber = "Phone number is required";
} else if (!/^\d+$/.test(phoneNumber)) {
  errors.phoneNumber = "Phone number must contain only numbers";
} else if (phoneNumber.length !== 10) {
  errors.phoneNumber = "Phone number must be exactly 10 digits";
}

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

if (!password) {
  errors.password = "Password is required";
} else if (!passwordRegex.test(password)) {
  errors.password =
    "Password must contain uppercase, lowercase, number & special character";
}

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm password is required";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  // IF ANY ERROR
  if (Object.keys(errors).length > 0) {
    throw errors;
  }

  //CHECK USER EXISTS
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { email: "User already exists" };
  }
// GENERATE OTP

// Generate OTP
const otpCode = Math.floor(100000 + Math.random() * 900000);

// Save OTP in DB
const otpEntry = new Otp({ email, otp: otpCode.toString()});
await otpEntry.save();
req.session.userData = { firstName, lastName, email, phoneNumber, password, referralCode };
req.session.otpExpiry = Date.now() + 2 * 60 * 1000;

// Send OTP
console.log("OTP:", otpCode);

sendOtp(email, otpCode)
  .then(() => console.log("OTP sent successfully"))
  .catch(err => console.log("Failed to send OTP", err));

// Store user data temporarily in session



return { message: "OTP sent successfully" };
}
 

//signin
const signinService = async (data) => {
  const { email, password } = data;
  const errors = {};

  // VALIDATION
  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";

  if (Object.keys(errors).length > 0) {
    throw errors;
  }

  // FIND USER
  const user = await User.findOne({ email });
  if (!user) {
    throw { email: "User not found" };
  }

  // CHECK PASSWORD
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { password: "Incorrect password" };
  }

  return {
    message: "Signin successful",
    user: { id: user._id, firstName: user.firstName, email: user.email } // optional
  };
};



const verifyOtpService = async (data,req)=>{
  let {otp} = data
  otp=otp.toString().trim()

const userData = req.session.userData;

  if (!userData) throw { otp: "Session expired. Please signup again." };

  // Get OTP from DB
  const otpRecord = await Otp.findOne({ email: userData.email }).sort({ createdAt: -1 });
  if (!otpRecord) throw { otp: "OTP expired. Request a new one." };

  if (otp.trim() !== otpRecord.otp) throw { otp: "Invalid OTP" };
  if (Date.now() > req.session.otpExpiry) throw { otp: "OTP expired" };

  // Hash password and save user
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  await User.create({ ...userData, password: hashedPassword });

  // Delete OTP after successful verification
  await Otp.deleteMany({ email: userData.email });

  // Clear session
  req.session.userData = null;
  req.session.otpExpiry = null;

  return { message: "Signup successful" };
};

const resendOtpService = async (req) => {
  const userData = req.session.userData;
  if (!userData) throw { otp: "Session expired. Please signup again." };

  // Delete old OTPs
  await Otp.deleteMany({ email: userData.email });

  // Generate new OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  await Otp.create({ email: userData.email, otp: otpCode });

  // Send OTP
  const isSent = await sendOtp(userData.email, otpCode);
  if (!isSent) throw { otp: "Failed to resend OTP" };

  req.session.otpExpiry = Date.now() + 2 * 60 * 1000;
  return { success:true, message: "OTP resent successfully" };
};

module.exports = { signupService, signinService,verifyOtpService, resendOtpService};  