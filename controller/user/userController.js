      const User = require("../../model/userSchema");
      const bcrypt = require("bcrypt")
      const {
         signupService,
          signinService,
          verifyOtpService ,
          resendOtpService,
           updateProfileService,
           updateProfileImageService,
           removeProfileImageService,
           sendEmailChangeOtpService,
           verifyEmailChangeOtpService,
            forgotPasswordService,
            verifyForgotOtpService,
          } = require("../../services/user/userService");


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


const updateProfileController = async (req, res) => {
  try {
    const result = await updateProfileService(req.body, req);

    res.json({ success: true, message: result.message });

  } catch (err) {
    res.json({ success: false, message: err.message || "Update failed" });
  }
};


const sendEmailChangeOtpController = async (req, res) => {
    try {
        const result = await sendEmailChangeOtpService(req.body, req);
        res.json({ success: true, message: result.message });
    } catch (err) {
        res.json({ success: false, message: err.message || "Something went wrong" });
    }
};

const verifyEmailChangeOtpController = async (req, res) => {
    try {
        const result = await verifyEmailChangeOtpService(req.body, req);
        res.json({ success: true, message: result.message });
    } catch (err) {
        res.json({ success: false, message: err.message || "Something went wrong" });
    }
};


// ── ADD ADDRESS PAGE - GET ──
const addAddressController = (req, res) => {
    res.render("user/profile/address");
};

// ── SAVE ADDRESS - POST ──
const saveAddressController = async (req, res) => {
    try {
        const { fullName, addressLine1, addressLine2, 
                city, state, country, zipCode, addressType } = req.body;

        const user = await User.findById(req.session.user.id);
        if (!user) return res.json({ success: false, message: "User not found" });

        user.addresses.push({
            fullName, addressLine1, addressLine2,
            city, state, country, zipCode, addressType
        });

        await user.save();
        res.json({ success: true });

    } catch (err) {
        console.error("Add address error:", err);
        res.json({ success: false, message: "Something went wrong" });
    }
};


const deleteAddressController = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        user.addresses.pull({ _id: req.params.id });
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "Something went wrong" });
    }
};

const getAddressController = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const address = user.addresses.id(req.params.id);
        if (!address) return res.json({ success: false });
        res.json({ success: true, address });
    } catch (err) {
        res.json({ success: false });
    }
};

const updateAddressController = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const address = user.addresses.id(req.params.id);
        if (!address) return res.json({ success: false, message: "Address not found" });
        Object.assign(address, req.body);
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "Something went wrong" });
    }
};

const changePasswordController = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.session.user.id);

    // GOOGLE LOGIN CHECK
    if (!user.password) {
      return res.json({
        success: false,
        googleUser: true,
        message: "Google users cannot change password"
      });
    }

    // OLD PASSWORD CHECK
    if (!newPassword || newPassword.length < 6) {
    return res.json({ success: false, message: "Password too short" });
}

const isMatch = await bcrypt.compare(oldPassword, user.password);
if (!isMatch) {
    return res.json({ success: false, message: "Incorrect old password" });
}

    // NEW PASSWORD HASH
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({ success: true, message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Something went wrong" });
  }
};
const forgotPasswordController = async (req, res) => {
  try {
    const result = await forgotPasswordService(req.body, req);
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.json({
      success: false,
      errors: err,
      message: err.message || "Something went wrong"
    });
  }
};

const verifyForgotOtpController = async (req, res) => {
  try {
    const result = await verifyForgotOtpService(req.body, req);

    res.json({ success: true, message: result.message });
  } catch (err) {
    res.json({ success: false, errors: err });
  }
};

const resetPasswordController = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.forgotEmail;

    if (!email) return res.json({ success: false, message: "Session expired. Try again." });

    if (!password || password.length < 8) {
      return res.json({ success: false, errors: { password: "Password too short" } });
    }

    if (password !== confirmPassword) {
      return res.json({ success: false, errors: { confirmPassword: "Passwords do not match" } });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.updateOne({ email }, { password: hashed });

    req.session.forgotEmail = null;
    await new Promise((resolve, reject) => {
      req.session.save(err => err ? reject(err) : resolve());
    });

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Something went wrong" });
  }
};





      module.exports = { signupController, 
        signinController,
        verifyOtpController,
         resendOtpController,
         accountController,
         updateProfileImageController,
         removeProfileImageController,
         updateProfileController,
          sendEmailChangeOtpController, 
    verifyEmailChangeOtpController,
     addAddressController,  
    saveAddressController ,
    deleteAddressController,
    getAddressController,
    updateAddressController,
    changePasswordController ,
    forgotPasswordController,
    verifyForgotOtpController,
    resetPasswordController ,

  };
