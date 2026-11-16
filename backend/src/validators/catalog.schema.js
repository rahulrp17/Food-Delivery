import { z } from "zod";
import { objectIdSchema } from "./auth.schema.js";

const booleanQuery = z
  .enum(["true", "false"], { message: "Expected true or false" })
  .transform((value) => value === "true");

const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const sortSchema = z.enum(["newest", "price_asc", "price_desc", "rating", "popular"]);

export const productListQuerySchema = z
  .object({
    ...paginationShape,
    category: z.string().trim().min(1).max(80).optional(),
    q: z.string().trim().max(100).optional(),
    veg: booleanQuery.optional(),
    featured: booleanQuery.optional(),
    bestseller: booleanQuery.optional(),
    new: booleanQuery.optional(),
    inStock: booleanQuery.optional(),
    minPricePaise: z.coerce.number().int().min(0).optional(),
    maxPricePaise: z.coerce.number().int().min(0).optional(),
    sort: sortSchema.optional(),
  })
  .refine(
    (data) =>
      data.minPricePaise === undefined ||
      data.maxPricePaise === undefined ||
      data.minPricePaise <= data.maxPricePaise,
    { message: "minPricePaise must be less than or equal to maxPricePaise", path: ["minPricePaise"] }
  );

export const searchQuerySchema = z
  .object({
    ...paginationShape,
    category: z.string().trim().min(1).max(80).optional(),
    q: z.string().trim().min(1, "Search term is required").max(100),
    veg: booleanQuery.optional(),
    featured: booleanQuery.optional(),
    bestseller: booleanQuery.optional(),
    new: booleanQuery.optional(),
    inStock: booleanQuery.optional(),
    minPricePaise: z.coerce.number().int().min(0).optional(),
    maxPricePaise: z.coerce.number().int().min(0).optional(),
    sort: sortSchema.optional(),
  })
  .refine(
    (data) =>
      data.minPricePaise === undefined ||
      data.maxPricePaise === undefined ||
      data.minPricePaise <= data.maxPricePaise,
    { message: "minPricePaise must be less than or equal to maxPricePaise", path: ["minPricePaise"] }
  );

const nutritionSchema = z
  .object({
    calories: z.coerce.number().min(0).nullable().optional(),
    proteinG: z.coerce.number().min(0).nullable().optional(),
    carbsG: z.coerce.number().min(0).nullable().optional(),
    fatG: z.coerce.number().min(0).nullable().optional(),
  })
  .strict();

const imageString = z.string().trim().max(500);

const productShape = {
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens")
    .optional(),
  description: z.string().trim().min(3).max(2000),
  shortDescription: z.string().trim().max(160).optional(),
  categoryId: objectIdSchema,
  pricePaise: z.coerce.number().int().min(0).max(100000000),
  compareAtPricePaise: z.coerce.number().int().min(0).max(100000000).nullable().optional(),
  image: imageString.optional(),
  gallery: z.array(imageString).max(8).optional(),
  isVeg: z.boolean().optional(),
  allergens: z.array(z.string().trim().max(60)).max(20).optional(),
  ingredients: z.array(z.string().trim().max(120)).max(40).optional(),
  nutrition: nutritionSchema.optional(),
  prepTimeMinutes: z.coerce.number().int().min(1).max(240).optional(),
  stock: z.coerce.number().int().min(0).max(1000000).optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
};

const compareAtPriceIsValid = (data) =>
  data.compareAtPricePaise === undefined ||
  data.compareAtPricePaise === null ||
  data.compareAtPricePaise > data.pricePaise;

export const productCreateSchema = z
  .object(productShape)
  .strict()
  .refine(compareAtPriceIsValid, {
    message: "compareAtPricePaise must be greater than pricePaise",
    path: ["compareAtPricePaise"],
  });

export const productUpdateSchema = z
  .object(productShape)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" })
  .refine(
    (data) =>
      data.compareAtPricePaise === undefined ||
      data.compareAtPricePaise === null ||
      data.pricePaise === undefined ||
      data.compareAtPricePaise > data.pricePaise,
    {
      message: "compareAtPricePaise must be greater than pricePaise",
      path: ["compareAtPricePaise"],
    }
  );

export const productStockSchema = z
  .object({
    stock: z.coerce.number().int().min(0).max(1000000).optional(),
    delta: z.coerce.number().int().min(-1000000).max(1000000).optional(),
  })
  .strict()
  .refine(
    (data) => (data.stock !== undefined) !== (data.delta !== undefined),
    { message: "Provide exactly one of stock or delta" }
  );

const categoryShape = {
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens")
    .optional(),
  description: z.string().trim().max(240).optional(),
  image: imageString.optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
};

export const categoryCreateSchema = z.object(categoryShape).strict();

export const categoryUpdateSchema = z
  .object(categoryShape)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const productSlugParamsSchema = z
  .object({ slug: z.string().trim().min(1).max(100) })
  .strict();

export const relatedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
});

export const productIdParamsSchema = z.object({ id: objectIdSchema }).strict();
export const categoryIdParamsSchema = z.object({ id: objectIdSchema }).strict();
export const reorderCategorySchema = z
  .object({
    direction: z.enum(["up", "down"]),
  })
  .strict();
export const reviewIdParamsSchema = z.object({ id: objectIdSchema }).strict();

export const productReviewsQuerySchema = z.object({
  productId: objectIdSchema,
  ...paginationShape,
});

export const reviewCreateSchema = z
  .object({
    productId: objectIdSchema,
    rating: z.coerce.number().int().min(1).max(5),
    title: z.string().trim().max(120).optional(),
    body: z.string().trim().max(2000).optional(),
  })
  .strict();

export const reviewUpdateSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    title: z.string().trim().max(120).optional(),
    body: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const reviewModerateSchema = z
  .object({
    status: z.enum(["approved", "rejected"], { message: "Status must be approved or rejected" }),
  })
  .strict();

export const replyReviewSchema = z
  .object({
    reply: z.string().trim().min(1, "Reply text is required").max(2000),
  })
  .strict();

export const adminReviewListQuerySchema = z.object({
  ...paginationShape,
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  productId: objectIdSchema.optional(),
});

export const reviewListQuerySchema = z.object({
  ...paginationShape,
});

export const adminProductListQuerySchema = z.object({
  ...paginationShape,
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  isAvailable: booleanQuery.optional(),
  stock: z.literal("low").optional(),
  minPricePaise: z.coerce.number().int().min(0).optional(),
  maxPricePaise: z.coerce.number().int().min(0).optional(),
  sort: sortSchema.optional(),
})
  .refine(
    (data) =>
      data.minPricePaise === undefined ||
      data.maxPricePaise === undefined ||
      data.minPricePaise <= data.maxPricePaise,
    { message: "minPricePaise must be less than or equal to maxPricePaise", path: ["minPricePaise"] }
  );

export const bulkUpdateProductSchema = z
  .object({
    ids: z.array(objectIdSchema).min(1, "Select at least one product"),
    stock: z.coerce.number().int().min(0).max(1000000).optional(),
    delta: z.coerce.number().int().min(-1000000).max(1000000).optional(),
    isAvailable: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    categoryId: objectIdSchema.optional(),
  })
  .strict()
  .refine(
    (data) => (data.stock !== undefined) !== (data.delta !== undefined),
    { message: "Provide exactly one of stock or delta", path: ["delta"] }
  )
  .refine(
    (data) => !data.categoryId || data.stock === undefined && data.delta === undefined,
    { message: "Stock changes cannot be combined with category updates", path: ["categoryId"] }
  );

export const auditLogQuerySchema = z.object({
  ...paginationShape,
  actor: z.string().trim().max(100).optional(),
  action: z.string().trim().max(100).optional(),
  path: z.string().trim().max(200).optional(),
  q: z.string().trim().max(100).optional(),
});

export const notificationListQuerySchema = z.object({
  ...paginationShape,
  unreadOnly: booleanQuery.optional(),
});

export const notificationIdParamsSchema = z.object({ id: objectIdSchema }).strict();

export const inventoryLogQuerySchema = z.object({
  ...paginationShape,
  productId: objectIdSchema.optional(),
  reason: z.enum(["order", "restock", "adjust", "cancel"]).optional(),
  q: z.string().trim().max(100).optional(),
});
