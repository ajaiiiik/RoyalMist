const User = require("../model/userSchema"); 

const isAuthenticated = async (req, res, next) => {
  if (!req.isAuthenticated() && !req.session.user) {
    return res.redirect("/signin");
  }

  try { 
    const userId = req.session.user?._id || req.session.user?.id || req.user?._id;

    if (userId) {
      const user = await User.findById(userId).select("isBlocked");

      // is Blocked ? blocked means → session destroy → signin redirect
      if (!user || user.isBlocked) {
        req.session.destroy(() => {
          res.redirect("/signin");
        });
        return;
      }
    }
  } catch (err) {
    console.error("isAuthenticated middleware error:", err);
    return res.redirect("/signin");
  }

  return next();
};

const requireSignupSession = (req, res, next) => {
  if (!req.session.userData) {
    return res.redirect("/signup");
  }
  next();
};

module.exports = { isAuthenticated, requireSignupSession };