const {
  getCategoriesService,
  addCategoryService,
  getCategoryByIdService,
  editCategoryService,
  deleteCategoryService,
} = require("../../services/admin/categoryService");

// LIST PAGE
const getCategoriesController = async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const search = req.query.search || "";

    const data = await getCategoriesService({ page, search });

    res.render("admin/categories", { ...data });
  } catch (err) {
    console.error("getCategoriesController error:", err);
    res.status(500).send("Server error");
  }
};

// ADD PAGE - GET
const getAddCategoryController = (req, res) => {
  res.render("admin/addCategory", { errors: {}, old: {} });
};

// ADD - POST
const postAddCategoryController = async (req, res) => {
  try {
    await addCategoryService(req.body);
    res.json({ success: true, message: "Category added successfully." });
  } catch (err) {
    if (err.isValidation) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error("postAddCategoryController error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// EDIT PAGE - GET
const getEditCategoryController = async (req, res) => {
  try {
    const category = await getCategoryByIdService(req.params.id);
    res.render("admin/editCategory", { category, errors: {}, old: category });
  } catch (err) {
    console.error("getEditCategoryController error:", err);
    res.redirect("/admin/categories");
  }
};

// EDIT - POST
const postEditCategoryController = async (req, res) => {
  try {
    await editCategoryService(req.params.id, req.body);
    res.json({ success: true, message: "Category updated successfully." });
  } catch (err) {
    if (err.name || err.description) {
      return res.status(400).json({ success: false, errors: err });
    }
    console.error("postEditCategoryController error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

//  DELETE 
const deleteCategoryController = async (req, res) => {
  try {
    await deleteCategoryService(req.params.id);
    res.json({ success: true, message: "Category deleted successfully." });
  } catch (err) {
    console.error("deleteCategoryController error:", err);
    res.json({ success: false, message: err.message || "Something went wrong." });
  }
};

module.exports = {
  getCategoriesController,
  getAddCategoryController,
  postAddCategoryController,
  getEditCategoryController,
  postEditCategoryController,
  deleteCategoryController,
};