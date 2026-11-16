import fs from "node:fs/promises";
import path from "node:path";
import foodModel from "../models/foodmodel.js";
import Category from "../models/category.model.js";
import { uploadsDir } from "../middleware/upload.js";
import ApiError from "../utils/apiError.js";
import { slugify, uniqueSlug } from "../utils/slug.js";

const resolveLegacyCategory = async (name) => {
  const trimmed = String(name).trim();
  const slug = slugify(trimmed);

  let category = await Category.findOne({
    $or: [{ name: trimmed }, { slug }],
  });

  if (!category) {
    category = await Category.create({
      name: trimmed,
      slug: await uniqueSlug(Category, slug),
    });
    return category;
  }

  if (category.deletedAt) {
    category.deletedAt = null;
    category.isActive = true;
    await category.save();
  }

  return category;
};

const addFood = async (req, res, next) => {
  try {
    if (!req.file) {
      throw ApiError.badRequest("A product image is required");
    }

    const { name, description, price, category } = req.body;

    if (!name || !description || !category) {
      throw ApiError.badRequest("Name, description, and category are required");
    }

    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      throw ApiError.badRequest("Price must be a positive number");
    }

    const categoryDoc = await resolveLegacyCategory(category);
    const productName = String(name).trim();

    const food = await foodModel.create({
      name: productName,
      slug: await uniqueSlug(foodModel, productName),
      description: String(description).trim(),
      price: priceNumber,
      pricePaise: Math.round(priceNumber * 100),
      category: categoryDoc.name,
      categoryId: categoryDoc._id,
      stock: 50,
      isAvailable: true,
      image: req.file.filename,
    });

    res.status(201).json({ message: "Food added successfully", success: true, data: food });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

const listFood = async (req, res, next) => {
  try {
    const food = await foodModel.find().lean();
    const items = food.map((item) => ({
      ...item,
      price:
        item.price ??
        (Number.isFinite(item.pricePaise) ? item.pricePaise / 100 : 0),
    }));

    res.json({ message: "Food list fetched successfully", success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const removeFood = async (req, res, next) => {
  try {
    const { _id } = req.body;
    if (!_id) {
      throw ApiError.badRequest("Product id is required");
    }

    const food = await foodModel.findById(_id);
    if (!food) {
      throw ApiError.notFound("Product not found");
    }

    await foodModel.findByIdAndDelete(_id);

    if (food.image) {
      const imagePath = path.join(uploadsDir, path.basename(food.image));
      await fs.unlink(imagePath).catch(() => {});
    }

    res.json({ message: "Food deleted successfully", success: true, data: food });
  } catch (error) {
    next(error);
  }
};

export { addFood, listFood, removeFood };
