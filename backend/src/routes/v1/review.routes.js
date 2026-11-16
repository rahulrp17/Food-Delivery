import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { writeLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import {
  getMyReviews,
  getProductReviews,
  patchReview,
  postReview,
  removeReview,
} from "../../controllers/review.controller.js";
import {
  productReviewsQuerySchema,
  reviewCreateSchema,
  reviewIdParamsSchema,
  reviewUpdateSchema,
} from "../../validators/catalog.schema.js";

const reviewRouter = Router();

reviewRouter.get("/", validate({ query: productReviewsQuerySchema }), getProductReviews);

// Every review the signed-in customer has written.
reviewRouter.get("/mine", authenticate, getMyReviews);

reviewRouter.post(
  "/",
  authenticate,
  writeLimiter,
  validate({ body: reviewCreateSchema }),
  postReview
);

reviewRouter.patch(
  "/:id",
  authenticate,
  writeLimiter,
  validate({ params: reviewIdParamsSchema, body: reviewUpdateSchema }),
  patchReview
);

reviewRouter.delete(
  "/:id",
  authenticate,
  writeLimiter,
  validate({ params: reviewIdParamsSchema }),
  removeReview
);

export default reviewRouter;
