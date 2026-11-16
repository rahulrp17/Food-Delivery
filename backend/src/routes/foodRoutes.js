import express from "express";
import { addFood, listFood, removeFood } from "../controllers/foodController.js";
import { upload } from "../middleware/upload.js";
import authMiddleware, { adminMiddleware } from "../middleware/auth.js";

const foodRouter = express.Router();

foodRouter.get("/list", listFood);
foodRouter.post("/add", authMiddleware, adminMiddleware("admin"), upload.single("image"), addFood);
foodRouter.post("/remove", authMiddleware, adminMiddleware("admin"), removeFood);

export default foodRouter;
