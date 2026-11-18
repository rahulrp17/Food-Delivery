import "dotenv/config";
import mongoose from "mongoose";
import Category from "../src/models/category.model.js";
import Product from "../src/models/product.model.js";

/**
 * Seeds the full 30-dish menu.
 *
 * Images are served from the frontend's /images folder so they survive a
 * backend redeploy (Render's disk is ephemeral). The script is idempotent:
 * existing dishes are updated in place, missing ones are created, and stock,
 * availability and review data are left untouched.
 *
 * Usage: MONGO_URI=... npm run seed:catalog
 */

const CATEGORIES = [
  { name: "Salad", slug: "salad", description: "Crisp salads, leaves and dressings.", sortOrder: 1 },
  { name: "Rolls", slug: "rolls", description: "Warm wraps rolled to order.", sortOrder: 2 },
  { name: "Sandwich", slug: "sandwich", description: "Stacked sandwiches on fresh bread.", sortOrder: 3 },
  { name: "Pasta", slug: "pasta", description: "Pasta tossed in slow-simmered sauces.", sortOrder: 4 },
  { name: "Noodles", slug: "noodles", description: "Wok-tossed noodles with fresh vegetables.", sortOrder: 5 },
  { name: "Pure Veg", slug: "pure-veg", description: "Vegetable-led plates from the kitchen.", sortOrder: 6 },
  { name: "Desserts", slug: "deserts", description: "Ice creams and sweet finishes.", sortOrder: 7 },
  { name: "Cake", slug: "cake", description: "Cakes by the slice.", sortOrder: 8 },
  { name: "Chicken", slug: "chicken", description: "Chicken-led plates from the kitchen.", sortOrder: 9 },
];

const DISHES = [
  {
    name: "Greek Salad",
    slug: "greek-salad",
    category: "salad",
    image: 1,
    price: 249,
    isVeg: true,
    prepTimeMinutes: 15,
    shortDescription: "Cucumber, tomato, olives and feta with oregano dressing.",
    description:
      "Crunchy cucumber, ripe tomatoes, red onion, Kalamata olives and crumbled feta, tossed in a lemon-oregano vinaigrette.",
    tags: ["salad", "mediterranean", "fresh"],
  },
  {
    name: "Veg Salad",
    slug: "veg-salad",
    category: "salad",
    image: 2,
    price: 199,
    isVeg: true,
    prepTimeMinutes: 12,
    shortDescription: "Garden vegetables and lettuce in a light lemon dressing.",
    description:
      "A clean, everyday salad of garden vegetables, crisp lettuce and herbs, finished with a light lemon dressing.",
    tags: ["salad", "vegetarian", "light"],
  },
  {
    name: "Clover Salad",
    slug: "clover-salad",
    category: "salad",
    image: 3,
    price: 229,
    isVeg: true,
    prepTimeMinutes: 15,
    shortDescription: "Sprouts, greens and seeds with a honey-lime dressing.",
    description:
      "Clover sprouts, baby greens, cucumber and toasted seeds with a honey-lime dressing for a fresh, nutty crunch.",
    tags: ["salad", "sprouts", "healthy"],
  },
  {
    name: "Chicken Salad",
    slug: "chiken-salad",
    category: "chicken",
    image: 4,
    price: 299,
    isVeg: false,
    prepTimeMinutes: 20,
    shortDescription: "Grilled chicken over greens with a mustard vinaigrette.",
    description:
      "Sliced grilled chicken over crisp greens, cherry tomatoes and cucumber, dressed with a wholegrain mustard vinaigrette.",
    tags: ["salad", "chicken", "protein"],
  },
  {
    name: "Lasagna Rolls",
    slug: "lasagna-rolls",
    category: "rolls",
    image: 5,
    price: 279,
    isVeg: true,
    prepTimeMinutes: 25,
    shortDescription: "Pasta sheets rolled with cheese and baked in tomato sauce.",
    description:
      "Tender pasta sheets rolled around herbed ricotta and mozzarella, baked in a slow-cooked tomato sauce.",
    tags: ["rolls", "pasta", "baked"],
  },
  {
    name: "Peri Peri Rolls",
    slug: "peri-peri-rolls",
    category: "rolls",
    image: 6,
    price: 259,
    isVeg: true,
    prepTimeMinutes: 20,
    shortDescription: "Spiced vegetables and peri peri sauce in a warm wrap.",
    description:
      "Charred vegetables and mixed peppers tossed in a smoky peri peri sauce, wrapped warm with lettuce and mayo.",
    tags: ["rolls", "spicy", "wraps"],
  },
  {
    name: "Chicken Rolls",
    slug: "chiken-rolls",
    category: "chicken",
    image: 7,
    price: 289,
    isVeg: false,
    prepTimeMinutes: 25,
    shortDescription: "Tandoori chicken, onions and chutney in a soft wrap.",
    description:
      "Tandoori-spiced chicken with pickled onions, mint chutney and crisp lettuce rolled in a soft paratha.",
    tags: ["rolls", "chicken", "tandoori"],
  },
  {
    name: "Veg Rolls",
    slug: "veg-rolls",
    category: "rolls",
    image: 8,
    price: 219,
    isVeg: true,
    prepTimeMinutes: 20,
    shortDescription: "Crunchy vegetables and chutney in a warm paratha wrap.",
    description:
      "Julienned vegetables, paneer and mint chutney wrapped in a warm paratha for a filling, portable bite.",
    tags: ["rolls", "vegetarian", "wraps"],
  },
  {
    name: "Ripple Ice Cream",
    slug: "ripple-ice-cream",
    category: "deserts",
    image: 9,
    price: 149,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "Vanilla ice cream rippled with berry sauce.",
    description:
      "Creamy vanilla ice cream swirled with a bright berry ripple and finished with fresh berries.",
    tags: ["dessert", "ice-cream", "berries"],
  },
  {
    name: "Fruit Ice Cream",
    slug: "fruit-ice-cream",
    category: "deserts",
    image: 10,
    price: 159,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "Seasonal fruit folded through smooth vanilla cream.",
    description:
      "Smooth vanilla cream loaded with pieces of seasonal fruit and a drizzle of fruit syrup.",
    tags: ["dessert", "ice-cream", "fruit"],
  },
  {
    name: "Jar Ice Cream",
    slug: "jar-ice-cream",
    category: "deserts",
    image: 11,
    price: 179,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "Layered ice cream, crumble and fruit served in a jar.",
    description:
      "Layers of vanilla ice cream, buttery crumble and macerated strawberries served in a glass jar.",
    tags: ["dessert", "ice-cream", "strawberry"],
  },
  {
    name: "Vanilla Ice Cream",
    slug: "vanilla-ice-cream",
    category: "deserts",
    image: 12,
    price: 139,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "Classic vanilla bean ice cream, churned in-house.",
    description: "A classic vanilla bean ice cream, slowly churned for a dense, creamy scoop.",
    tags: ["dessert", "ice-cream", "classic"],
  },
  {
    name: "Chicken Sandwich",
    slug: "chiken-sandwich",
    category: "chicken",
    image: 13,
    price: 249,
    isVeg: false,
    prepTimeMinutes: 20,
    shortDescription: "Grilled chicken, lettuce and mayo on toasted bread.",
    description:
      "Grilled chicken breast, crisp lettuce, tomato and garlic mayo stacked on toasted sourdough.",
    tags: ["sandwich", "chicken", "grilled"],
  },
  {
    name: "Vegan Sandwich",
    slug: "vegan-sandwich",
    category: "sandwich",
    image: 14,
    price: 219,
    isVeg: true,
    prepTimeMinutes: 15,
    shortDescription: "Roasted vegetables and hummus on wholegrain bread.",
    description:
      "Roasted vegetables, hummus, avocado and rocket on wholegrain bread, with a lemon-tahini spread.",
    tags: ["sandwich", "vegan", "healthy"],
  },
  {
    name: "Grilled Sandwich",
    slug: "grilled-sanwidch",
    category: "sandwich",
    image: 15,
    price: 199,
    isVeg: true,
    prepTimeMinutes: 15,
    shortDescription: "Cheese, vegetables and chutney pressed on the grill.",
    description:
      "Potato, cucumber, tomato and cheese with green chutney, pressed until crisp on the grill.",
    tags: ["sandwich", "grilled", "vegetarian"],
  },
  {
    name: "Bread Sandwich",
    slug: "bread-sandwidch",
    category: "sandwich",
    image: 16,
    price: 179,
    isVeg: true,
    prepTimeMinutes: 12,
    shortDescription: "Fresh bread, crunchy vegetables and a light spread.",
    description:
      "Soft sandwich bread layered with crunchy vegetables, butter and a light herb spread.",
    tags: ["sandwich", "vegetarian", "quick"],
  },
  {
    name: "Cup Cake",
    slug: "cup-cake",
    category: "cake",
    image: 17,
    price: 99,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "A soft single cupcake with vanilla buttercream.",
    description: "A soft, single-serve cupcake topped with a swirl of vanilla buttercream.",
    tags: ["cake", "dessert", "baked"],
  },
  {
    name: "Vegan Cake",
    slug: "vegan-cake",
    category: "cake",
    image: 18,
    price: 149,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "Plant-based chocolate cake with a cocoa glaze.",
    description:
      "Plant-based chocolate cake with a cocoa glaze and toasted nuts, made without dairy or eggs.",
    tags: ["cake", "vegan", "chocolate"],
  },
  {
    name: "Butter Cake",
    slug: "butter-cake",
    category: "cake",
    image: 19,
    price: 129,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "Rich butter cake with a crackly sugar top.",
    description: "A rich butter cake with a crackly sugar top and a tender, buttery crumb.",
    tags: ["cake", "dessert", "butter"],
  },
  {
    name: "Sliced Cake",
    slug: "sliced-cake",
    category: "cake",
    image: 20,
    price: 119,
    isVeg: true,
    prepTimeMinutes: 10,
    shortDescription: "A slice of the day's cake with fresh cream.",
    description:
      "A generous slice of the day's cake, layered with fresh cream and topped with seasonal fruit.",
    tags: ["cake", "dessert", "slice"],
  },
  {
    name: "Garlic Mushroom",
    slug: "garlic-mushroom",
    category: "pure-veg",
    image: 21,
    price: 229,
    isVeg: true,
    prepTimeMinutes: 20,
    shortDescription: "Mushrooms sauteed in garlic butter and herbs.",
    description:
      "Button mushrooms sauteed in garlic butter with parsley, finished with a squeeze of lemon.",
    tags: ["starter", "mushroom", "garlic"],
  },
  {
    name: "Fried Cauliflower",
    slug: "fried-cauliflower",
    category: "pure-veg",
    image: 22,
    price: 199,
    isVeg: true,
    prepTimeMinutes: 18,
    shortDescription: "Crisp cauliflower florets with a spiced yogurt dip.",
    description:
      "Cauliflower florets in a light gram-flour batter, fried until crisp and served with a spiced yogurt dip.",
    tags: ["starter", "cauliflower", "crispy"],
  },
  {
    name: "Mix Veg Pulao",
    slug: "mix-veg-pulao",
    category: "pure-veg",
    image: 23,
    price: 249,
    isVeg: true,
    prepTimeMinutes: 25,
    shortDescription: "Fragrant rice with seasonal vegetables and whole spices.",
    description:
      "Basmati rice cooked with seasonal vegetables, whole spices and ghee for a warm, fragrant one-pot meal.",
    tags: ["rice", "vegetarian", "one-pot"],
  },
  {
    name: "Rice Zucchini",
    slug: "rice-zcchini",
    category: "pure-veg",
    image: 24,
    price: 219,
    isVeg: true,
    prepTimeMinutes: 22,
    shortDescription: "Herbed rice tossed with courgette and lemon.",
    description:
      "Fluffy herbed rice tossed with pan-seared courgette, peas and lemon zest.",
    tags: ["rice", "zucchini", "light"],
  },
  {
    name: "Cheese Pasta",
    slug: "cheese-passta",
    category: "pasta",
    image: 25,
    price: 249,
    isVeg: true,
    prepTimeMinutes: 20,
    shortDescription: "Penne in a four-cheese sauce with black pepper.",
    description:
      "Penne tossed in a four-cheese sauce with cracked black pepper and a handful of fresh herbs.",
    tags: ["pasta", "cheese", "comfort"],
  },
  {
    name: "Tomato Pasta",
    slug: "tomato-pasta",
    category: "pasta",
    image: 26,
    price: 229,
    isVeg: true,
    prepTimeMinutes: 20,
    shortDescription: "Pasta in a slow-cooked tomato and basil sauce.",
    description:
      "Pasta coated in a slow-cooked tomato sauce with garlic, basil and a finishing drizzle of olive oil.",
    tags: ["pasta", "tomato", "classic"],
  },
  {
    name: "Creamy Pasta",
    slug: "creamy-pasta",
    category: "pasta",
    image: 27,
    price: 279,
    isVeg: true,
    prepTimeMinutes: 22,
    shortDescription: "Silky cream sauce, parmesan and cracked pepper.",
    description:
      "Fettuccine in a silky cream sauce with parmesan, butter and cracked pepper.",
    tags: ["pasta", "creamy", "parmesan"],
  },
  {
    name: "Chicken Pasta",
    slug: "chiken-pastaa",
    category: "chicken",
    image: 28,
    price: 299,
    isVeg: false,
    prepTimeMinutes: 25,
    shortDescription: "Grilled chicken and pasta in a herb cream sauce.",
    description:
      "Grilled chicken tossed with pasta, mushrooms and a herb cream sauce, finished with parmesan.",
    tags: ["pasta", "chicken", "creamy"],
  },
  {
    name: "Butter Noodles",
    slug: "butter-noodles",
    category: "noodles",
    image: 29,
    price: 249,
    isVeg: true,
    prepTimeMinutes: 18,
    shortDescription: "Noodles tossed in butter, garlic and spring onion.",
    description:
      "Wok-tossed noodles in a butter-garlic sauce with spring onion and a touch of chilli.",
    tags: ["noodles", "butter", "wok"],
  },
  {
    name: "Veg Noodles",
    slug: "veg-noodles",
    category: "noodles",
    image: 30,
    price: 219,
    isVeg: true,
    prepTimeMinutes: 18,
    shortDescription: "Stir-fried noodles with crunchy vegetables.",
    description:
      "Stir-fried noodles with cabbage, carrot, peppers and spring onion in a light soy sauce.",
    tags: ["noodles", "vegetarian", "stir-fry"],
  },
];

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

  const categoryBySlug = new Map();

  for (const category of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      {
        $set: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: true,
          deletedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryBySlug.set(category.slug, doc);
  }

  let created = 0;
  let updated = 0;

  for (const dish of DISHES) {
    const category = categoryBySlug.get(dish.category);
    const fields = {
      name: dish.name,
      slug: dish.slug,
      description: dish.description,
      shortDescription: dish.shortDescription,
      categoryId: category._id,
      category: category.name,
      pricePaise: dish.price * 100,
      image: `/images/food_${dish.image}.png`,
      isVeg: dish.isVeg,
      prepTimeMinutes: dish.prepTimeMinutes,
      tags: dish.tags,
    };

    const existing = await Product.findOne({
      $or: [{ slug: dish.slug }, { name: dish.name }],
    });

    if (existing) {
      await Product.updateOne(
        { _id: existing._id },
        { $set: existing.deletedAt ? { ...fields, deletedAt: null } : fields }
      );
      updated += 1;
    } else {
      await Product.create({
        ...fields,
        stock: 50,
        isAvailable: true,
        ratingAvg: 0,
        ratingCount: 0,
      });
      created += 1;
    }
  }

  for (const category of CATEGORIES) {
    const doc = categoryBySlug.get(category.slug);
    const firstDish = DISHES.find((dish) => dish.category === category.slug);
    if (!firstDish) continue;

    doc.image = `/images/food_${firstDish.image}.png`;
    await doc.save();
  }

  console.log(
    `Catalog seeded: ${created} created, ${updated} updated, ${CATEGORIES.length} categories.`
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Catalog seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
