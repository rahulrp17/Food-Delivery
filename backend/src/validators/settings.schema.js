import { z } from "zod";

const timeRangeSchema = z
  .object({
    min: z.number().int().min(1).max(240),
    max: z.number().int().min(1).max(240),
  })
  .strict()
  .refine((data) => data.max >= data.min, {
    message: "max must be greater than or equal to min",
    path: ["max"],
  });

const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM time");

const businessHourSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    open: timeOfDaySchema,
    close: timeOfDaySchema,
    closed: z.boolean(),
  })
  .strict()
  .refine(
    (data) =>
      data.closed ||
      data.open < data.close,
    { message: "Closing time must be after opening time", path: ["close"] }
  );

const businessHoursSchema = z
  .array(businessHourSchema)
  .length(7, "Provide opening hours for all seven days")
  .refine(
    (days) => new Set(days.map((entry) => entry.day)).size === 7,
    "Each weekday must appear exactly once"
  );

const gstinSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) =>
      value === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(value),
    "Enter a valid 15-character GSTIN"
  );

export const storeSettingsUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    supportEmail: z.string().trim().email().max(120).optional(),
    supportPhone: z.string().trim().max(20).optional(),
    currency: z.literal("INR").optional(),
    deliveryFeePaise: z.number().int().min(0).max(100000).optional(),
    freeDeliveryThresholdPaise: z.number().int().min(0).max(10000000).optional(),
    taxRateBps: z.number().int().min(0).max(3000).optional(),
    taxLabel: z.string().trim().min(2).max(20).optional(),
    minOrderPaise: z.number().int().min(0).max(10000000).optional(),
    deliveryEstimateMinutes: timeRangeSchema.optional(),
    serviceablePincodes: z
      .array(z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"))
      .max(500)
      .optional(),
    businessHours: businessHoursSchema.optional(),
    notifications: z
      .object({
        orderNew: z.boolean(),
        lowStock: z.boolean(),
        reviewNew: z.boolean(),
      })
      .strict()
      .optional(),
    invoiceLegalName: z.string().trim().max(120).optional(),
    invoiceGstin: gstinSchema.optional(),
    invoiceAddress: z.string().trim().max(300).optional(),
    invoiceFooter: z.string().trim().max(200).optional(),
    isAcceptingOrders: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
