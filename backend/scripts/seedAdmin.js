import "dotenv/config";
import mongoose from "mongoose";
import { createAdminUser } from "../utils/createAdmin.js";

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI);
  await createAdminUser();
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Admin seed failed:", error.message);
  process.exit(1);
});
