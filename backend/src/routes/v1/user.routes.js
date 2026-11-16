import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  addressParamsSchema,
  addressSchema,
  addressUpdateSchema,
  productParamsSchema,
  updateProfileSchema,
} from "../../validators/user.schema.js";
import {
  addAddress,
  addWishlistItem,
  editAddress,
  getAddresses,
  getMe,
  getWishlistItems,
  removeAddress,
  removeWishlistItem,
  updateMe,
} from "../../controllers/user.controller.js";

const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/me", getMe);
userRouter.patch("/me", validate({ body: updateProfileSchema }), updateMe);

userRouter.get("/me/addresses", getAddresses);
userRouter.post("/me/addresses", validate({ body: addressSchema }), addAddress);
userRouter.patch(
  "/me/addresses/:id",
  validate({ params: addressParamsSchema, body: addressUpdateSchema }),
  editAddress
);
userRouter.delete("/me/addresses/:id", validate({ params: addressParamsSchema }), removeAddress);

userRouter.get("/me/wishlist", getWishlistItems);
userRouter.post(
  "/me/wishlist/:productId",
  validate({ params: productParamsSchema }),
  addWishlistItem
);
userRouter.delete(
  "/me/wishlist/:productId",
  validate({ params: productParamsSchema }),
  removeWishlistItem
);

export default userRouter;
