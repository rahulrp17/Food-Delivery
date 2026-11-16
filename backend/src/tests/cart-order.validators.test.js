import { describe, expect, it } from "vitest";
import {
  addCartItemSchema,
  updateCartItemSchema,
  applyCouponSchema,
} from "../validators/cart.schema.js";
import {
  createOrderSchema,
  adminOrderListQuerySchema,
  adminOrderStatusSchema,
} from "../validators/order.schema.js";

const productId = "64b7f9a2c1d3e4f5a6b7c8d9";
const addressId = "64b7f9a2c1d3e4f5a6b7c8da";

describe("cart validators", () => {
  it("limits item quantity and product ids", () => {
    expect(addCartItemSchema.safeParse({ productId }).success).toBe(true);
    expect(addCartItemSchema.safeParse({ productId, quantity: 11 }).success).toBe(false);
    expect(updateCartItemSchema.safeParse({ quantity: 0 }).success).toBe(true);
    expect(updateCartItemSchema.safeParse({ quantity: 11 }).success).toBe(false);
  });

  it("normalizes coupon codes", () => {
    const result = applyCouponSchema.safeParse({ code: " welcome10 " });
    expect(result.success).toBe(true);
    expect(result.data.code).toBe("WELCOME10");
  });
});

describe("order validators", () => {
  it("accepts address and optional idempotency key", () => {
    expect(createOrderSchema.safeParse({ addressId }).success).toBe(true);
    expect(
      createOrderSchema.safeParse({ addressId, idempotencyKey: "checkout-123" }).success
    ).toBe(true);
    expect(createOrderSchema.safeParse({}).success).toBe(false);
  });

  it("rejects client-supplied prices and totals", () => {
    expect(createOrderSchema.safeParse({ addressId, totalPaise: 1 }).success).toBe(false);
    expect(createOrderSchema.safeParse({ addressId, items: [] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ addressId, pricing: { totalPaise: 1 } }).success).toBe(
      false
    );
  });

  it("only allows known order statuses for admin updates", () => {
    expect(adminOrderStatusSchema.safeParse({ status: "preparing" }).success).toBe(true);
    expect(adminOrderStatusSchema.safeParse({ status: "delivered" }).success).toBe(true);
    expect(adminOrderStatusSchema.safeParse({ status: "archived" }).success).toBe(false);
  });

  it("accepts an optional note on admin status updates", () => {
    expect(
      adminOrderStatusSchema.safeParse({ status: "preparing", note: "Packed for pickup" })
        .success
    ).toBe(true);
    expect(
      adminOrderStatusSchema.safeParse({ status: "preparing", note: "x".repeat(301) }).success
    ).toBe(false);
  });

  it("supports payment status filters on admin order lists", () => {
    expect(adminOrderListQuerySchema.safeParse({ paymentStatus: "paid" }).success).toBe(true);
    expect(adminOrderListQuerySchema.safeParse({ paymentStatus: "unpaid" }).success).toBe(true);
    expect(adminOrderListQuerySchema.safeParse({ paymentStatus: "pending" }).success).toBe(false);
  });
});
