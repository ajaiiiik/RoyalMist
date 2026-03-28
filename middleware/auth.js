
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() || req.session.user) {
    return next();
  }
  return res.redirect("/signin");
};

const requireSignupSession = (req, res, next) => {
  if (!req.session.userData) {
    return res.redirect("/signup");
  }
  next();
};

module.exports = { isAuthenticated,requireSignupSession };