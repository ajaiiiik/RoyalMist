const nodemailer = require("nodemailer");

const sendOtp = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Royal Mist",
      html: `<h3>Your OTP is <b>${otp}</b></h3><p>Do not share it with anyone.</p>`,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.log("OTP send error:", err);
    return false;
  }
};

module.exports = sendOtp;