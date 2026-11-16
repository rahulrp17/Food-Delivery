import { Router } from "express";
import { authenticate, optionalAuth } from "../../middleware/authenticate.js";
import { identifyCartOwner } from "../../middleware/cartOwner.js";
import { writeLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import {
  addCartItemSchema,
  applyCouponSchema,
  cartItemParamsSchema,
  mergeCartSchema,
  updateCartItemSchema,
} from "../../validators/cart.schema.js";
import {
  addCartItemController,
  applyCouponController,
  clearCartController,
  getCartController,
  mergeCartController,
  removeCartItemController,
  removeCouponController,
  updateCartItemController,
} from "../../controllers/cart.controller.js";

const cartRouter = Router();

cartRouter.use(optionalAuth, identifyCartOwner);

cartRouter.get("/", getCartController);
cartRouter.post("/items", writeLimiter, validate({ body: addCartItemSchema }), addCartItemController);
cartRouter.patch(
  "/items/:productId",
  writeLimiter,
  validate({ params: cartItemParamsSchema, body: updateCartItemSchema }),
  updateCartItemController
);
cartRouter.delete(
  "/items/:productId",
  writeLimiter,
  validate({ params: cartItemParamsSchema }),
  removeCartItemController
);
cartRouter.post("/merge", authenticate, writeLimiter, validate({ body: mergeCartSchema }), mergeCartController);
cartRouter.post("/coupon", writeLimiter, validate({ body: applyCouponSchema }), applyCouponController);
cartRouter.delete("/coupon", writeLimiter, removeCouponController);
cartRouter.delete("/", writeLimiter, clearCartController);

export default cartRouter;
