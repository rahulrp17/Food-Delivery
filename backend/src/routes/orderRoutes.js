import express from "express";
import {
  placeOrder,
  userOrders,
  listOrders,
  updateStatus,
} from "../controllers/orderController.js";
import authMiddleware, { adminMiddleware } from "../middleware/auth.js";

const orderRouter = express.Router();

orderRouter.post("/placeOrder", authMiddleware, placeOrder);
orderRouter.post("/verify", (req, res) => {
  res.status(410).json({
    error: {
      code: "LEGACY_VERIFICATION_DISABLED",
      message:
        "Order verification without server-side payment confirmation is disabled. Use Stripe checkout and the verified payment flow.",
      requestId: req.id,
    },
  });
});
orderRouter.post("/userOrders", authMiddleware, userOrders);
orderRouter.get("/listOrders", authMiddleware, adminMiddleware("admin"), listOrders);
orderRouter.post("/status", authMiddleware, adminMiddleware("admin"), updateStatus);

export default orderRouter;
