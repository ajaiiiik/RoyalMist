const User = require("../../model/userSchema");
const bcrypt = require("bcryptjs");
const Otp = require("../../model/otpSchema");
const sendOtp = require("../../utils/generateOtp");

// SIGNUP SERVICE
const signupService = async (data, req) => {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    confirmPassword,
    referralCode,
  } = data;

  const emailNormalized = email.trim().toLowerCase();
  const errors = {};

  // validate 
  if (!firstName) errors.firstName = "First name is required";
  if (!lastName) errors.lastName = "Last name is required";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

  if (Object.keys(errors).length > 0) throw errors;

  // ── CHECK: Already a verified user in DB ──
  const existingUser = await User.findOne({ email: emailNormalized });
  if (existingUser) {
    throw { email: "User already exists. Please login." };
  }

  const existingPhone = await User.findOne({ phoneNumber: phoneNumber });
if (existingPhone) {
  throw { phoneNumber: "Phone number already exists" };
}

  // ── HANDLE EXISTING IN-PROGRESS SESSION ──
  // If same email is already in progress and not expired → just resend OTP
  if (
    req.session.isSignupInProgress &&
    req.session.userData &&
    req.session.userData.email === emailNormalized &&
    Date.now() < req.session.otpExpiry
  ) {
    // Resend OTP for the same email without blocking
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    await Otp.deleteMany({ email: emailNormalized });

    const hashedOtp = await bcrypt.hash(otpCode.toString(), 10);
    await Otp.create({
      email: emailNormalized,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    req.session.otpExpiry = Date.now() + 5 * 60 * 1000;
    req.session.otpAttempts = 0;

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    const isSent = await sendOtp(emailNormalized, otpCode);
    if (!isSent) throw { otp: "Failed to send OTP. Check your email settings." };

    return { message: "OTP resent to your email" };
  }

  // ── FRESH SIGNUP: Reset any stale session ──
  req.session.isSignupInProgress = false;
  req.session.userData = null;
  req.session.otpAttempts = 0;
  req.session.otpExpiry = null;

  try {
    req.session.isSignupInProgress = true;

    const otpCode = Math.floor(100000 + Math.random() * 900000);
    await Otp.deleteMany({ email: emailNormalized });

    const hashedOtp = await bcrypt.hash(otpCode.toString(), 10);
    await Otp.create({
      email: emailNormalized,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const hashedTempPassword = await bcrypt.hash(password, 10);
    req.session.userData = {
      firstName,
      lastName,
      email: emailNormalized,
      phoneNumber,
      password: hashedTempPassword,
      referralCode: referralCode || null,
    };
    req.session.otpExpiry = Date.now() + 5 * 60 * 1000;
    req.session.otpAttempts = 0;

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    const isSent = await sendOtp(emailNormalized, otpCode);
    if (!isSent) {
      // Rollback session on mail failure
      req.session.isSignupInProgress = false;
      req.session.userData = null;
      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      throw { otp: "Failed to send OTP. Check your email settings." };
    }
  } catch (err) {
    // Only reset if it's NOT our own thrown error object
    if (err && (err.otp || err.email)) throw err;
    req.session.isSignupInProgress = false;
    req.session.userData = null;
    throw err;
  }

  return { message: "OTP sent successfully" };
};

// ─────────────────────────────────────────────
// SIGNIN SERVICE
// ─────────────────────────────────────────────
const signinService = async (data, req) => {
  const { email, password } = data;
  const emailNormalized = email.trim().toLowerCase();
  const errors = {};

  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";
  if (Object.keys(errors).length > 0) throw errors;

  const user = await User.findOne({ email: emailNormalized });
  if (!user) throw { email: "User not found" };

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw { password: "Incorrect password" };

  req.session.user = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phoneNumber,
    referralCode: user.referralCode || null,
  };

  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  return {
    message: "Signin successful",
    user: { id: user._id, firstName: user.firstName, email: user.email },
  };
};

// ─────────────────────────────────────────────
// VERIFY OTP SERVICE  ← BUG FIX IS HERE
// ─────────────────────────────────────────────
const verifyOtpService = async (data, req) => {
  // ── SESSION CHECK ──
  if (!req.session.userData || Date.now() > req.session.otpExpiry) {
    req.session.isSignupInProgress = false;
    req.session.userData = null;
    req.session.otpAttempts = 0;
    req.session.otpExpiry = null;
    throw { otp: "Session expired. Please signup again." };
  }

  const userData = req.session.userData;

  let { otp } = data;
  otp = otp.toString().trim();

  if (!/^\d{6}$/.test(otp)) {
    throw { otp: "Invalid OTP format" };
  }

  if (!req.session.otpAttempts) req.session.otpAttempts = 0;

  if (req.session.otpAttempts >= 5) {
    throw { otp: "Too many attempts. Please resend OTP." };
  }

  // ── FETCH OTP FROM DB ──
  const otpRecord = await Otp.findOne({ email: userData.email }).sort({
    createdAt: -1,
  });

  if (!otpRecord) throw { otp: "OTP not found. Please resend." };

  if (new Date() > otpRecord.expiresAt) {
    throw { otp: "OTP expired. Please resend." };
  }

  const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);

  if (!isValidOtp) {
    req.session.otpAttempts += 1;
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    throw { otp: "Invalid OTP. Please try again." };
  }
  // ── OTP VALID: CREATE USER ──
  // Delete OTP record first
  await Otp.deleteMany({ email: userData.email });
  let newUser;
  try {
    newUser = await User.create(userData);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — user already exists (race condition safe)
      // Clear signup session and let them login
      req.session.userData = null;
      req.session.isSignupInProgress = false;
      req.session.otpAttempts = 0;
      req.session.otpExpiry = null;
      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      throw { otp: "Account already exists. Please login." };
    }
    throw err;
  }

  // ── CLEAR SIGNUP SESSION, SET LOGIN SESSION ──
  req.session.userData = null;
  req.session.otpAttempts = 0;
  req.session.otpExpiry = null;
  req.session.isSignupInProgress = false;

  req.session.user = {
    id: newUser._id,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    email: newUser.email,
    phone: newUser.phoneNumber,
    referralCode: newUser.referralCode || null,
  };

  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  return { message: "Signup successful" };
};

// ─────────────────────────────────────────────
// RESEND OTP SERVICE
// ─────────────────────────────────────────────
const resendOtpService = async (req) => {
  const userData = req.session.userData;
  if (!userData) throw { otp: "Session expired. Please signup again." };

  req.session.otpAttempts = 0;

  await Otp.deleteMany({ email: userData.email });

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otpCode.toString(), 10);

  await Otp.create({
    email: userData.email,
    otp: hashedOtp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const isSent = await sendOtp(userData.email, otpCode);
  if (!isSent) throw { otp: "Failed to resend OTP" };

  req.session.otpExpiry = Date.now() + 5 * 60 * 1000;

  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  return { success: true, message: "OTP resent successfully" };
};

// ─────────────────────────────────────────────
// PROFILE IMAGE SERVICES
// ─────────────────────────────────────────────
const updateProfileImageService = async (userId, imageUrl) => {
  if (!userId) throw { profile: "User not found" };
  const user = await User.findById(userId);
  if (!user) throw { profile: "User not found" };
  user.profileImage = imageUrl;
  await user.save();
  return {
    message: "Profile image updated successfully",
    imageUrl: user.profileImage,
  };
};

const removeProfileImageService = async (userId) => {
  if (!userId) throw { profile: "User not found" };
  const user = await User.findById(userId);
  if (!user) throw { profile: "User not found" };
  user.profileImage = "";
  await user.save();
  return { message: "Profile image removed" };
};

module.exports = {
  signupService,
  signinService,
  verifyOtpService,
  resendOtpService,
  updateProfileImageService,
  removeProfileImageService,
};