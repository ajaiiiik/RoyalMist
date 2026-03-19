const express = require("express");
const router = express.Router();

const signupController = require("../controller/user/userController");



// signup page
router.get("/signup", (req, res) => {
  res.render("user/signup",{errors : {},oldData:{} });
});

// signup
router.post("/signup", signupController);


module.exports = router;