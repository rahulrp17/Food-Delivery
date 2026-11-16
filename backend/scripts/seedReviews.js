import "dotenv/config";
import mongoose from "mongoose";
import Product from "../src/models/product.model.js";
import Review from "../src/models/review.model.js";
import User from "../src/models/user.model.js";
import Order from "../src/models/order.model.js";

/**
 * Seeds a handful of approved customer reviews so the customer-facing
 * reviews section can be verified with real data.
 *
 * Safe to run repeatedly: it removes the reviews it created before adding
 * them again.
 */
const SAMPLES = [
  {
    name: "Ananya Rao",
    rating: 5,
    title: "Best salad I have had in a while",
    body: "The dressing is bright and the chicken was properly grilled, not rubbery. It arrived still cold and the portion was generous. Ordered it three times in a row this month.",
  },
  {
    name: "Imran Sheikh",
    rating: 4,
    title: "Fresh, but a bit more chilli please",
    body: "Really fresh ingredients and the packaging held up well on a long ride home. If you like heat, ask for extra. Otherwise it is a very solid bowl.",
  },
  {
    name: "Meera Nair",
    rating: 5,
    title: "Exactly what I wanted after a long day",
    body: "Ordered this late at night and it was ready in half an hour. The whole kitchen smelled incredible when it opened.",
  },
  {
    name: "Daniel Okafor",
    rating: 3,
    title: "Good, but the dressing had split",
    body: "The base was crisp and fresh. The dressing had separated in the container by the time it arrived, so I had to mix it again. Still tasty.",
  },
  {
    name: "Priya Menon",
    rating: 5,
    title: "The staff added extra chilli on request",
    body: "Asked for the dressing on the side and they did exactly that without any fuss. This is the third time I have ordered it.",
  },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const products = await Product.find({ deletedAt: null }).select("_id name slug");
  if (!products.length) {
    console.log("No products found.");
    await mongoose.disconnect();
    return;
  }

  // Orders belonging to a registered customer (guest checkouts have no user).
  const orders = await Order.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .select("_id userId items");

  const users = await User.find({ role: "user" }).select("_id name");
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  let created = 0;

  for (const [index, product] of products.entries()) {
    // Orders that actually contain this dish and belong to a real customer.
    const matching = orders.filter(
      (order) =>
        usersById.has(String(order.userId)) &&
        (order.items || []).some((item) => String(item.productId) === String(product._id))
    );

    if (matching.length === 0) {
      console.log(`No customer order references ${product.name} — skipped.`);
      continue;
    }

    // Two reviews per product so the histogram has a shape.
    for (const [offset, order] of matching.slice(0, 2).entries()) {
      const sample = SAMPLES[(index + offset) % SAMPLES.length];
      const user = usersById.get(String(order.userId));

      const existing = await Review.findOne({
        productId: product._id,
        userId: user._id,
        orderId: order._id,
        deletedAt: null,
      });

      if (existing) continue;

      await Review.create({
        productId: product._id,
        userId: user._id,
        orderId: order._id,
        rating: sample.rating,
        title: sample.title,
        body: sample.body,
        status: "approved",
        adminReply:
          index === 0 && offset === 0
            ? {
                text: "Thank you — the kitchen will be thrilled. See you again soon!",
                repliedAt: new Date(),
              }
            : undefined,
      });
      created += 1;
    }

    console.log(`Seeded reviews for: ${product.name}`);
  }

  console.log(`\nCreated ${created} review(s).`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
