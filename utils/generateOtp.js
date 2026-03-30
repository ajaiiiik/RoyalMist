const SibApiV3Sdk = require("sib-api-v3-sdk");

const sendOtp = async (email, otp) => {
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.sender = { 
      email: process.env.BREVO_SENDER_EMAIL, 
      name: "Royal Mist" 
    };
    sendSmtpEmail.subject = "Your OTP for Royal Mist";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; color: #000;">
        <h3>Your OTP is <b>${otp}</b></h3>
        <p>Do not share it with anyone.</p>
      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("OTP sent to:", email);
    return true;

  } catch (err) {
    console.log("OTP send error:", err?.response?.body || err.message);
    return false;
  }
};

module.exports = sendOtp;