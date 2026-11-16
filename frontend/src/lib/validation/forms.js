import { z } from "zod";
import { emailSchema, passwordSchema, toFieldErrors } from "./auth";

const optionalString = (schema) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional());

export const phoneSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.replace(/[\s-]/g, "") : value),
  z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid 10 to 15 digit phone number")
);

const optionalPhoneSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  phoneSchema.optional()
);

const slugSchema = optionalString(
  z
    .string()
    .max(80, "Slug must be at most 80 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens")
);

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
  phone: optionalPhoneSchema,
});

export const addressFormSchema = z.object({
  label: optionalString(z.string().max(40, "Label must be at most 40 characters")),
  recipientName: z
    .string()
    .trim()
    .min(2, "Recipient name must be at least 2 characters")
    .max(80, "Recipient name must be at most 80 characters"),
  phone: phoneSchema,
  line1: z
    .string()
    .trim()
    .min(3, "Address line 1 must be at least 3 characters")
    .max(160, "Address line 1 is too long"),
  line2: optionalString(z.string().max(160, "Address line 2 is too long")),
  landmark: optionalString(z.string().max(120, "Landmark is too long")),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(80, "City is too long"),
  state: z
    .string()
    .trim()
    .min(2, "State must be at least 2 characters")
    .max(80, "State is too long"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  isDefault: z.boolean().optional(),
});

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(72),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one",
  });

export const forgotPasswordFormSchema = z.object({ email: emailSchema });

export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const adminLoginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72),
});

export const cancelOrderFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Please add a short reason")
    .max(300, "Reason must be at most 300 characters"),
});

export const couponCodeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Enter a coupon code")
    .max(40, "Coupon code is too long"),
});

const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce
    .number()
    .int("Enter a whole number")
    .positive("Value must be greater than zero")
    .max(1000000, "Value is too large")
    .optional()
);

const optionalPaise = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce
    .number()
    .int("Enter a valid amount")
    .nonnegative("Amount cannot be negative")
    .max(100000000, "Amount is too large")
    .optional()
);

export const adminCouponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Enter a coupon code")
      .max(40, "Coupon code is too long")
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores"),
    description: optionalString(z.string().max(240, "Description is too long")),
    type: z.enum(["percent", "fixed"]),
    percentBps: z.coerce.number().int("Percentage must be a whole number"),
    amountPaise: z.coerce
      .number()
      .int("Enter a valid amount")
      .nonnegative("Amount cannot be negative")
      .max(100000000, "Amount is too large"),
    maxDiscountPaise: optionalPaise,
    minSubtotalPaise: z.coerce
      .number()
      .int("Enter a valid amount")
      .nonnegative("Minimum order cannot be negative")
      .max(100000000, "Minimum order is too large"),
    firstOrderOnly: z.boolean(),
    usageLimit: optionalPositiveInt,
    perUserLimit: optionalPositiveInt,
    startsAt: z.string().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percent") {
      if (!Number.isFinite(data.percentBps) || data.percentBps < 1 || data.percentBps > 10000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["percentBps"],
          message: "Percentage must be between 0.01% and 100%",
        });
      }
    } else if (!data.amountPaise || data.amountPaise <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountPaise"],
        message: "Enter a discount amount greater than zero",
      });
    }

    if (data.maxDiscountPaise && data.type !== "percent") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxDiscountPaise"],
        message: "Max discount only applies to percentage coupons",
      });
    }

    if (data.startsAt && data.expiresAt && new Date(data.expiresAt) <= new Date(data.startsAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "Expiry must be after the start date",
      });
    }
  });

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  slug: slugSchema,
  description: optionalString(z.string().max(240, "Description is too long")),
  image: optionalString(z.string().max(500, "Image URL is too long")),
  sortOrder: z.coerce
    .number()
    .int("Sort order must be a whole number")
    .min(0, "Sort order cannot be negative")
    .max(10000, "Sort order is too large"),
  isActive: z.boolean(),
});

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(120, "Name must be at most 120 characters"),
    slug: slugSchema,
    description: z
      .string()
      .trim()
      .min(3, "Description must be at least 3 characters")
      .max(2000, "Description is too long"),
    shortDescription: optionalString(z.string().max(160, "Short description is too long")),
    categoryId: z.string().trim().min(1, "Choose a category"),
    price: z.coerce
      .number()
      .positive("Price must be greater than zero")
      .max(100000000, "Price is too large"),
    compareAtPrice: optionalString(
      z.coerce
        .number()
        .nonnegative("Compare-at price cannot be negative")
        .max(100000000, "Compare-at price is too large")
    ),
    stock: z.coerce
      .number()
      .int("Stock must be a whole number")
      .min(0, "Stock cannot be negative")
      .max(1000000, "Stock is too large"),
    prepTimeMinutes: z.coerce
      .number()
      .int("Preparation time must be a whole number")
      .min(1, "Preparation time must be at least 1 minute")
      .max(240, "Preparation time must be at most 240 minutes"),
    image: optionalString(z.string().max(500, "Image URL is too long")),
    tags: optionalString(z.string().max(400, "Tags are too long")),
    isAvailable: z.boolean(),
    isVeg: z.boolean(),
    isFeatured: z.boolean(),
    isBestseller: z.boolean(),
    isNew: z.boolean(),
  })
  .refine(
    (data) => !data.compareAtPrice || Number(data.compareAtPrice) > Number(data.price),
    {
      path: ["compareAtPrice"],
      message: "Compare-at price must be higher than the selling price",
    }
  );

export const settingsFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Store name must be at least 2 characters")
      .max(80, "Store name is too long"),
    supportEmail: emailSchema,
    supportPhone: z.string().trim().max(20, "Support phone is too long"),
    deliveryFee: z.coerce
      .number()
      .nonnegative("Delivery fee cannot be negative")
      .max(100000, "Delivery fee is too large"),
    freeDeliveryThreshold: z.coerce
      .number()
      .nonnegative("Free delivery threshold cannot be negative")
      .max(10000000, "Free delivery threshold is too large"),
    taxRate: z.coerce
      .number()
      .min(0, "Tax rate cannot be negative")
      .max(30, "Tax rate must be 30% or less"),
    minOrder: z.coerce
      .number()
      .nonnegative("Minimum order cannot be negative")
      .max(10000000, "Minimum order is too large"),
    estimateMin: z.coerce
      .number()
      .int("Minimum estimate must be a whole number")
      .min(1, "Minimum estimate must be at least 1 minute")
      .max(240, "Minimum estimate must be at most 240 minutes"),
    estimateMax: z.coerce
      .number()
      .int("Maximum estimate must be a whole number")
      .min(1, "Maximum estimate must be at least 1 minute")
      .max(240, "Maximum estimate must be at most 240 minutes"),
    serviceablePincodes: z
      .string()
      .trim()
      .max(5000, "Pincode list is too long")
      .optional(),
    isAcceptingOrders: z.boolean(),
  })
  .refine((data) => data.estimateMax >= data.estimateMin, {
    path: ["estimateMax"],
    message: "Maximum estimate must be at least the minimum estimate",
  });

export const parseForm = (schema, values) => {
  const result = schema.safeParse(values);
  if (!result.success) {
    return { success: false, errors: toFieldErrors(result.error.issues) };
  }
  return { success: true, data: result.data };
};

export const getErrorMessage = (error, fallback) =>
  error?.message || fallback || "Something went wrong. Please try again.";

export const mapServerErrors = (details, allowedFields) => {
  const allowed = allowedFields ? new Set(allowedFields) : null;
  const entries = Array.isArray(details)
    ? details
    : details && typeof details === "object"
      ? Object.entries(details).map(([field, message]) => ({ field, message }))
      : [];

  return entries.reduce((errors, entry) => {
    if (!entry) return errors;
    const field = String(
      entry.field ?? entry.path ?? entry.name ?? entry.key ?? ""
    )
      .split(".")
      .pop();
    const message =
      typeof entry === "string"
        ? entry
        : entry.message ?? entry.msg ?? entry.error ?? "";
    if (!field || !message || (allowed && !allowed.has(field)) || errors[field]) {
      return errors;
    }
    errors[field] = message;
    return errors;
  }, {});
};

export const focusFirstInvalidField = () => {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    document.querySelector('[aria-invalid="true"]')?.focus?.();
  });
};

/** Customer review for a dish. */
export const reviewFormSchema = z.object({
  rating: z.coerce
    .number()
    .int("Choose a rating")
    .min(1, "Choose a rating")
    .max(5, "Choose a rating"),
  title: z.string().trim().max(120, "Keep the title under 120 characters").optional(),
  body: z.string().trim().max(2000, "Keep the review under 2000 characters").optional(),
});

export { toFieldErrors, emailSchema, passwordSchema };
