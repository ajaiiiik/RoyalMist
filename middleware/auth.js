
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  next();
};

const requireSignupSession = (req, res, next) => {
  if (!req.session.userData) {
    return res.redirect("/signup");
  }
  next();
};

module.exports = { isAuthenticated,requireSignupSession };