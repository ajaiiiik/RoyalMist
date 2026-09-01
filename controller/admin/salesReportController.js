// ================================================================
// controller/admin/salesReportController.js
// Sales Report: date filter, summary, top products, PDF + Excel
// ================================================================
const Order   = require("../../model/orderSchema");
const Product = require("../../model/productSchema");

// ── GET /admin/sales-report ──────────────────────────────────────
const getSalesReportController = async (req, res) => {
  try {
    const period    = req.query.period    || "monthly";
    const startDate = req.query.startDate || "";
    const endDate   = req.query.endDate   || "";

    const { from, to } = getDateRange(period, startDate, endDate);

    const orders = await Order.find({
      createdAt:   { $gte: from, $lte: to },
      orderStatus: { $nin: ["Cancelled"] },
    }).populate("user", "firstName lastName email").lean();

    // Summary stats
    const totalRevenue  = orders.reduce((s, o) => s + o.grandTotal, 0);
    const totalOrders   = orders.length;
    const totalDiscount = orders.reduce((s, o) => s + (o.discount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Top products
    const productMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.product?.toString() || item.name;
        if (!productMap[key]) {
          productMap[key] = { name: item.name, qty: 0, revenue: 0, image: item.image };
        }
        productMap[key].qty     += item.quantity;
        productMap[key].revenue += item.price * item.quantity;
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Chart data — group by day/week/month
    const chartData = buildChartData(orders, period, from, to);

    // Order status breakdown
    const allOrders = await Order.find({ createdAt: { $gte: from, $lte: to } }).lean();
    const statusBreakdown = {
      Pending:    allOrders.filter(o => o.orderStatus === "Pending").length,
      Processing: allOrders.filter(o => o.orderStatus === "Processing").length,
      Shipped:    allOrders.filter(o => o.orderStatus === "Shipped").length,
      Delivered:  allOrders.filter(o => o.orderStatus === "Delivered").length,
      Cancelled:  allOrders.filter(o => o.orderStatus === "Cancelled").length,
    };

    res.render("admin/salesReport", {
      orders,
      totalRevenue,
      totalOrders,
      totalDiscount,
      avgOrderValue,
      topProducts,
      chartData,
      statusBreakdown,
      filters: { period, startDate, endDate },
      from: from.toISOString().split("T")[0],
      to:   to.toISOString().split("T")[0],
    });

  } catch (err) {
    console.error("Sales report error:", err);
    res.status(500).send("Server error");
  }
};

// ── GET /admin/sales-report/download?format=pdf|excel ───────────
const downloadSalesReportController = async (req, res) => {
  try {
    const format    = req.query.format    || "pdf";
    const period    = req.query.period    || "monthly";
    const startDate = req.query.startDate || "";
    const endDate   = req.query.endDate   || "";

    const { from, to } = getDateRange(period, startDate, endDate);

    const orders = await Order.find({
      createdAt:   { $gte: from, $lte: to },
      orderStatus: { $nin: ["Cancelled"] },
    }).populate("user", "firstName lastName email").lean();

    const totalRevenue  = orders.reduce((s, o) => s + o.grandTotal, 0);
    const totalOrders   = orders.length;
    const totalDiscount = orders.reduce((s, o) => s + (o.discount || 0), 0);

    if (format === "pdf") {
      await generatePDF(res, orders, { totalRevenue, totalOrders, totalDiscount, from, to });
    } else {
      generateExcel(res, orders, { totalRevenue, totalOrders, totalDiscount, from, to });
    }

  } catch (err) {
    console.error("Download error:", err);
    res.status(500).send("Failed to generate report");
  }
};

// ── Helper: Get date range ────────────────────────────────────────
function getDateRange(period, startDate, endDate) {
  const now = new Date();
  let from, to;

  if (startDate && endDate) {
    from = new Date(startDate);
    from.setHours(0, 0, 0, 0);
    to   = new Date(endDate);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (period === "daily") {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "yearly") {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from, to };
}

// ── Helper: Build chart data ─────────────────────────────────────
function buildChartData(orders, period, from, to) {
  const map = {};

  orders.forEach(order => {
    const d = new Date(order.createdAt);
    let key;
    if (period === "daily") {
      key = d.getHours() + ":00";
    } else if (period === "weekly") {
      key = d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit" });
    } else if (period === "yearly") {
      key = d.toLocaleDateString("en-IN", { month: "short" });
    } else {
      key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    }
    map[key] = (map[key] || 0) + order.grandTotal;
  });

  return {
    labels: Object.keys(map),
    data:   Object.values(map),
  };
}

// ── Helper: Generate PDF ─────────────────────────────────────────
async function generatePDF(res, orders, { totalRevenue, totalOrders, totalDiscount, from, to }) {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=sales-report-${Date.now()}.pdf`);
  doc.pipe(res);

  const gold = "#c4a14d";
  const dark = "#111111";

  // Header
  doc.rect(0, 0, 595, 90).fill(dark);
  doc.fillColor(gold).font("Helvetica-Bold").fontSize(20).text("ROYAL MIST", 40, 28, { characterSpacing: 4 });
  doc.fillColor("#888").font("Helvetica").fontSize(9).text("SALES REPORT", 40, 52, { characterSpacing: 3 });
  doc.fillColor("#888").fontSize(9).text(
    `${from.toLocaleDateString("en-IN")} — ${to.toLocaleDateString("en-IN")}`,
    40, 65, { characterSpacing: 1 }
  );

  // Summary boxes
  doc.moveTo(40, 100).lineTo(555, 100).strokeColor(gold).lineWidth(1).stroke();

  const boxes = [
    { label: "TOTAL REVENUE",  value: `Rs.${totalRevenue.toLocaleString("en-IN")}` },
    { label: "TOTAL ORDERS",   value: String(totalOrders) },
    { label: "TOTAL DISCOUNT", value: `Rs.${totalDiscount.toLocaleString("en-IN")}` },
    { label: "AVG ORDER",      value: totalOrders > 0 ? `Rs.${Math.round(totalRevenue/totalOrders).toLocaleString("en-IN")}` : "Rs.0" },
  ];

  boxes.forEach((box, i) => {
    const x = 40 + i * 130;
    doc.fillColor("#888").font("Helvetica").fontSize(8).text(box.label, x, 110, { characterSpacing: 1 });
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(13).text(box.value, x, 124);
  });

  doc.moveTo(40, 150).lineTo(555, 150).strokeColor("#dddddd").lineWidth(0.5).stroke();

  // Orders table
  doc.fillColor(gold).font("Helvetica-Bold").fontSize(9).text("ORDER ID", 40, 162, { characterSpacing: 1 });
  doc.text("CUSTOMER", 140, 162, { characterSpacing: 1 });
  doc.text("DATE", 290, 162, { characterSpacing: 1 });
  doc.text("PAYMENT", 370, 162, { characterSpacing: 1 });
  doc.text("AMOUNT", 480, 162, { characterSpacing: 1 });

  doc.moveTo(40, 174).lineTo(555, 174).strokeColor("#1a1a1a").lineWidth(0.5).stroke();

  let y = 182;
  orders.slice(0, 40).forEach((order, i) => {
    if (y > 760) { doc.addPage(); y = 40; }
    const bg = i % 2 === 0 ? "#fafafa" : "#ffffff";
    doc.rect(40, y - 3, 515, 18).fill(bg);

    doc.fillColor(gold).font("Helvetica").fontSize(8).text(order.orderId, 40, y);
    const name = order.user ? `${order.user.firstName} ${order.user.lastName}` : "—";
    doc.fillColor(dark).text(name.substring(0, 18), 140, y);
    doc.text(new Date(order.createdAt).toLocaleDateString("en-IN"), 290, y);
    doc.text(order.paymentMethod, 370, y);
    doc.fillColor(gold).font("Helvetica-Bold").text(`Rs.${order.grandTotal.toLocaleString("en-IN")}`, 480, y);

    doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor("#eeeeee").lineWidth(0.3).stroke();
    y += 18;
  });

  // Footer
  doc.moveTo(40, 800).lineTo(555, 800).strokeColor(gold).lineWidth(0.8).stroke();
  doc.fillColor("#888").font("Helvetica").fontSize(8)
     .text("© 2026 Royal Mist Fragrances. Generated on " + new Date().toLocaleDateString("en-IN"), 40, 810, { align: "center", width: 515 });

  doc.end();
}

// ── Helper: Generate Excel (CSV) ─────────────────────────────────
function generateExcel(res, orders, { totalRevenue, totalOrders, totalDiscount, from, to }) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=sales-report-${Date.now()}.csv`);

  const rows = [
    ["ROYAL MIST — SALES REPORT"],
    [`Period: ${from.toLocaleDateString("en-IN")} to ${to.toLocaleDateString("en-IN")}`],
    [],
    ["SUMMARY"],
    ["Total Revenue", `Rs.${totalRevenue.toLocaleString("en-IN")}`],
    ["Total Orders", totalOrders],
    ["Total Discount", `Rs.${totalDiscount.toLocaleString("en-IN")}`],
    ["Avg Order Value", totalOrders > 0 ? `Rs.${Math.round(totalRevenue/totalOrders).toLocaleString("en-IN")}` : "Rs.0"],
    [],
    ["ORDER DETAILS"],
    ["Order ID", "Customer Name", "Email", "Date", "Payment Method", "Status", "Items", "Subtotal", "Discount", "Grand Total"],
    ...orders.map(o => [
      o.orderId,
      o.user ? `${o.user.firstName} ${o.user.lastName}` : "—",
      o.user?.email || "—",
      new Date(o.createdAt).toLocaleDateString("en-IN"),
      o.paymentMethod,
      o.orderStatus,
      o.items.length,
      o.totalAmount,
      o.discount || 0,
      o.grandTotal,
    ]),
  ];

  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  res.send(csv);
}

module.exports = { getSalesReportController, downloadSalesReportController };


