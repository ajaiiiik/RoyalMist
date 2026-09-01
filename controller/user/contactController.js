const SibApiV3Sdk = require("sib-api-v3-sdk");

const contactUsController = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // ── VALIDATION ──
    if (!name || !name.trim()) {
      return res.json({ success: false, message: "Name is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.json({ success: false, message: "Valid email is required" });
    }

    if (!message || !message.trim()) {
      return res.json({ success: false, message: "Message is required" });
    }

    if (message.trim().length < 10) {
      return res.json({ success: false, message: "Message must be at least 10 characters" });
    }

    // ── SEND EMAIL VIA BREVO ──
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: process.env.BREVO_SENDER_EMAIL }];
    sendSmtpEmail.sender = { 
      email: process.env.BREVO_SENDER_EMAIL, 
      name: "Royal Mist Contact Form" 
    };
    sendSmtpEmail.replyTo = { email: email, name: name };
    sendSmtpEmail.subject = `New Contact Form Message from ${name}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; color: #000; max-width: 600px;">
        <h2 style="color: #c4a14d;">New Contact Us Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-left: 3px solid #c4a14d;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #888;">This message was sent from the Royal Mist website contact form.</p>
      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Contact form email sent from:", email);

    return res.json({ success: true, message: "Message sent successfully! We'll get back to you soon." });

  } catch (err) {
    console.error("Contact form error:", err?.response?.body || err.message);
    return res.json({ success: false, message: "Failed to send message. Please try again." });
  }
};

module.exports = { contactUsController };