const Category = require("../../model/categorySchema");

const PAGE_SIZE = 5;


const validationError = (errors) => {
  const err = new Error("Validation failed");
  err.isValidation = true;
  err.errors = errors;
  return err;
};




// LIST — search + pagination + sort desc
const getCategoriesService = async ({ page = 1, search = "" }) => {
  const query = { isDeleted: false };

  if (search.trim()) {
    query.$or = [
      { name:        { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const total      = await Category.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage   = Math.min(Math.max(1, page), totalPages);

  const categories = await Category.find(query)
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  const activeListings = await Category.countDocuments({ isDeleted: false, isActive: true });

  return { categories, total, totalPages, currentPage: safePage, pageSize: PAGE_SIZE, search, activeListings };
};

// ADD
const addCategoryService = async ({ name, description }) => {
  if (!name || !name.trim()) {
    throw validationError({ name: "Category name is required." });
  }

  const trimmedName = name.trim();

  const existing = await Category.findOne({
    name: { $regex: `^${trimmedName}$`, $options: "i" },
  });

  if (existing) {
    if (existing.isDeleted) {
      existing.isDeleted = false;
      existing.description = description ? description.trim() : existing.description;
      await existing.save();
      return existing;
    }
    //
    throw validationError({ name: "Category name already exists." });
  }


  const category = await Category.create({
    name: trimmedName,
    description: description ? description.trim() : "",
  });

  return category;
};

// GET SINGLE
const getCategoryByIdService = async (id) => {
  const category = await Category.findOne({ _id: id, isDeleted: false });
  if (!category) throw new Error("Category not found.");
  return category;
};

// EDIT
const editCategoryService = async (id, { name, description }) => {
  if (!name || !name.trim()) {
    throw validationError({ name: "Category name is required." });
  }

  const trimmedName = name.trim();

  const existing = await Category.findOne({
    name: { $regex: `^${trimmedName}$`, $options: "i" },
    isDeleted: false,
    _id: { $ne: id },
  });

  if (existing) {
     throw validationError({ name: "Another category with this name already exists." });
  }

  const updated = await Category.findByIdAndUpdate(
    id,
    { name: trimmedName, description: description ? description.trim() : "" },
     { returnDocument: "after" } 
  );

  if (!updated) throw new Error("Category not found.");
  return updated;
};

// SOFT DELETE
// SOFT DELETE — category + hide related products
const deleteCategoryService = async (id) => {
  const Product = require("../../model/productSchema");

  const category = await Category.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, isActive: false },
    { returnDocument: "after" }
  );

  if (!category) throw new Error("Category not found or already deleted.");

  // Hide all products under this category from user side
  await Product.updateMany(
    { category: id },
    { $set: { isActive: false } }
  );

  return category;
};

module.exports = {
  getCategoriesService,
  addCategoryService,
  getCategoryByIdService,
  editCategoryService,
  deleteCategoryService,
};