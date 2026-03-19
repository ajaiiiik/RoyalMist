const User = require("../../model/userSchema");
const bcrypt = require("bcryptjs");

//SIGNUP SERVICE
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

  //VALIDATION
  if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmPassword) {
    throw new Error("All required fields must be filled");
  }

  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  if (!/^\d{10}$/.test(phoneNumber)) {
    throw new Error("Phone number must be exactly 10 digits");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  //CHECK EXISTING USER
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  //HASH PASSWORD
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  //SAVE USER
  await User.create({
    firstName,
    lastName,
    email,
    phoneNumber,
    password: hashedPassword,
    referralCode
  });

  return { message: "Signup successful" };
};
module.exports = signupService

  