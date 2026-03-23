const User = require("../../model/userSchema");
const bcrypt = require("bcryptjs");

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
const otp = Math.floor(100000 + Math.random() * 900000);

//SEND OTP
const sendOtp = require("../../utils/generateOtp");
const isSent = await sendOtp(email, otp);

if (!isSent) {
  throw { email: "Failed to send OTP" };
}

//STORE IN SESSION
req.session.otp = otp;
req.session.otpExpiry = Date.now() + 2 * 60 * 1000;
req.session.userData = {
  firstName,
  lastName,
  email,
  phoneNumber,
  password,
  referralCode
};

console.log("OTP:", otp);

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
  const {otp} = data


  if(!req.session.otp || !req.session.userData){
    throw {otp: "Session expired.Please signup  again"}
  }

   if (Date.now() > req.session.otpExpiry) {
    req.session.otp = null
    req.session.userData=null
    req.session.otpExpiry=null
    throw { otp: "OTP expired" };
  }
  if(Number(otp)!==req.session.otp){
    throw {otp:"Invalid OTP"}
  }
  const userData = req.session.userData;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password,salt)
    try {
    const newUser = await User.create({
      ...userData,
      password: hashedPassword
    });

    console.log("User saved to DB:", newUser._id);

    // session clear
    req.session.otp = null;
    req.session.userData = null;

    return { message: "Signup successful" };
  } catch (err) {
    console.error("DB save error:", err);
    throw { general: "Failed to save user. Try again." };
  }
};

const resendOtpService = async (req) => {

  if (!req.session.userData) {
    throw { otp: "Session expired. Please signup again" };
  }
 const email = req.session.userData.email;

  const otp = Math.floor(100000 + Math.random() * 900000);

  req.session.otp = otp;
  req.session.otpExpiry = Date.now() + 2 * 60 * 1000;

 

  const sendOtp = require("../../utils/generateOtp");
  const isSent = await sendOtp(email, otp);

  if (!isSent) {
    throw { otp: "Failed to resend OTP" };
  }
 

  return { message: "OTP resent successfully" };
};



module.exports = { signupService, signinService,verifyOtpService, resendOtpService};  