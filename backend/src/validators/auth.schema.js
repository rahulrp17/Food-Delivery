import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.email("A valid email is required").transform((value) => value.toLowerCase()),
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email("A valid email is required").transform((value) => value.toLowerCase()),
    password: z.string().min(1, "Password is required").max(72),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(72),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid identifier");

export const forgotPasswordSchema = z
  .object({
    email: z.email("A valid email is required").transform((value) => value.toLowerCase()),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(200),
    password: passwordSchema,
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().min(32).max(200),
  })
  .strict();

export const sessionParamsSchema = z.object({ id: objectIdSchema }).strict();
