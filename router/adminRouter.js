const express = require("express");
const router = express.Router();
const { 
  adminSigninController,
  getCustomersController,
  blockUserController,
  unblockUserController
} = require("../controller/admin/adminController");

const adminAuth = (req, res, next) => {
  if (req.session.admin) return next();
  return res.redirect("/admin/signin");
};

router.get("/signin", (req, res) => {
  res.render("admin/adminsignin");
});

router.get("/dashboard", adminAuth, (req, res) => {
  res.render("admin/dashboard");
});
router.get("/customers", adminAuth, getCustomersController);

router.get("/logout", adminAuth, (req, res) => {
  req.session.destroy();
  res.redirect("/admin/signin");
});


router.patch("/customers/:id/block",adminAuth, blockUserController);
router.patch("/customers/:id/unblock",adminAuth, unblockUserController);


router.post("/signin", adminSigninController);

module.exports = router;