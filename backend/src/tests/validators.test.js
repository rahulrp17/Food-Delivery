import { describe, expect, it } from "vitest";
import { registerSchema, changePasswordSchema } from "../validators/auth.schema.js";
import { addressSchema } from "../validators/user.schema.js";

describe("auth validators", () => {
  it("accepts a valid registration and normalizes email", () => {
    const result = registerSchema.safeParse({
      name: "Rahul",
      email: "Rahul@Example.COM",
      password: "strongpass1",
    });

    expect(result.success).toBe(true);
    expect(result.data.email).toBe("rahul@example.com");
  });

  it("rejects a client-supplied role", () => {
    const result = registerSchema.safeParse({
      name: "Rahul",
      email: "rahul@example.com",
      password: "strongpass1",
      role: "admin",
    });

    expect(result.success).toBe(false);
  });

  it("rejects weak passwords", () => {
    const result = registerSchema.safeParse({
      name: "Rahul",
      email: "rahul@example.com",
      password: "password",
    });

    expect(result.success).toBe(false);
  });

  it("rejects reusing the same password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "strongpass1",
      newPassword: "strongpass1",
    });

    expect(result.success).toBe(false);
  });
});

describe("address validator", () => {
  const validAddress = {
    recipientName: "Rahul",
    phone: "+919876543210",
    line1: "12 Market Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
  };

  it("accepts a valid Indian address", () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true);
  });

  it("rejects an invalid pincode", () => {
    const result = addressSchema.safeParse({ ...validAddress, pincode: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = addressSchema.safeParse({ ...validAddress, userId: "someone-else" });
    expect(result.success).toBe(false);
  });
});
