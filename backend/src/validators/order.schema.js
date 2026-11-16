import { z } from "zod";
import { objectIdSchema } from "./auth.schema.js";
import { ORDER_STATUS, PAYMENT_STATUS } from "../config/constants.js";

const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const statusSchema = z.enum(Object.values(ORDER_STATUS));
const paymentStatusSchema = z.enum(Object.values(PAYMENT_STATUS));

export const createOrderSchema = z
  .object({
    addressId: objectIdSchema,
    couponCode: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .transform((value) => value.toUpperCase())
      .optional(),
    idempotencyKey: z.string().trim().min(8).max(100).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const orderIdParamsSchema = z.object({ id: objectIdSchema }).strict();

export const orderListQuerySchema = z.object({
  ...paginationShape,
  status: statusSchema.optional(),
});

export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().min(3).max(300),
  })
  .strict();

export const adminOrderListQuerySchema = z.object({
  ...paginationShape,
  status: statusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  q: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const adminOverviewQuerySchema = z
  .object({
    from: z.coerce.date().optional().refine(
      (d) => !d || !isNaN(d.getTime()),
      { message: "Invalid from date", path: ["from"] }
    ),
    to: z.coerce.date().optional().refine(
      (d) => !d || !isNaN(d.getTime()),
      { message: "Invalid to date", path: ["to"] }
    ),
  })
  .refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    { message: "from must be before or equal to to", path: ["to"] }
  );

export const adminOrderStatusSchema = z
  .object({
    status: statusSchema,
    note: z.string().trim().max(300).optional(),
  })
  .strict();

export const adminOrderNotesSchema = z
  .object({
    adminNotes: z.string().trim().max(1000),
  })
  .strict();
