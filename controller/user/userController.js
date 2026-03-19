const signupService = require("../../services/user/userService");


//SIGNUP CONTROLLER
const signupController = async (req, res) => {
  try {
    const result = await signupService(req.body);

    res.send(result.message);
  } catch (err) {
    res.render("user/signup", {errors:err,oldData:req.body})
  }
};

module.exports = signupController