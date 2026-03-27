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

  const emailNormalized = email.trim().toLowerCase();
  const errors = {};

  //VALIDATION
  if (!firstName) errors.firstName = "First name is required";
  if (!lastName) errors.lastName = "Last name is required";

  const emailRegex =  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(email)) {
    errors.email = "Invalid email format";
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

  //any error handle
  if (Object.keys(errors).length > 0) {
    throw errors;
  }

  if (req.session.isSignupInProgress ){
    if(!req.session.userData || Date.now() > req.session.otpExpiry) {
      // Previous signup expired, reset session
      req.session.isSignupInProgress = false;
      req.session.userData = null;
       req.session.otpAttempts = 0;
    req.session.otpExpiry = null;
  }
  else {
    // Active session — block
    throw { otp: "Signup already in progress. Check your email for OTP." };
  }
}

  const existingUser = await User.findOne({ email:emailNormalized });
  if (existingUser) {
    throw { email: "User already exists" };
  }


  try{
  req.session.isSignupInProgress = true;



//generate OTP
const otpCode = Math.floor(100000 + Math.random() * 900000);

await Otp.deleteMany({ email:emailNormalized});


// Save OTP in db
const hashedOtp = await bcrypt.hash(otpCode.toString(), 10);

await Otp.create({
  email: emailNormalized,
  otp: hashedOtp,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000)
});

const hashedTempPassword = await bcrypt.hash(password, 10);
req.session.userData = { firstName, lastName, email :emailNormalized, phoneNumber, password:hashedTempPassword, referralCode:referralCode || null };
req.session.otpExpiry = Date.now() + 5* 60 * 1000;


await new Promise((resolve, reject) => {
        req.session.save((err) => {
            if (err) return reject(err);
            else resolve();
        });
    });


 const isSent = await sendOtp(emailNormalized, otpCode);
  if (!isSent){
    req.session.isSignupInProgress = false;  
    throw { otp: "Failed to send OTP. Check your email settings." };
  }
} catch (err) {
  req.session.isSignupInProgress = false;
  throw err;
}


return { message: "OTP sent successfully" };
}
 

//signin
const signinService = async (data,req) => {
  const { email, password } = data;

  const emailNormalized = email.trim().toLowerCase();
  const errors = {};

  // VALIDATION
  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";

  if (Object.keys(errors).length > 0) {
    throw errors;
  }

  // FIND USER
  const user = await User.findOne({ email:emailNormalized });
  if (!user) {
    throw { email: "User not found" };
  }

  // CHECK PASSWORD
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { password: "Incorrect password" };
  }

   req.session.user = {
    id: user._id,
    firstName: user.firstName,
    email: user.email
  };
    await new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  return {
    message: "Signin successful",
    user: { id: user._id, firstName: user.firstName, email: user.email } // optional
  };
};



const verifyOtpService = async (data,req)=>{

  if (!req.session.userData || Date.now() > req.session.otpExpiry) {
    req.session.isSignupInProgress = false;
    req.session.userData = null;
    req.session.otpAttempts = 0;
    req.session.otpExpiry = null;
    throw { otp: "Session expired. Please signup again." };
}
  const userData = req.session.userData;
  let {otp} = data
  otp=otp.toString().trim()
  if (!/^\d{6}$/.test(otp)) {
  throw { otp: "Invalid OTP format" };
}

  if (!userData) throw { otp: "Session expired. Please signup again." };
  if (!req.session.otpAttempts) {
    req.session.otpAttempts = 0;
  }

  

  if (req.session.otpAttempts >= 5) {
  throw { otp: "Too many attempts. Please resend OTP." };
}
  


// Get OTP from DB
 const otpRecord = await Otp.findOne({ email: userData.email })
  .sort({ createdAt: -1 });
  console.log("OTP from frontend:", otp); 
  console.log("OTP record from DB:", otpRecord);
console.log("Current time:", new Date());

 if (!otpRecord) throw { otp: "OTP not found" };

if (new Date() > otpRecord.expiresAt) {
  throw { otp: "OTP expired. Request a new one." };
}

 const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);
 console.log("OTP valid result:", isValidOtp);

if (!isValidOtp) {
  req.session.otpAttempts += 1;
  throw { otp: "Invalid OTP" };
}

  // Hash password and save user
  let newUser;

try {
  newUser = await User.create(userData);
} catch (err) {
  if (err.code === 11000) {
     req.session.userData = null;           
    req.session.isSignupInProgress = false; 
    req.session.otpAttempts = 0;            
    req.session.otpExpiry = null; 
    throw {otp: "User already exists, please login" };
  }
  throw err;
}
  await Otp.deleteMany({ email: userData.email });

  // Clean session data
  req.session.userData = null;
  req.session.otpAttempts = 0;
  req.session.otpExpiry = null;
  req.session.isSignupInProgress = false;

  req.session.user = {
    id: newUser._id,
    firstName: newUser.firstName,
    email: newUser.email
  };


  await new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  return { message: "Signup successful" };
};



//resend otp
const resendOtpService = async (req) => {
  const userData = req.session.userData;
  if (!userData) throw { otp: "Session expired. Please signup again." };

    req.session.otpAttempts = 0;


  // Delete old OTPs
  await Otp.deleteMany({ email: userData.email});

  // Generate new OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otpCode.toString(), 10);

await Otp.create({
  email: userData.email,
  otp: hashedOtp,
   expiresAt: new Date(Date.now() + 5*  60 * 1000)
});

  // Send OTP
  const isSent = await sendOtp(userData.email, otpCode);
  if (!isSent) throw { otp: "Failed to resend OTP" };

  req.session.otpExpiry = Date.now()+5 * 60 * 1000;
  return { success:true, message: "OTP resent successfully" };
};

module.exports = { signupService, signinService,verifyOtpService, resendOtpService};  