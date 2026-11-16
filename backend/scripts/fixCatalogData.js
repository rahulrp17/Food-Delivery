import "dotenv/config";
import { access, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import Category from "../src/models/category.model.js";
import Product from "../src/models/product.model.js";

const UPLOAD_DIR = path.resolve("uploads");
const ASSET_DIR = path.resolve("..", "frontend", "src", "assets");

const imagePositionBySlug = {
  "greek-salad": 1,
  "veg-salad": 2,
  "clover-salad": 3,
  "chiken-salad": 4,
  "lasagna-rolls": 5,
  "peri-peri-rolls": 6,
  "chiken-rolls": 7,
  "veg-rolls": 8,
  "ripple-ice-cream": 9,
  "fruit-ice-cream": 10,
  "jar-ice-cream": 11,
  "vanilla-ice-cream": 12,
  "chiken-sandwich": 13,
  "vegan-sandwich": 14,
  "grilled-sanwidch": 15,
  "bread-sandwidch": 16,
  "cup-cake": 17,
  "vegan-cake": 18,
  "butter-cake": 19,
  "sliced-cake": 20,
  "garlic-mushroom": 21,
  "fried-cauliflower": 22,
  "mix-veg-pulao": 23,
  "rice-zcchini": 24,
  "cheese-passta": 25,
  "tomato-pasta": 26,
  "creamy-pasta": 27,
  "chiken-pastaa": 28,
  "butter-noodles": 29,
  "veg-noodles": 30,
};

const nameBySlug = {
  "veg-salad": "Veg Salad",
  "chiken-salad": "Chicken Salad",
  "chiken-rolls": "Chicken Rolls",
  "chiken-sandwich": "Chicken Sandwich",
  "chiken-pastaa": "Chicken Pasta",
  "cheese-passta": "Cheese Pasta",
  "grilled-sanwidch": "Grilled Sandwich",
  "bread-sandwidch": "Bread Sandwich",
  "rice-zcchini": "Rice Zucchini",
  "garlic-mushroom": "Garlic Mushroom",
  "tomato-pasta": "Tomato Pasta",
};

const categoryBySlug = {
  "veg-rolls": "rolls",
};

const findImage = (files, position) =>
  files.find((file) => file.endsWith(`food_${position}.png`)) || null;

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  let files = await readdir(UPLOAD_DIR);
  const missingPositions = new Set();

  for (const position of Object.values(imagePositionBySlug)) {
    if (findImage(files, position)) continue;

    const source = path.join(ASSET_DIR, `food_${position}.png`);
    const target = path.join(UPLOAD_DIR, `food_${position}.png`);

    try {
      await access(source);
      await copyFile(source, target);
      missingPositions.add(position);
    } catch {
      console.warn(`Missing source image for food_${position}.png`);
    }
  }

  if (missingPositions.size > 0) {
    files = await readdir(UPLOAD_DIR);
    console.log(`Copied ${missingPositions.size} image(s) into uploads.`);
  }

  const categories = new Map(
    (await Category.find({ deletedAt: null })).map((category) => [category.slug, category])
  );

  const products = await Product.find({ deletedAt: null });
  let imageUpdates = 0;
  let nameUpdates = 0;
  let categoryUpdates = 0;
  let skipped = 0;

  for (const product of products) {
    const position = imagePositionBySlug[product.slug];
    const nextImage = position ? findImage(files, position) : null;
    let changed = false;

    if (nextImage && product.image !== nextImage) {
      product.image = nextImage;
      imageUpdates += 1;
      changed = true;
    }

    const nextName = nameBySlug[product.slug];
    if (nextName && product.name !== nextName) {
      product.name = nextName;
      nameUpdates += 1;
      changed = true;
    }

    const nextCategorySlug = categoryBySlug[product.slug];
    const nextCategory = nextCategorySlug ? categories.get(nextCategorySlug) : null;
    if (nextCategory && String(product.categoryId) !== String(nextCategory._id)) {
      product.categoryId = nextCategory._id;
      product.category = nextCategory.name;
      categoryUpdates += 1;
      changed = true;
    }

    if (changed) await product.save();
    if (!position) skipped += 1;
  }

  console.log(
    `Catalog fixed. Images: ${imageUpdates}, names: ${nameUpdates}, categories: ${categoryUpdates}, unmatched: ${skipped}.`
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
