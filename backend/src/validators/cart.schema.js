import { z } from "zod";
import { objectIdSchema } from "./auth.schema.js";

export const cartItemParamsSchema = z.object({ productId: objectIdSchema }).strict();

export const addCartItemSchema = z
  .object({
    productId: objectIdSchema,
    quantity: z.coerce.number().int().min(1).max(10).default(1),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    quantity: z.coerce.number().int().min(0).max(10),
  })
  .strict();

export const mergeCartSchema = z
  .object({
    guestToken: z
      .string()
      .trim()
      .min(20)
      .max(100)
      .regex(/^[A-Za-z0-9_-]+$/, "Invalid guest token"),
  })
  .strict();

export const applyCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .transform((value) => value.toUpperCase()),
  })
  .strict();
