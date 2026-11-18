import "dotenv/config";
import mongoose from "mongoose";
import Category from "../src/models/category.model.js";
import Product from "../src/models/product.model.js";
import Cart from "../src/models/cart.model.js";
import User from "../src/models/user.model.js";

/**
 * Removes E2E/Playwright leftovers from a database.
 *
 * Soft-deletes test categories and products (so orders keep their references)
 * and pulls the affected products out of carts and wishlists. Run with
 * --dry-run to preview what would change.
 *
 * Usage: MONGO_URI=... npm run cleanup:test [-- --dry-run]
 */

const TEST_CATEGORY = {
  $or: [
    { slug: /^e2e-/ },
    { slug: /^toast-test/ },
    { name: /^e2e /i },
    { name: /^toast test/i },
  ],
};

const TEST_PRODUCT = {
  $or: [{ slug: /^e2e-/ }, { name: /^e2e /i }, { slug: /^toast-/ }, { name: /^toast /i }],
};

const dryRun = process.argv.includes("--dry-run");

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  const categories = await Category.find({ ...TEST_CATEGORY, deletedAt: null });
  const categoryIds = categories.map((category) => category._id);

  const products = await Product.find({
    deletedAt: null,
    $or: [...TEST_PRODUCT.$or, { categoryId: { $in: categoryIds } }],
  });

  const productIds = products.map((product) => product._id);

  console.log(
    `Found ${categories.length} test categories and ${products.length} test products.`
  );
  categories.forEach((category) => console.log(`  category: ${category.name} (${category.slug})`));
  products.forEach((product) => console.log(`  product:  ${product.name} (${product.slug})`));

  if (dryRun) {
    console.log("Dry run: nothing changed.");
    await mongoose.disconnect();
    return;
  }

  const now = new Date();

  if (categoryIds.length > 0) {
    await Category.updateMany(
      { _id: { $in: categoryIds } },
      { $set: { deletedAt: now, isActive: false } }
    );
  }

  if (productIds.length > 0) {
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { deletedAt: now, isAvailable: false } }
    );

    const carts = await Cart.updateMany(
      {},
      { $pull: { items: { productId: { $in: productIds } } } }
    );
    const users = await User.updateMany(
      {},
      { $pull: { wishlist: { $in: productIds } } }
    );

    console.log(
      `Cleaned ${carts.modifiedCount} cart(s) and ${users.modifiedCount} wishlist(s).`
    );
  }

  console.log(
    `Removed ${categories.length} test categories and ${products.length} test products.`
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Cleanup failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
