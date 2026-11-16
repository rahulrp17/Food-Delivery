import bcrypt from "bcrypt";
import userModel from "../models/user.model.js";

export const createAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Admin seed skipped: ADMIN_EMAIL/ADMIN_PASSWORD not set");
    return;
  }

  const existing = await userModel.findOne({ email });
  if (existing) {
    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await userModel.create({
    name: "admin",
    email,
    passwordHash: hashedPassword,
    role: "admin",
    cartData: {},
  });

  console.log("Admin user created");
};
