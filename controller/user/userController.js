const signupService = require("../../services/user/userService");


//SIGNUP CONTROLLER
const signupController = async (req, res) => {
  try {
    const result = await signupService(req.body);

    res.send(result.message);
  } catch (err) {
    console.log(err); 
    res.send(err.message);
  }
};

module.exports = signupController