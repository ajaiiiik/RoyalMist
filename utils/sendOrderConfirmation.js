const SibApiV3Sdk = require("sib-api-v3-sdk");

const sendOrderConfirmation = async (email, order, userName) => {
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
    sendSmtpEmail.subject = `Order Confirmed — ${order.orderId}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family:'Georgia',serif;background:#000;color:#fff;padding:40px;max-width:600px;margin:auto;">
        
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#c4a14d;letter-spacing:6px;font-size:24px;">ROYAL MIST</h1>
          <p style="color:#888;letter-spacing:3px;font-size:11px;">LUXURY FRAGRANCES</p>
        </div>

        <div style="border:1px solid #c4a14d;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#c4a14d;letter-spacing:3px;font-size:11px;margin-bottom:8px;">ORDER CONFIRMED</p>
          <h2 style="color:#fff;font-size:20px;margin:0;">Thank you, ${userName}!</h2>
        </div>

        <div style="background:#0a0a0a;border:1px solid #1a1a1a;padding:20px;margin-bottom:20px;">
          <p style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:4px;">ORDER ID</p>
          <p style="color:#c4a14d;font-size:16px;font-weight:bold;margin:0;">${order.orderId}</p>
        </div>

        <div style="margin-bottom:20px;">
          <p style="color:#888;font-size:11px;letter-spacing:2px;border-bottom:1px solid #1a1a1a;padding-bottom:8px;">ORDER ITEMS</p>
          ${order.items.map(item => `
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #0f0f0f;">
              <div>
                <p style="color:#fff;margin:0;font-size:13px;">${item.name}</p>
                <p style="color:#555;margin:0;font-size:11px;">${item.size} · QTY ${item.quantity}</p>
              </div>
              <p style="color:#c4a14d;margin:0;font-size:13px;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</p>
            </div>
          `).join("")}
        </div>

        <div style="background:#0a0a0a;border:1px solid #1a1a1a;padding:20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#888;font-size:12px;">Subtotal</span>
            <span style="color:#fff;font-size:12px;">₹${order.totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#888;font-size:12px;">Service Fee</span>
            <span style="color:#fff;font-size:12px;">₹${order.serviceFee.toLocaleString('en-IN')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#888;font-size:12px;">Delivery</span>
            <span style="color:${order.deliveryCharge === 0 ? '#5cb85c' : '#fff'};font-size:12px;">${order.deliveryCharge === 0 ? 'FREE' : '₹' + order.deliveryCharge}</span>
          </div>
          ${order.discount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#888;font-size:12px;">Discount</span>
            <span style="color:#5cb85c;font-size:12px;">-₹${order.discount.toLocaleString('en-IN')}</span>
          </div>` : ""}
          <div style="display:flex;justify-content:space-between;border-top:1px solid #2a2a2a;padding-top:12px;margin-top:8px;">
            <span style="color:#fff;font-size:14px;letter-spacing:2px;">GRAND TOTAL</span>
            <span style="color:#c4a14d;font-size:18px;font-weight:bold;">₹${order.grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style="background:#0a0a0a;border:1px solid #1a1a1a;padding:20px;margin-bottom:20px;">
          <p style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:10px;">DELIVERY ADDRESS</p>
          <p style="color:#fff;font-size:13px;margin:0;">${order.shippingAddress.fullName}</p>
          <p style="color:#666;font-size:12px;margin:4px 0 0;">${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}</p>
          <p style="color:#666;font-size:12px;margin:2px 0 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.zipCode}</p>
        </div>

        <div style="background:#0a0a0a;border:1px solid #1a1a1a;padding:16px;margin-bottom:24px;display:flex;justify-content:space-between;">
          <div>
            <p style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:4px;">PAYMENT METHOD</p>
            <p style="color:#fff;font-size:13px;margin:0;">${order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}</p>
          </div>
          <div>
            <p style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:4px;">STATUS</p>
            <p style="color:#c4a14d;font-size:13px;margin:0;">${order.orderStatus}</p>
          </div>
        </div>

        <div style="text-align:center;border-top:1px solid #1a1a1a;padding-top:20px;">
          <p style="color:#555;font-size:11px;letter-spacing:1px;">© 2026 ROYAL MIST FRAGRANCES. ALL RIGHTS RESERVED.</p>
        </div>

      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Order confirmation sent to:", email);
    return true;

  } catch (err) {
    console.log("Order confirmation email error:", err?.response?.body || err.message);
    return false;
  }
};

module.exports = sendOrderConfirmation;