import { z } from "zod";
import { objectIdSchema } from "./auth.schema.js";

const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores")
  .transform((value) => value.toUpperCase());

const couponShape = {
  code: couponCodeSchema,
  description: z.string().trim().max(200).optional(),
  type: z.enum(["percent", "fixed"]),
  percentBps: z.number().int().min(0).max(10000).optional(),
  amountPaise: z.number().int().min(0).optional(),
  maxDiscountPaise: z.number().int().min(0).nullable().optional(),
  minSubtotalPaise: z.number().int().min(0).optional(),
  firstOrderOnly: z.boolean().optional(),
  usageLimit: z.number().int().min(0).nullable().optional(),
  perUserLimit: z.number().int().min(0).nullable().optional(),
  applicableCategoryIds: z.array(objectIdSchema).max(50).optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
};

const validateCouponRules = (data, context) => {
  if (data.type === "percent" && (data.percentBps ?? 0) <= 0) {
    context.addIssue({
      code: "custom",
      message: "percentBps must be greater than zero for percent coupons",
      path: ["percentBps"],
    });
  }

  if (data.type === "fixed" && (data.amountPaise ?? 0) <= 0) {
    context.addIssue({
      code: "custom",
      message: "amountPaise must be greater than zero for fixed coupons",
      path: ["amountPaise"],
    });
  }

  if (data.startsAt && data.expiresAt && data.expiresAt <= data.startsAt) {
    context.addIssue({
      code: "custom",
      message: "expiresAt must be after startsAt",
      path: ["expiresAt"],
    });
  }
};

export const couponCreateSchema = z
  .object(couponShape)
  .strict()
  .superRefine(validateCouponRules);

export const couponUpdateSchema = z
  .object({
    ...couponShape,
    code: couponCodeSchema.optional(),
    type: couponShape.type.optional(),
  })
  .strict()
  .superRefine(validateCouponRules)
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const couponIdParamsSchema = z.object({ id: objectIdSchema }).strict();

export const couponListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "expired", "scheduled"]).optional(),
});

export const couponRedemptionsQuerySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict()
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { message: "endDate must be on or after startDate", path: ["endDate"] }
  );