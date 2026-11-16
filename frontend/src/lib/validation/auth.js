import { z } from "zod";

export const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email("Enter a valid email address")
);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const registerFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be at most 80 characters"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72),
});

export const toFieldErrors = (issues = []) =>
  issues.reduce((errors, issue) => {
    const field = issue.path?.[0];
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
