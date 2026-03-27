      const User = require("../../model/userSchema");
      const { signupService, signinService,verifyOtpService ,resendOtpService,updateProfileImageService,removeProfileImageService} = require("../../services/user/userService");


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

const accountController = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect("/signin");

        const freshUser = await User.findById(req.session.user.id);
        if (!freshUser) return res.redirect("/signin");

        res.render("user/profile/profile", { 
            user: {
              ...freshUser._doc,
              phone:freshUser.phoneNumber
            },
            addresses: freshUser.addresses || []
        });
    } catch (err) {
        console.log(err);
        res.redirect("/signin");
    }
};

const updateProfileImageController = async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

        // Assuming you store file in /uploads and return URL
        const imageUrl = `/uploads/${req.file.filename}`; 
        const result = await updateProfileImageService(req.session.user.id, imageUrl);

        res.json({ success: true, imageUrl: result.imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to update profile image" });
    }
};



const removeProfileImageController = async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ success: false });
        await removeProfileImageService(req.session.user.id);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};


      module.exports = { signupController, signinController,verifyOtpController, resendOtpController,accountController,updateProfileImageController,removeProfileImageController};
