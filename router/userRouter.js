const express = require("express");
const router = express.Router();
const passport = require("passport")
const multer = require("multer");
const path = require("path");
const { isAuthenticated,requireSignupSession } = require("../middleware/auth");

const {
  signupController,
  signinController,
  verifyOtpController,
  resendOtpController,
  accountController,
  updateProfileImageController,
  removeProfileImageController,
  updateProfileController,
  sendEmailChangeOtpController,
  verifyEmailChangeOtpController,
  addAddressController, 
  saveAddressController,
  deleteAddressController,
getAddressController, 
updateAddressController,
changePasswordController,
forgotPasswordController,
verifyForgotOtpController,
resetPasswordController
} = require("../controller/user/userController");



// signup page
router.get("/signup", (req, res) => {
  res.render("user/signup");
});
router.get("/signin", (req, res) => {
  res.render("user/signin")
});
router.get("/otp", requireSignupSession, (req,res)=>{
  res.render("user/otp")
})
//goog login start
router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

//google login
router.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/signup"
  }),
  (req, res) => {
      req.session.user = {
      id: req.user._id,                         
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      phone: req.user.phoneNumber || null,
      referralCode: req.user.referralCode || null
    };
    req.session.save((err) => {
  if (err) return res.redirect("/signup");
    res.redirect("/home"); 
  })
}
);
router.get("/home",isAuthenticated, (req,res)=>{
 const user = req.session.user || req.user|| null;
  res.render("user/home", { user });
})
router.get("/editProfile", isAuthenticated, (req, res) => {
  const user = req.session.user || null;
  res.render("user/profile/editProfile", { user });
});

router.get("/checkAuthType", isAuthenticated, (req, res) => {
  if (req.user && req.user.googleId) {
    return res.json({ googleUser: true });
  }
  res.json({ googleUser: false });
});
router.get("/forgot-password", (req, res) => {
  res.render("user/forgotPassword");
});

router.get("/account", isAuthenticated, accountController);
router.get("/addAddress", isAuthenticated, addAddressController);
router.get("/getAddress/:id", isAuthenticated, getAddressController);
// Forgot password OTP page - middleware இல்லாம
router.get("/forgot-otp", (req, res) => {
  res.render("user/otp");
});

router.get("/reset-password", (req, res) => {
  res.render("user/resetPassword");
});




// signup
router.post("/signup", signupController);
router.post("/signin", signinController);
router.post("/verify-otp", verifyOtpController);
router.post("/resend-otp",resendOtpController);
router.post("/removeProfileImage", isAuthenticated, removeProfileImageController);
router.post("/updateProfile", isAuthenticated, updateProfileController);
router.post("/send-email-otp", isAuthenticated, sendEmailChangeOtpController);
router.post("/verify-email-otp", isAuthenticated, verifyEmailChangeOtpController);
router.post("/addAddress", isAuthenticated, saveAddressController);
router.delete("/deleteAddress/:id", isAuthenticated, deleteAddressController);
router.post("/editAddress/:id", isAuthenticated, updateAddressController);
router.post("/changePassword", isAuthenticated,changePasswordController);
router.post("/forgot-password", forgotPasswordController);
router.post("/verify-forgot-otp", verifyForgotOtpController);



router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed");
    res.clearCookie("connect.sid");
    res.redirect("/signin");
  });
});

// Clear OTP session
router.post("/clear-otp-session", requireSignupSession,(req, res) => {
    req.session.otp = null;
    req.session.email = null; // if you store email in session
    res.json({ success: true });
});

router.post("/reset-password", resetPasswordController);




// multer setup

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "profile_" + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPEG, PNG, WEBP allowed"), false);
  }
});
router.post("/updateProfileImage",  isAuthenticated,upload.single("profileImage"), updateProfileImageController)









module.exports = router;