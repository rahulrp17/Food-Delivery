import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { writeLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import {
  createCheckout,
  getSessionStatus,
} from "../../controllers/payment.controller.js";
import {
  checkoutSchema,
  checkoutSessionParamsSchema,
} from "../../validators/payment.schema.js";

const paymentRouter = Router();

paymentRouter.use(authenticate);

paymentRouter.post("/checkout", writeLimiter, validate({ body: checkoutSchema }), createCheckout);
paymentRouter.get(
  "/session/:sessionId",
  validate({ params: checkoutSessionParamsSchema }),
  getSessionStatus
);

export default paymentRouter;
