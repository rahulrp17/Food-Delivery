import Category from "../models/category.model.js";
import InventoryLog from "../models/inventoryLog.model.js";
import Product from "../models/product.model.js";
import ApiError from "../utils/apiError.js";
import { imagePayload, toImageUrl } from "../utils/image.js";
import { slugify, uniqueSlug } from "../utils/slug.js";
import { createNotification } from "./notification.service.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_asc: { pricePaise: 1 },
  price_desc: { pricePaise: -1 },
  rating: { ratingAvg: -1, ratingCount: -1 },
  popular: { ratingCount: -1, createdAt: -1 },
};

const LOW_STOCK_THRESHOLD = 10;

const legacyPricePaise = (product) => {
  if (Number.isFinite(product.pricePaise) && product.pricePaise > 0) {
    return product.pricePaise;
  }
  const legacyPrice = Number(product.price ?? product.get?.("price"));
  return Number.isFinite(legacyPrice) ? Math.round(legacyPrice * 100) : 0;
};

const categoryPayload = (product) => {
  const category = product.categoryId;

  if (category && typeof category === "object" && category.name) {
    return { id: String(category._id), name: category.name, slug: category.slug };
  }

  if (product.category) {
    return { id: null, name: product.category, slug: slugify(product.category) };
  }

  return null;
};

export const toProductListItem = (product) => {
  const item = {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    shortDescription:
      product.shortDescription || String(product.description || "").slice(0, 160),
    image: imagePayload(product.image),
    pricePaise: legacyPricePaise(product),
    compareAtPricePaise: product.compareAtPricePaise ?? null,
    category: categoryPayload(product),
    isVeg: Boolean(product.isVeg),
    ratingAvg: product.ratingAvg ?? 0,
    ratingCount: product.ratingCount ?? 0,
    prepTimeMinutes: product.prepTimeMinutes ?? 25,
    stock: product.stock ?? 0,
    isAvailable: product.isAvailable !== false,
    isFeatured: Boolean(product.isFeatured),
    isBestseller: Boolean(product.isBestseller),
    isNew: Boolean(product.isNewArrival),
  };

  item.isOrderable = item.isAvailable && item.stock > 0;
  return item;
};

export const toProductDetail = (product) => ({
  ...toProductListItem(product),
  description: product.description || "",
  gallery: (product.gallery || []).map(imagePayload).filter(Boolean),
  allergens: product.allergens || [],
  ingredients: product.ingredients || [],
  nutrition: product.nutrition || {},
  tags: product.tags || [],
  createdAt: product.createdAt,
});

export const listCategories = async ({ activeOnly = true } = {}) => {
  const query = { deletedAt: null };
  if (activeOnly) query.isActive = true;

  const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 });

  const [counts, images] = await Promise.all([
    Product.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]),
    Product.aggregate([
      { $match: { deletedAt: null, image: { $nin: ["", null] } } },
      { $sort: { isFeatured: -1, ratingAvg: -1, createdAt: 1 } },
      { $group: { _id: "$categoryId", image: { $first: "$image" } } },
    ]),
  ]);

  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));
  const imageMap = new Map(images.map((row) => [String(row._id), row.image]));

  return categories.map((category) => {
    const payload = category.toJSON();

    return {
      ...payload,
      image: toImageUrl(payload.image || imageMap.get(String(category._id))),
      productCount: countMap.get(String(category._id)) || 0,
    };
  });
};

const buildProductQuery = async (filters, { includeArchived = false } = {}) => {
  // Archived products are soft-deleted. They are invisible to the storefront
  // and to the admin list unless the admin explicitly asks for them.
  const query = includeArchived && filters.archived ? { deletedAt: { $ne: null } } : { deletedAt: null };

  if (filters.category) {
    const category = await Category.findOne({ slug: filters.category, deletedAt: null });
    if (!category) return null;
    query.categoryId = category._id;
  }

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ name: pattern }, { description: pattern }, { tags: pattern }];
  }

  if (filters.veg !== undefined) query.isVeg = filters.veg;
  if (filters.featured !== undefined) query.isFeatured = filters.featured;
  if (filters.bestseller !== undefined) query.isBestseller = filters.bestseller;
  if (filters.new !== undefined) query.isNewArrival = filters.new;
  if (filters.inStock !== undefined) {
    query.stock = filters.inStock ? { $gt: 0 } : { $lte: 0 };
  }

  if (filters.isAvailable !== undefined) query.isAvailable = filters.isAvailable;
  if (filters.stock === "low") query.stock = { $lte: LOW_STOCK_THRESHOLD };

  if (filters.minPricePaise !== undefined || filters.maxPricePaise !== undefined) {
    query.pricePaise = {};
    if (filters.minPricePaise !== undefined) query.pricePaise.$gte = filters.minPricePaise;
    if (filters.maxPricePaise !== undefined) query.pricePaise.$lte = filters.maxPricePaise;
  }

  return query;
};

export const listProducts = async (filters, options = {}) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;

  const query = await buildProductQuery(filters, options);

  if (!query) {
    return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
  }

  const sort = SORT_OPTIONS[filters.sort] || SORT_OPTIONS.newest;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("categoryId", "name slug")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  return {
    items: products.map(toProductListItem),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const findProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug, deletedAt: null }).populate(
    "categoryId",
    "name slug"
  );

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  return product;
};

export const getProduct = async (slug) => {
  const product = await findProductBySlug(slug);
  const categoryId = product.categoryId?._id || product.categoryId;

  const related = categoryId
    ? await Product.find({
        _id: { $ne: product._id },
        categoryId,
        deletedAt: null,
      })
        .populate("categoryId", "name slug")
        .sort({ ratingAvg: -1, createdAt: -1 })
        .limit(8)
    : [];

  return {
    product: toProductDetail(product),
    related: related.map(toProductListItem),
  };
};

export const getProductAdmin = async (productId) => {
  const product = await Product.findOne({ _id: productId, deletedAt: null }).populate(
    "categoryId",
    "name slug"
  );

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  return toProductDetail(product);
};

export const getRelatedProducts = async (slug, limit = 8) => {
  const product = await findProductBySlug(slug);
  const categoryId = product.categoryId?._id || product.categoryId;

  if (!categoryId) return [];

  const related = await Product.find({
    _id: { $ne: product._id },
    categoryId,
    deletedAt: null,
  })
    .populate("categoryId", "name slug")
    .sort({ ratingAvg: -1, createdAt: -1 })
    .limit(limit);

  return related.map(toProductListItem);
};

const resolveCategory = async (categoryId) => {
  const category = await Category.findOne({ _id: categoryId, deletedAt: null });
  if (!category) {
    throw ApiError.badRequest("Category not found");
  }
  return category;
};

export const createProduct = async (data) => {
  const category = await resolveCategory(data.categoryId);
  const { isNew, ...rest } = data;
  const slug = await uniqueSlug(Product, rest.slug || rest.name);

  const product = await Product.create({
    ...rest,
    slug,
    categoryId: category._id,
    category: category.name,
    isNewArrival: Boolean(isNew),
  });

  await product.populate("categoryId", "name slug");
  return toProductDetail(product);
};

export const updateProduct = async (productId, data) => {
  const product = await Product.findOne({ _id: productId, deletedAt: null });

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const { isNew, slug, categoryId, ...rest } = data;

  if (categoryId) {
    const category = await resolveCategory(categoryId);
    product.categoryId = category._id;
    product.category = category.name;
  }

  if (slug) {
    product.slug = await uniqueSlug(Product, slug, product._id);
  }

  if (isNew !== undefined) product.isNewArrival = Boolean(isNew);

  const nextPrice = rest.pricePaise ?? product.pricePaise;
  const nextCompare =
    rest.compareAtPricePaise !== undefined ? rest.compareAtPricePaise : product.compareAtPricePaise;

  if (nextCompare !== null && nextCompare !== undefined && nextCompare <= nextPrice) {
    throw ApiError.badRequest("compareAtPricePaise must be greater than pricePaise");
  }

  Object.assign(product, rest);
  await product.save();
  await product.populate("categoryId", "name slug");

  return toProductDetail(product);
};

export const duplicateProduct = async (productId) => {
  const source = await Product.findOne({ _id: productId, deletedAt: null }).lean();

  if (!source) {
    throw ApiError.notFound("Product not found");
  }

  const baseName = String(source.name).slice(0, 110).trim();
  const name = `${baseName} (Copy)`;
  const slug = await uniqueSlug(Product, name);

  const {
    _id,
    __v,
    createdAt,
    updatedAt,
    deletedAt,
    slug: sourceSlug,
    ratingAvg,
    ratingCount,
    ...rest
  } = source;

  return Product.create({
    ...rest,
    name,
    slug,
    stock: 0,
    isAvailable: false,
    isFeatured: false,
    isBestseller: false,
    isNewArrival: false,
    ratingAvg: 0,
    ratingCount: 0,
    deletedAt: null,
  });
};

export const deleteProduct = async (productId) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, deletedAt: null },
    { $set: { deletedAt: new Date(), isAvailable: false } },
    { new: true }
  );

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  return { id: String(product._id) };
};

export const restoreProduct = async (productId) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, deletedAt: { $ne: null } },
    { $set: { deletedAt: null, isAvailable: true } },
    { new: true }
  ).populate("categoryId", "name slug");

  if (!product) {
    throw ApiError.notFound("Archived product not found");
  }

  return toProductDetail(product);
};

export const updateProductStock = async (
  productId,
  { stock, delta, actorUserId = null }
) => {
  const product = await Product.findOne({ _id: productId, deletedAt: null });

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const previousStock = product.stock;
  const nextStock = stock !== undefined ? stock : product.stock + delta;

  if (nextStock < 0) {
    throw ApiError.conflict("Stock cannot go below zero", "OUT_OF_STOCK");
  }

  product.stock = nextStock;
  await product.save();

  if (actorUserId && nextStock !== previousStock) {
    await InventoryLog.create({
      productId: product._id,
      delta: nextStock - previousStock,
      reason: nextStock > previousStock ? "restock" : "adjust",
      actorUserId,
    });
  }

  if (
    nextStock !== previousStock &&
    nextStock <= LOW_STOCK_THRESHOLD &&
    previousStock > LOW_STOCK_THRESHOLD
  ) {
    const day = new Date().toISOString().slice(0, 10);
    await createNotification({
      type: "inventory.low",
      title: `Low stock: ${product.name}`,
      body: `Only ${nextStock} left in stock.`,
      severity: nextStock === 0 ? "danger" : "warning",
      link: "/admin/products",
      metadata: { productId: String(product._id), stock: nextStock },
      dedupeKey: `inventory.low:${product._id}:${day}`,
    });
  }

  return toProductDetail(product);
};

export const bulkUpdateProducts = async ({ ids, patch, actorUserId }) => {
  const products = await Product.find({ _id: { $in: ids }, deletedAt: null });

  if (!products.length) {
    throw ApiError.notFound("No products found");
  }

  const foundIds = new Set(products.map((product) => String(product._id)));
  const missing = ids.filter((id) => !foundIds.has(String(id)));
  if (missing.length) {
    throw ApiError.notFound(`Product(s) not found: ${missing.join(", ")}`);
  }

  const hasStock = patch.stock !== undefined || patch.delta !== undefined;
  if (hasStock && (patch.isAvailable !== undefined || patch.categoryId !== undefined)) {
    throw ApiError.badRequest("Stock changes cannot be combined with availability or category updates");
  }

  for (const product of products) {
    if (hasStock) {
      await updateProductStock(String(product._id), {
        stock: patch.stock,
        delta: patch.delta,
        actorUserId,
      });
    } else {
      const data = { ...patch };
      if (data.categoryId) {
        const category = await resolveCategory(data.categoryId);
        data.categoryId = category._id;
        data.category = category.name;
      }
      await updateProduct(String(product._id), data);
    }
  }

  return { updatedCount: products.length };
};

export const createCategory = async (data) => {
  const slug = await uniqueSlug(Category, data.slug || data.name);
  const category = await Category.create({ ...data, slug });
  return category.toJSON();
};

export const updateCategory = async (categoryId, data) => {
  const category = await Category.findOne({ _id: categoryId, deletedAt: null });

  if (!category) {
    throw ApiError.notFound("Category not found");
  }

  if (data.slug) {
    category.slug = await uniqueSlug(Category, data.slug, category._id);
  }

  const { slug, ...rest } = data;
  Object.assign(category, rest);
  await category.save();

  if (data.name) {
    await Product.updateMany(
      { categoryId: category._id },
      { $set: { category: category.name } }
    );
  }

  return category.toJSON();
};

export const deleteCategory = async (categoryId) => {
  const category = await Category.findOneAndUpdate(
    { _id: categoryId, deletedAt: null },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  );

  if (!category) {
    throw ApiError.notFound("Category not found");
  }

  return { id: String(category._id) };
};

/**
 * Persists a full ordering of the category list.
 *
 * `orderedIds` is the list of category ids in the order they should appear.
 * Categories the caller did not mention keep their current relative order and
 * are appended after the ones that were sent, so a partial list never drops
 * categories out of the menu.
 */
export const reorderCategories = async (orderedIds) => {
  const categories = await Category.find({ deletedAt: null }).sort({
    sortOrder: 1,
    name: 1,
  });

  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const seen = new Set();
  const ordered = [];

  for (const id of orderedIds) {
    const key = String(id);
    if (seen.has(key)) continue;

    const category = byId.get(key);
    if (!category) {
      throw ApiError.notFound("Category not found");
    }

    seen.add(key);
    ordered.push(category);
  }

  if (!ordered.length) {
    throw ApiError.badRequest("No categories to reorder");
  }

  const remaining = categories.filter((category) => !seen.has(String(category._id)));
  const finalOrder = [...ordered, ...remaining];

  await Category.bulkWrite(
    finalOrder.map((category, index) => ({
      updateOne: {
        filter: { _id: category._id },
        update: { $set: { sortOrder: index } },
      },
    }))
  );

  return finalOrder.map((category, index) => ({
    ...category.toJSON(),
    sortOrder: index,
  }));
};

export const reorderCategory = async (categoryId, direction) => {
  const categories = await Category.find({ deletedAt: null }).sort({
    sortOrder: 1,
    name: 1,
  });

  const index = categories.findIndex((c) => String(c._id) === String(categoryId));
  if (index === -1) {
    throw ApiError.notFound("Category not found");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= categories.length) {
    return categories[index].toJSON();
  }

  const next = [...categories];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);

  const reordered = await reorderCategories(next.map((category) => String(category._id)));

  return reordered.find((category) => String(category.id) === String(categoryId));
};
