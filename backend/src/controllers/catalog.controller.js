import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { toImageUrl } from "../utils/image.js";
import { sendCached } from "../utils/cache.js";
import {
  createCategory,
  createProduct,
  duplicateProduct,
  deleteCategory,
  deleteProduct,
  getProduct,
  getProductAdmin,
  getRelatedProducts,
  listCategories,
  listProducts,
  updateCategory,
  updateProduct,
  updateProductStock,
  bulkUpdateProducts,
  reorderCategory,
} from "../services/catalog.service.js";

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await listCategories();
  sendCached(req, res, { categories });
});

export const getProducts = asyncHandler(async (req, res) => {
  const result = await listProducts(req.query);
  sendCached(req, res, result);
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const result = await getProduct(req.params.slug);
  sendCached(req, res, result);
});

export const getRelated = asyncHandler(async (req, res) => {
  const items = await getRelatedProducts(req.params.slug, req.query.limit || 8);
  sendCached(req, res, { items });
});

export const searchProducts = asyncHandler(async (req, res) => {
  const result = await listProducts(req.query);
  sendCached(req, res, result);
});

export const adminGetCategories = asyncHandler(async (req, res) => {
  const categories = await listCategories({ activeOnly: false });
  res.json({ data: { categories } });
});

export const adminCreateCategory = asyncHandler(async (req, res) => {
  const category = await createCategory(req.body);
  res.status(201).json({ data: { category } });
});

export const adminUpdateCategory = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.id, req.body);
  res.json({ data: { category } });
});

export const adminDeleteCategory = asyncHandler(async (req, res) => {
  const result = await deleteCategory(req.params.id);
  res.json({ data: result });
});

export const adminGetProducts = asyncHandler(async (req, res) => {
  const result = await listProducts(req.query);
  res.json({ data: result });
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await getProductAdmin(req.params.id);
  res.json({ data: { product } });
});

export const adminCreateProduct = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body);
  res.status(201).json({ data: { product } });
});

export const adminUpdateProduct = asyncHandler(async (req, res) => {
  const product = await updateProduct(req.params.id, req.body);
  res.json({ data: { product } });
});

export const adminDuplicateProduct = asyncHandler(async (req, res) => {
  const product = await duplicateProduct(req.params.id);
  res.status(201).json({ data: { product } });
});

export const adminDeleteProduct = asyncHandler(async (req, res) => {
  const result = await deleteProduct(req.params.id);
  res.json({ data: result });
});

export const adminUpdateStock = asyncHandler(async (req, res) => {
  const product = await updateProductStock(req.params.id, {
    ...req.body,
    actorUserId: req.user._id,
  });
  res.json({ data: { product } });
});

export const adminBulkUpdateProducts = asyncHandler(async (req, res) => {
  const result = await bulkUpdateProducts({
    ids: req.body.ids,
    patch: {
      stock: req.body.stock,
      delta: req.body.delta,
      isAvailable: req.body.isAvailable,
      categoryId: req.body.categoryId,
    },
    actorUserId: req.user._id,
  });
  res.json({ data: result });
});

export const adminUploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("An image file is required");
  }

  res.status(201).json({
    data: {
      file: {
        filename: req.file.filename,
        url: toImageUrl(req.file.filename),
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    },
  });
});

export const adminReorderCategory = asyncHandler(async (req, res) => {
  const category = await reorderCategory(req.params.id, req.body.direction);
  res.json({ data: { category } });
});
