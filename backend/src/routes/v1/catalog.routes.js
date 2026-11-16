import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  getCategories,
  getProductBySlug,
  getProducts,
  getRelated,
  searchProducts,
} from "../../controllers/catalog.controller.js";
import {
  productListQuerySchema,
  productSlugParamsSchema,
  relatedQuerySchema,
  searchQuerySchema,
} from "../../validators/catalog.schema.js";

const catalogRouter = Router();

catalogRouter.get("/categories", getCategories);

catalogRouter.get("/products", validate({ query: productListQuerySchema }), getProducts);
catalogRouter.get(
  "/products/:slug/related",
  validate({ params: productSlugParamsSchema, query: relatedQuerySchema }),
  getRelated
);
catalogRouter.get(
  "/products/:slug",
  validate({ params: productSlugParamsSchema }),
  getProductBySlug
);

catalogRouter.get("/search", validate({ query: searchQuerySchema }), searchProducts);

export default catalogRouter;
