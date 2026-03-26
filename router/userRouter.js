const express = require("express");
const router = express.Router();
const passport = require("passport")

const {signupController,signinController,verifyOtpController,resendOtpController,adminSigninController} = require("../controller/user/userController");



// signup page
router.get("/signup", (req, res) => {
  res.render("user/signup");
});
router.get("/signin", (req, res) => {
  res.render("user/signin")
});
router.get("/otp", (req,res)=>{
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
router.get("/home",(req,res)=>{
 const user = req.session.user || null;
  res.render("user/home", { user });
})
router.get("/admin/signin", (req, res) => {
  res.render("admin/adminSignin");
});

router.get("/profile", (req,res)=>{
  res.render("user/profile/profile")
})

// signup
router.post("/signup", signupController);
router.post("/signin", signinController);
router.post("/verify-otp", verifyOtpController);
router.post("/resend-otp",resendOtpController)
router.post("/admin/signin", adminSigninController); 
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed");
    res.clearCookie("connect.sid");
    res.redirect("/signin");
  });
});



module.exports = router;