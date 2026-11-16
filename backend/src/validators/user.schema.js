import { z } from "zod";
import { objectIdSchema } from "./auth.schema.js";
import { ALL_PERMISSIONS, STAFF_ROLE_OPTIONS } from "../config/permissions.js";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number");

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: phoneSchema.optional(),
  })
  .strict();

export const addressSchema = z
  .object({
    label: z.string().trim().max(40).optional(),
    recipientName: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    line1: z.string().trim().min(3).max(160),
    line2: z.string().trim().max(160).optional(),
    landmark: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const addressUpdateSchema = addressSchema.partial();

export const addressParamsSchema = z.object({ id: objectIdSchema }).strict();

export const productParamsSchema = z.object({ productId: objectIdSchema }).strict();

export const adminCustomerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  sort: z.enum(["newest", "oldest", "name", "last_login"]).default("newest"),
});

export const customerIdParamsSchema = z.object({ id: objectIdSchema }).strict();

export const customerRoleUpdateSchema = z
  .object({ role: z.enum(["user", "admin"]) })
  .strict();

export const customerStatusUpdateSchema = z
  .object({ status: z.enum(["active", "suspended"]) })
  .strict();

const permissionEnum = z.enum(ALL_PERMISSIONS);
const permissionListSchema = z.array(permissionEnum).max(ALL_PERMISSIONS.length);

export const staffListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
});

export const staffCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    password: z.string().min(8).max(128),
    staffRole: z.enum(STAFF_ROLE_OPTIONS).optional(),
    permissions: permissionListSchema.optional(),
  })
  .strict();

export const staffUpdateSchema = z
  .object({
    staffRole: z.enum(STAFF_ROLE_OPTIONS).optional(),
    permissions: permissionListSchema.optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const staffIdParamsSchema = z.object({ id: objectIdSchema }).strict();
