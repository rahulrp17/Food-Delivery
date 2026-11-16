import "dotenv/config";
import mongoose from "mongoose";
import Order from "../src/models/order.model.js";
import User from "../src/models/user.model.js";

mongoose.set("bufferTimeoutMS", 60000);

/**
 * Prepares a test scenario for the customer review form: finds a customer
 * who has ordered a dish and marks that order as delivered, which is the
 * condition the backend requires before it will accept a review.
 */
const targetEmail = process.argv[2];
const targetProductId = process.argv[3];

await mongoose.connect(process.env.MONGO_URI);

const user = targetEmail
  ? await User.findOne({ email: targetEmail }).select("_id name email")
  : null;

const query = { deletedAt: null };
if (user) query.userId = user._id;

const order = await Order.findOne(query).sort({ createdAt: -1 }).select("_id status userId items");

if (!order) {
  console.log("No order found.");
  await mongoose.disconnect();
  process.exit(1);
}

if (targetProductId) {
  const hasProduct = (order.items || []).some(
    (item) => String(item.productId) === String(targetProductId)
  );
  if (!hasProduct) {
    console.log("Order does not contain that product.");
    console.log("items:", JSON.stringify((order.items || []).map((i) => String(i.productId))));
    await mongoose.disconnect();
    process.exit(1);
  }
}

order.status = "delivered";
await order.save();

console.log("order:", String(order._id), "-> delivered");
console.log("customer:", String(order.userId));
console.log("products:", JSON.stringify((order.items || []).map((i) => String(i.productId))));

await mongoose.disconnect();
