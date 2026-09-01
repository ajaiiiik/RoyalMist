
const User = require("../../model/userSchema");
const { adminSigninService } = require("../../services/admin/adminService");

const adminSigninController = async (req, res) => {
  try {
    const result = await adminSigninService(req.body, req);
    return res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    console.error("Admin signin error:", err);
    return res.status(400).json({ 
        success: false,
         message: err
        });
  }
};

const PAGE_SIZE = 5;

const getCustomersController = async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const query  = { role: { $ne: "admin" } };

    if (search.trim()) {
      query.$or = [
        { firstName: { $regex: search.trim(), $options: "i" } },
        { lastName:  { $regex: search.trim(), $options: "i" } },
        { email:     { $regex: search.trim(), $options: "i" } },
      ];
    }

    const total      = await User.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage   = Math.min(Math.max(1, page), totalPages);

    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("firstName lastName email isBlocked createdAt");

    res.render("admin/customers", {
      customers,
      currentPage:  safePage,
      totalPages,
      total,
      search,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error("getCustomersController error:", err);
    res.status(500).send("Server error");
  }
};

const blockUserController = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    );
    if (!user) return res.json({ success: false, message: "User not found" });
    res.json({ success: true, message: `${user.firstName} has been blocked` });
  } catch (err) {
    console.error("blockUserController error:", err);
    res.json({ success: false, message: "Something went wrong" });
  }
};

const unblockUserController = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    );
    if (!user) return res.json({ success: false, message: "User not found" });
    res.json({ success: true, message: `${user.firstName} has been unblocked` });
  } catch (err) {
    console.error("unblockUserController error:", err);
    res.json({ success: false, message: "Something went wrong" });
  }
};


const getDashboardController = async (req, res) => {
  try {
    const Order   = require("../../model/orderSchema");
    const now     = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      totalOrders,
      monthlyOrders,
      allOrders,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      Order.countDocuments({}),
      Order.find({ createdAt: { $gte: firstOfMonth }, orderStatus: { $nin: ["Cancelled"] } }).lean(),
      Order.find({ orderStatus: { $nin: ["Cancelled"] } }).lean(),
    ]);

    const totalRevenue    = allOrders.reduce((s, o) => s + o.grandTotal, 0);
    const monthlyRevenue  = monthlyOrders.reduce((s, o) => s + o.grandTotal, 0);

    const [delivered, pending, shipped, cancelled] = await Promise.all([
      Order.countDocuments({ orderStatus: "Delivered" }),
      Order.countDocuments({ orderStatus: "Pending" }),
      Order.countDocuments({ orderStatus: { $in: ["Shipped", "Processing"] } }),
      Order.countDocuments({ orderStatus: "Cancelled" }),
    ]);

    res.render("admin/dashboard", {
      totalCustomers,
      totalOrders,
      totalRevenue,
      monthlyRevenue,
      delivered,
      pending,
      shipped,
      cancelled,
    });
  } catch (err) {
    console.error("getDashboardController error:", err);
    res.status(500).send("Server error");
  }
};
module.exports = { 
  adminSigninController,
    getDashboardController, 
  getCustomersController,
  blockUserController,
  unblockUserController
};