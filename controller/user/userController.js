      const { signupService, signinService,verifyOtpService ,resendOtpService} = require("../../services/user/userService");


      //SIGNUP CONTROLLER
      const signupController = async (req, res) => {
        try {
          const result = await signupService(req.body, req);

        return res.status(200).json({
            success: true,
            message: result.message,
            redirect : "/otp"
          });
        }
        catch (err) {
          console.error("signup error",err)
          return res.status(400).json({
            success: false,
            errors : err
          });
        }
      };


      
      // SIGNIN CONTROLLER
      const signinController = async (req, res) => {
        try {
          const result = await signinService(req.body,req);

          return res.json({
            success: true,
            message: result.message,
            redirect: "/home",

            user: result.user // user data if needed
          });
        } catch (err) {
          console.error("signin error", err);
          return res.json({
            success: false,
            errors: err
          });
        }
      };

      const verifyOtpController = async (req, res) => {
      try {
        const result = await verifyOtpService(req.body, req);

        return res.json({
          success: true,
          message: result.message
        });
      } catch (err) {
        return res.status(400).json({
          success: false,
          errors: err
        });
      }
    };

    const resendOtpController = async (req, res) => {
      try {
        const result = await resendOtpService(req);

        res.json({
          success: true,
          message: result.message
        });
      } catch (err) {
        res.json({
          success: false,
          errors: err
        });
      }             
    };


      module.exports = { signupController, signinController,verifyOtpController, resendOtpController};
