const Admin = require("../../model/userSchema");
const bcrypt = require("bcrypt");

const adminSigninService = async (data, req) => {
  const { email, password } = data;
  const errors = {};

  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";
  if (Object.keys(errors).length > 0) throw errors;

  const emailNormalized = email.trim().toLowerCase();

  const admin = await Admin.findOne({ email: emailNormalized });
  if (!admin) throw { email: "Admin not found" };

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) throw { password: "Incorrect password" };

  req.session.admin = {
    id: admin._id,
    email: admin.email
  };

  await new Promise((resolve, reject) => {
    req.session.save(err => err ? reject(err) : resolve());
  });

  return { message: "Admin signin successful" };
};

module.exports = { adminSigninService };