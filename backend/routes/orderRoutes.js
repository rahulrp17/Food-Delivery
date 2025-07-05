import express from "express";
import {placeOrder, verifyOrder, userOrders, listOrders, updateStatus} from "../controllers/orderController.js"
import authMiddleware from "../middleware/auth.js";


const orderRouter=express.Router();

orderRouter.post("/placeOrder",authMiddleware,placeOrder);
orderRouter.post("/verify",verifyOrder);
orderRouter.post("/userOrders",authMiddleware,userOrders);
orderRouter.get("/listOrders",listOrders);
orderRouter.post("/status",updateStatus);

export default orderRouter