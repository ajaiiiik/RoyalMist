const express = require("express");
const router = express.Router();
const passport = require("passport")
const { isAuthenticated,requireSignupSession } = require("../middleware/auth");

const {signupController,signinController,verifyOtpController,resendOtpController} = require("../controller/user/userController");



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
    res.redirect("/home"); 
  }
);
router.get("/home",isAuthenticated, (req,res)=>{
 const user = req.session.user || null;
  res.render("user/home", { user });
})

// signup
router.post("/signup", signupController);
router.post("/signin", signinController);
router.post("/verify-otp", verifyOtpController);
router.post("/resend-otp",resendOtpController)
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed");
    res.clearCookie("connect.sid");
    res.redirect("/signin");
  });
});

// Clear OTP session
router.post("/clear-otp-session", (req, res) => {
    req.session.otp = null;
    req.session.email = null; // if you store email in session
    res.json({ success: true });
});

module.exports = router;