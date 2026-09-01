const Product = require('../../model/productSchema');

const PAGE_SIZE = 5;

// LIST
const getProductsService = async ({ page = 1, search = '' }) => {
  const query = { isDeleted: false };

  if (search.trim()) {
    query.$or = [
      { name:          { $regex: search.trim(), $options: 'i' } },
      { fragranceType: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const total      = await Product.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage   = Math.min(Math.max(1, page), totalPages);

  const products = await Product.find(query)
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);



  const activeCount    = await Product.countDocuments({ isDeleted: false, isActive: true });
 const allProducts = await Product.find({ isDeleted: false }, 'volumes');
const lowStockCount = allProducts.filter(p => {
  const total = p.volumes 
    ? p.volumes.reduce((sum, v) => sum + (v.stock || 0), 0) 
    : 0;
  return total <= 5;
}).length;
  return {
    products,
    total,
    totalPages,
    currentPage: safePage,
    pageSize: PAGE_SIZE,
    search,
    activeCount,
    lowStockCount,
  };
};

// ADD
const addProductService = async (body, files) => {
  const { name, description, category, fragranceType, stock, volumes } = body;

  if (!name || !name.trim())   throw new Error('Product name is required.');
  if (!category)                throw new Error('Category is required.');
  if (!fragranceType)           throw new Error('Fragrance type is required.');

  let parsedVolumes = [];
  try {
    parsedVolumes = JSON.parse(volumes);
  } catch(e) {
    throw new Error('Invalid volumes data.');
  }

  if (!parsedVolumes.length) throw new Error('At least one volume is required.');
  if (!files || files.length < 3) throw new Error('Minimum 3 images required.');

  const imageUrls = files.map(f => f.path);
const product = await Product.create({
  name:          name.trim(),
  description:   description ? description.trim() : '',
  category,
  fragranceType,
  volumes:       parsedVolumes, // ← volumes has stock inside!
  images:        imageUrls,
});

  return product;
};

// SOFT DELETE
const deleteProductService = async (id) => {
  const product = await Product.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!product) throw new Error('Product not found or already deleted.');
  return product;
};

// GET BY ID
const getProductByIdService = async (id) => {
  const product = await Product.findOne({ _id: id, isDeleted: false })
    .populate('category', 'name');
  if (!product) throw new Error('Product not found.');
  return product;
};

// UPDATE
const updateProductService = async (id, body, files) => {
  const { name, description, category, fragranceType, stock, volumes, existingImages } = body;

  if (!name || !name.trim())   throw new Error('Product name is required.');
  if (!category)                throw new Error('Category is required.');
  if (!fragranceType)           throw new Error('Fragrance type is required.');

  let parsedVolumes = [];
  try {
    parsedVolumes = JSON.parse(volumes);
  } catch(e) {
    throw new Error('Invalid volumes data.');
  }
  if (!parsedVolumes.length) throw new Error('At least one volume is required.');

  let keptImages = [];
  if (existingImages) {
    keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
  }
  const newImages = files ? files.map(f => f.path) : [];
  const allImages = [...keptImages, ...newImages];

  if (allImages.length < 3) throw new Error('Minimum 3 images required.');

  const product = await Product.findOneAndUpdate(
  { _id: id, isDeleted: false },
  {
    name:          name.trim(),
    description:   description ? description.trim() : '',
    category,
    fragranceType,
    volumes:       parsedVolumes, // ← volumes has stock inside now!
    images:        allImages,
  },
  { new: true }
);

  if (!product) throw new Error('Product not found.');
  return product;
};

// TOGGLE LIST/UNLIST
const toggleProductStatusService = async (id) => {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw new Error('Product not found.');
  product.isActive = !product.isActive;
  await product.save();
  return product;
};

module.exports = {
  getProductsService,
  addProductService,
  deleteProductService,
  getProductByIdService,
  updateProductService,
   toggleProductStatusService,
};