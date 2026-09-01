const {
  getProductsService,
  addProductService,
  deleteProductService,
   getProductByIdService,
  updateProductService,
   toggleProductStatusService,
} = require('../../services/admin/productService');
const Category = require('../../model/categorySchema');

// LIST
const getProductsController = async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const data   = await getProductsService({ page, search });
    res.render('admin/products', { ...data });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// ADD - GET
const getAddProductController = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });
    res.render('admin/addProduct', { categories });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// ADD - POST
const postAddProductController = async (req, res) => {
  try {
    await addProductService(req.body, req.files);
    res.json({ success: true, message: 'Product added successfully.' });
  } catch (err) {
    return res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to add product.' 
    });
  }
};

// DELETE
const deleteProductController = async (req, res) => {
  try {
    await deleteProductService(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    res.json({ success: false, message: err.message || 'Something went wrong.' });
  }
};


// EDIT - GET
const getEditProductController = async (req, res) => {
  try {
    const product    = await getProductByIdService(req.params.id);
    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });
    res.render('admin/editProduct', { product, categories });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// EDIT - POST
const postEditProductController = async (req, res) => {
  if (req.multerError) {
    return res.status(400).json({ success: false, message: req.multerError.message });
  }
  try {
    await updateProductService(req.params.id, req.body, req.files);
    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update product.'
    });
  }
};


const toggleProductStatusController = async (req, res) => {
  try {
    const product = await toggleProductStatusService(req.params.id);
    res.json({ 
      success: true, 
      isActive: product.isActive,
      message: product.isActive ? 'Product listed successfully.' : 'Product unlisted successfully.'
    });
  } catch (err) {
    res.json({ success: false, message: err.message || 'Something went wrong.' });
  }
};

module.exports = {
  getProductsController,
  getAddProductController,
  postAddProductController,
  deleteProductController,
  getEditProductController,
  postEditProductController,
  toggleProductStatusController
};