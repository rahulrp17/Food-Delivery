import "dotenv/config";
import mongoose from "mongoose";
import Category from "../src/models/category.model.js";
import Product from "../src/models/product.model.js";
import { slugify } from "../src/utils/slug.js";

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  const legacyCategories = await mongoose.connection.db
    .collection("foods")
    .distinct("category");

  let categoriesCreated = 0;
  const categoryMap = new Map();

  for (const name of legacyCategories.filter(Boolean)) {
    const slug = slugify(name);
    const existing = await Category.findOne({ slug });
    if (existing) {
      categoryMap.set(name, existing);
      continue;
    }

    const created = await Category.create({ name, slug, isActive: true });
    categoryMap.set(name, created);
    categoriesCreated += 1;
  }

  const products = await Product.find({}).sort({ createdAt: 1 });
  const usedSlugs = new Set(products.map((product) => product.slug).filter(Boolean));

  let productsUpdated = 0;

  for (const product of products) {
    const updates = {};
    const legacyPrice = Number(product.get("price"));

    if (!Number.isFinite(product.pricePaise) || product.pricePaise === 0) {
      updates.pricePaise = Number.isFinite(legacyPrice)
        ? Math.round(legacyPrice * 100)
        : 0;
    }

    if (!product.slug) {
      const root = slugify(product.name);
      let candidate = root;
      let counter = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${root}-${counter}`;
        counter += 1;
      }
      usedSlugs.add(candidate);
      updates.slug = candidate;
    }

    if (!product.categoryId && categoryMap.has(product.category)) {
      updates.categoryId = categoryMap.get(product.category)._id;
    }

    if (!product.shortDescription) {
      updates.shortDescription = String(product.description || "").slice(0, 160);
    }
    if (!product.tags || product.tags.length === 0) {
      updates.tags = product.category ? [product.category.toLowerCase()] : [];
    }

    if (Object.keys(updates).length > 0) {
      await Product.updateOne({ _id: product._id }, { $set: updates });
      productsUpdated += 1;
    }
  }

  const rawProducts = await Product.collection.find({}).toArray();
  const nonVegPattern = /chik|chick|mutton|fish|egg|prawn|bacon|\bham\b|\bbeef\b|\bpork\b|meat/i;

  for (const raw of rawProducts) {
    const updates = {};

    if (!("stock" in raw)) updates.stock = 50;
    if (!("isAvailable" in raw)) updates.isAvailable = true;
    if (!("prepTimeMinutes" in raw)) updates.prepTimeMinutes = 25;
    if (!("ratingAvg" in raw)) updates.ratingAvg = 0;
    if (!("ratingCount" in raw)) updates.ratingCount = 0;
    if (!("isVeg" in raw)) {
      updates.isVeg = raw.category === "Pure Veg" || !nonVegPattern.test(raw.name);
    }

    if (Object.keys(updates).length > 0) {
      await Product.collection.updateOne({ _id: raw._id }, { $set: updates });
    }
  }

  await Product.collection.updateMany(
    { name: nonVegPattern, isVeg: true },
    { $set: { isVeg: false } }
  );

  console.log(
    `Catalog migration complete: ${categoriesCreated} categories created, ${productsUpdated} products updated.`
  );

  await Category.syncIndexes();
  await Product.syncIndexes();

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Catalog migration failed:", error.message);
  process.exit(1);
});
