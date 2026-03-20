const User = require("../../model/userSchema");
const bcrypt = require("bcryptjs");

const signupService = async (data) => {
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

  // CHECK USER EXISTS
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { email: "User already exists" };
  }


  // HASH PASSWORD
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // SAVE USER
  try{
const newUser = await User.create({
    firstName,
    lastName,
    email,
    phoneNumber,
    password: hashedPassword,
    referralCode
  });
  console.log("User saved to DB:", newUser._id); // ✅ debug log
    return { message: "Signup successful" };
  }catch (err) {
    console.error("DB save error:", err);
    throw { general: "Failed to save user. Try again." };
  }
};

module.exports = signupService;