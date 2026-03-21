const express = require("express");
const router = express.Router();

const {signupController,signinController} = require("../controller/user/userController");



// signup page
router.get("/signup", (req, res) => {
  res.render("user/signup");
});
router.get("/signin", (req, res) => {
  res.render("user/signin")
});

// signup
router.post("/signup", signupController);
router.post("/signin", signinController);


module.exports = router;