// utils/createAdmin.js
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";

export const createAdminUser = async () => {
  const existing = await userModel.findOne({ email: "admin@gmail.com" });
  if (existing) {
   
    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash("12345678", 10);

  const admin = new userModel({
    name: "admin",
    email: "admin@gmail.com",
    password: hashedPassword,
    role: "admin",
    cartData: {}
  });

  await admin.save();
 
  console.log("✅ Admin user created: admin@gmail.com / 12345678");
};
