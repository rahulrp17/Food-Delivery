import "dotenv/config";
import mongoose from "mongoose";
import Category from "../src/models/category.model.js";
import Product from "../src/models/product.model.js";

const CHICKEN_PATTERN = /chicken|chiken/i;

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  const chicken =
    (await Category.findOne({ slug: "chicken" })) ||
    (await Category.create({
      name: "Chicken",
      slug: "chicken",
      description: "Tender chicken dishes, cooked to order.",
      sortOrder: 0,
      isActive: true,
    }));

  const chickenProducts = await Product.find({
    deletedAt: null,
    name: CHICKEN_PATTERN,
  }).sort({ isFeatured: -1, ratingAvg: -1 });

  let reassigned = 0;

  for (const product of chickenProducts) {
    if (String(product.categoryId) !== String(chicken._id)) {
      product.categoryId = chicken._id;
      await product.save();
      reassigned += 1;
    }
  }

  const refreshImages = process.env.REFRESH_CATEGORY_IMAGES === "1";

  const heroImage =
    chickenProducts.find((product) => product.image && /rolls/i.test(product.name)) ||
    chickenProducts.find((product) => product.image);

  if (heroImage?.image && (!chicken.image || refreshImages)) {
    chicken.image = heroImage.image;
    await chicken.save();
  }

  const categories = await Category.find({ deletedAt: null });

  for (const category of categories) {
    if (category.slug === "chicken") continue;
    if (category.image && !refreshImages) continue;

    const product = await Product.findOne({
      categoryId: category._id,
      deletedAt: null,
      image: { $nin: ["", null] },
    }).sort({ isFeatured: -1, ratingAvg: -1 });

    if (product?.image) {
      category.image = product.image;
      await category.save();
    } else if (refreshImages) {
      category.image = "";
      await category.save();
    }
  }

  const totalChicken = await Product.countDocuments({
    deletedAt: null,
    categoryId: chicken._id,
  });

  console.log(
    `Chicken category ready. Reassigned ${reassigned} product(s), ${totalChicken} total in category.`
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
