import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { writeLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import {
  cancelMyOrder,
  getMyOrder,
  getMyOrders,
  placeOrder,
  reorderMyOrder,
} from "../../controllers/order.controller.js";
import {
  cancelOrderSchema,
  createOrderSchema,
  orderIdParamsSchema,
  orderListQuerySchema,
} from "../../validators/order.schema.js";

const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.post("/", writeLimiter, validate({ body: createOrderSchema }), placeOrder);
orderRouter.get("/", validate({ query: orderListQuerySchema }), getMyOrders);
orderRouter.get("/:id", validate({ params: orderIdParamsSchema }), getMyOrder);
orderRouter.post(
  "/:id/cancel",
  writeLimiter,
  validate({ params: orderIdParamsSchema, body: cancelOrderSchema }),
  cancelMyOrder
);
orderRouter.post(
  "/:id/reorder",
  writeLimiter,
  validate({ params: orderIdParamsSchema }),
  reorderMyOrder
);

export default orderRouter;
