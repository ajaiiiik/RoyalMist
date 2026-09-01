// ================================================================
// controller/user/orderController.js
// ================================================================

const Order   = require("../../model/orderSchema");
const Wallet  = require("../../model/walletSchema");
const Product = require("../../model/productSchema");
const PDFDocument = require("pdfkit");

// ── GET /orders/:id  ─────────────────────────────────────────────
const orderDetailController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user   = req.session.user;
    const order  = await Order.findOne({ _id: req.params.id, user: userId }).lean();
    if (!order) return res.redirect("/orders");
    res.render("user/profile/orderDetail", { user, order });
  } catch (err) {
    console.error("Order detail error:", err);
    res.redirect("/orders");
  }
};

// ── POST /orders/:orderId/cancel-item ────────────────────────────
// Body: { itemId, reason }
const cancelOrderItemController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { itemId, reason = "No reason provided" } = req.body;

    const order = await Order.findOne({ _id: req.params.id, user: userId });
    if (!order) return res.json({ success: false, message: "Order not found" });

    // Overall order cancellable statuses only
    if (!["Pending", "Processing"].includes(order.orderStatus))
      return res.json({ success: false, message: "Order cannot be cancelled at this stage" });

    const item = order.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    if (item.itemStatus !== "active")
      return res.json({ success: false, message: "Item already cancelled or returned" });

    // Cancel the item
    item.itemStatus   = "cancelled";
    item.cancelReason = reason;

    // Restore stock for this variant
    await Product.findOneAndUpdate(
      { _id: item.product, "volumes.size": item.size },
      { $inc: { "volumes.$.stock": item.quantity } }
    );

    // Refund if paid online or wallet
    if (["Razorpay", "Wallet"].includes(order.paymentMethod) && order.paymentStatus === "Paid") {
      const refund = item.price * item.quantity;
      item.refundAmount = refund;


      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
      wallet.balance += refund;
      wallet.transactions.push({
        type:        "credit",
        amount:      refund,
        description: `Refund for cancelled item: ${item.name} (${item.size})`,
      });
      await wallet.save();
    }

    // If ALL items cancelled → cancel whole order
    const allCancelled = order.items.every(i => i.itemStatus === "cancelled");
    if (allCancelled) {
      order.orderStatus  = "Cancelled";
      order.cancelledAt  = new Date();
    }

    await order.save();

    return res.json({
      success:     true,
      message:     "Item cancelled successfully" + (item.refundAmount > 0 ? `. ₹${item.refundAmount.toLocaleString("en-IN")} refunded to wallet` : ""),
      allCancelled,
    });
  } catch (err) {
    console.error("Cancel item error:", err);
    res.json({ success: false, message: "Server error" });
  }
};

// ── POST /orders/:orderId/return-item ────────────────────────────
// Body: { itemId, reason }
const returnOrderItemController = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { itemId, reason } = req.body;

    if (!reason || reason.trim().length < 3)
      return res.json({ success: false, message: "Please provide a return reason" });

    const order = await Order.findOne({ _id: req.params.id, user: userId });
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    if (item.itemStatus !== "active")
      return res.json({ success: false, message: "Item is not eligible for return" });

    if (order.orderStatus !== "Delivered")
      return res.json({ success: false, message: "Only delivered orders can be returned" });

    // 7-day return window
    const deliveredDate = order.deliveredAt || order.updatedAt;
    const daysDiff = (Date.now() - new Date(deliveredDate)) / (1000 * 60 * 60 * 24);
    if (daysDiff > 7)
      return res.json({ success: false, message: "Return window (7 days) has expired" });

    item.itemStatus  = "return_requested";
    item.returnReason = reason.trim();

    // Update overall order status
    order.orderStatus    = "Return Requested";
    order.returnRequested = true;

    await order.save();

    return res.json({ success: true, message: "Return request submitted. Admin will review shortly." });
  } catch (err) {
    console.error("Return item error:", err);
    res.json({ success: false, message: "Server error" });
  } 
};

// ── GET /orders/invoice/:id  ─────────────────────────────────────
const downloadInvoiceController = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.session.user.id }).lean();
    if (!order) return res.status(404).send("Order not found");

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderId}.pdf`);
    doc.pipe(res);

    const gold = "#c4a14d", dark = "#111111", grey = "#666666", W = 515;

    doc.rect(0, 0, 595, 120).fill(dark);
    doc.fillColor(gold).font("Helvetica-Bold").fontSize(22).text("ROYAL MIST", 50, 35, { characterSpacing: 6 });
    doc.fillColor("#888888").font("Helvetica").fontSize(9).text("LUXURY FRAGRANCES", 50, 62, { characterSpacing: 3 });
    doc.fillColor(gold).font("Helvetica-Bold").fontSize(28).text("INVOICE", 350, 35, { align: "right", width: 195 });
    doc.fillColor("#888888").font("Helvetica").fontSize(9).text(`# ${order.orderId}`, 350, 70, { align: "right", width: 195, characterSpacing: 1 });
    doc.moveTo(50, 125).lineTo(545, 125).strokeColor(gold).lineWidth(1.5).stroke();

    const metaY = 140;
    doc.fillColor(grey).font("Helvetica").fontSize(8).text("ORDER DATE", 50, metaY, { characterSpacing: 1 });
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10).text(new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), 50, metaY + 13);
    doc.fillColor(grey).font("Helvetica").fontSize(8).text("PAYMENT METHOD", 220, metaY, { characterSpacing: 1 });
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10).text(order.paymentMethod, 220, metaY + 13);
    doc.fillColor(grey).font("Helvetica").fontSize(8).text("STATUS", 390, metaY, { characterSpacing: 1 });
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10).text(order.orderStatus.toUpperCase(), 390, metaY + 13);
    doc.moveTo(50, 185).lineTo(545, 185).strokeColor("#dddddd").lineWidth(0.5).stroke();

    const addrY = 200, addr = order.shippingAddress;
    doc.fillColor(gold).font("Helvetica-Bold").fontSize(9).text("SHIP TO", 50, addrY, { characterSpacing: 2 });
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(11).text(addr.fullName, 50, addrY + 16);
    doc.fillColor(grey).font("Helvetica").fontSize(9)
       .text(addr.addressLine1 + (addr.addressLine2 ? `, ${addr.addressLine2}` : ""), 50, addrY + 30)
       .text(`${addr.city}, ${addr.state} - ${addr.zipCode}`, 50, addrY + 42)
       .text(addr.country || "India", 50, addrY + 54);

    const tableTop = addrY + 90;
    doc.rect(50, tableTop, W, 24).fill("#1a1a1a");
    doc.fillColor(gold).font("Helvetica-Bold").fontSize(8);
    doc.text("ITEM", 60, tableTop + 8, { characterSpacing: 1 });
    doc.text("SIZE", 320, tableTop + 8, { characterSpacing: 1 });
    doc.text("QTY", 380, tableTop + 8, { characterSpacing: 1 });
    doc.text("UNIT PRICE", 420, tableTop + 8, { characterSpacing: 1 });
    doc.text("TOTAL", 490, tableTop + 8, { characterSpacing: 1 });

    const deliveredItems = order.items;
    let rowY = tableTop + 30;
    deliveredItems.forEach((item, idx) => {
  doc.rect(50, rowY - 5, W, 26).fill(idx % 2 === 0 ? "#fafafa" : "#ffffff");
  const itemName = item.name.length > 32 ? item.name.substring(0, 32) + "…" : item.name;
  const statusLabel = item.itemStatus === 'cancelled' ? ' [CANCELLED]' :
                      item.itemStatus === 'returned'  ? ' [RETURNED]'  : '';
  const itemColor = item.itemStatus === 'cancelled' ? '#999999' : dark;

  doc.fillColor(itemColor).font("Helvetica-Bold").fontSize(9).text(itemName + statusLabel, 60, rowY + 1);
  doc.fillColor(item.itemStatus === 'cancelled' ? '#999999' : grey).font("Helvetica").fontSize(9).text(item.size, 320, rowY + 1);
  doc.text(String(item.quantity), 385, rowY + 1);
  doc.text(`Rs.${item.price.toLocaleString("en-IN")}`, 420, rowY + 1);
  doc.fillColor(itemColor).font("Helvetica-Bold").fontSize(9).text(`Rs.${(item.price * item.quantity).toLocaleString("en-IN")}`, 488, rowY + 1);
  doc.moveTo(50, rowY + 21).lineTo(545, rowY + 21).strokeColor("#eeeeee").lineWidth(0.4).stroke();
  rowY += 26;
});

    const totY = rowY + 20;
    doc.rect(350, totY, 195, order.discount > 0 ? 110 : 84).fill("#f9f7f2");
    const tRow = (label, value, y, bold = false, color = dark) => {
      doc.fillColor(grey).font("Helvetica").fontSize(8).text(label, 360, y, { characterSpacing: 1 });
      doc.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 8).text(value, 490, y, { align: "right", width: 45 });
    };
    const activeTotal = deliveredItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    tRow("SUBTOTAL", `Rs.${activeTotal.toLocaleString("en-IN")}`, totY + 12);
    tRow("SERVICE FEE", `Rs.${order.serviceFee.toLocaleString("en-IN")}`, totY + 28);
    tRow("DELIVERY", order.deliveryCharge === 0 ? "FREE" : `Rs.${order.deliveryCharge}`, totY + 44);
    if (order.discount > 0) tRow("DISCOUNT", `-Rs.${order.discount.toLocaleString("en-IN")}`, totY + 60, false, "#27ae60");

    const gtY = order.discount > 0 ? totY + 78 : totY + 62;
    doc.moveTo(360, gtY - 4).lineTo(540, gtY - 4).strokeColor(gold).lineWidth(0.8).stroke();
    doc.fillColor(gold).font("Helvetica-Bold").fontSize(9).text("GRAND TOTAL", 360, gtY + 2, { characterSpacing: 1 });
   const cancelledRefund = order.items
  .filter(i => i.itemStatus === 'cancelled')
  .reduce((sum, i) => sum + i.price * i.quantity, 0);
const invoiceTotal = order.grandTotal - cancelledRefund;
doc.fillColor(dark).font("Helvetica-Bold").fontSize(13).text(`Rs.${invoiceTotal.toLocaleString("en-IN")}`, 440, gtY, { align: "right", width: 95 });

    const footY = Math.max(totY + 130, rowY + 160);
    doc.moveTo(50, footY).lineTo(545, footY).strokeColor(gold).lineWidth(1).stroke();
    doc.fillColor(grey).font("Helvetica").fontSize(8).text("Thank you for shopping with Royal Mist. For queries: royalmist@gmail.com  |  +91 98765 43210", 50, footY + 12, { align: "center", width: W });
    doc.fillColor("#aaaaaa").fontSize(7).text("© 2026 Royal Mist Fragrances. All rights reserved.", 50, footY + 26, { align: "center", width: W });
    doc.end();

  } catch (err) {
    console.error("Invoice error:", err);
    res.status(500).send("Failed to generate invoice");
  }
};

module.exports = {
  orderDetailController,
  cancelOrderItemController,
  returnOrderItemController,
  downloadInvoiceController,
};