const signupService = require("../../services/user/userService");


//SIGNUP CONTROLLER
const signupController = async (req, res) => {
  try {
    const result = await signupService(req.body);

   return res.json({
      success: true,
      message: result.message
    });
  }
  catch (err) {
    console.error("signup error",err)
    return res.json({
      success: false,
      errors: err
    });
  }
};

module.exports = signupController