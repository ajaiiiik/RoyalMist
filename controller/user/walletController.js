// ================================================================
// controller/user/walletController.js
// Wallet: view balance, transaction history, add money via Razorpay
// ================================================================
const Wallet   = require("../../model/walletSchema");
const Razorpay = require("razorpay");
const crypto   = require("crypto");

// ── GET /wallet ──────────────────────────────────────────────────
const getWalletController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user   = req.session.user;

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: 0, transactions: [] });
    }

    // Sort transactions — newest first
    const transactions = [...wallet.transactions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.render("user/wallet", {
      user,
      balance:      wallet.balance,
      transactions,
    });
  } catch (err) {
    console.error("Get wallet error:", err);
    res.status(500).send("Server error");
  }
};

// ── POST /wallet/create-order (Razorpay) ─────────────────────────
const createWalletOrderController = async (req, res) => {
  try {
    const { amount } = req.body;
    const amt = Number(amount);

    if (!amt || amt < 1 || amt > 50000) {
      return res.json({ success: false, message: "Amount must be between ₹1 and ₹50,000" });
    }

    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount:   Math.round(amt * 100),
      currency: "INR",
      receipt:  "wallet_" + Date.now(),
    });

    res.json({
      success:         true,
      razorpayOrderId: order.id,
      amount:          order.amount,
      key:             process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Wallet order error:", err);
    res.json({ success: false, message: "Failed to initiate payment" });
  }
};

// ── POST /wallet/verify-payment ──────────────────────────────────
const verifyWalletPaymentController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      return res.json({ success: false, message: "Payment verification failed" });
    }

    const amt = Number(amount) / 100; // convert paise to rupees

    // Credit wallet
    const wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $inc: { balance: amt },
        $push: {
          transactions: {
            type:        "credit",
            amount:      amt,
            description: "Added to wallet via Razorpay",
          },
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success:    true,
      newBalance: wallet.balance,
      message:    `₹${amt.toLocaleString("en-IN")} added successfully!`,
    });
  } catch (err) {
    console.error("Verify wallet payment error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getWalletController,
  createWalletOrderController,
  verifyWalletPaymentController,
};


