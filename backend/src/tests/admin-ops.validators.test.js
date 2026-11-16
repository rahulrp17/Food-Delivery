import { describe, expect, it } from "vitest";
import {
  inventoryLogQuerySchema,
  notificationListQuerySchema,
  notificationIdParamsSchema,
} from "../validators/catalog.schema.js";
import {
  staffCreateSchema,
  staffUpdateSchema,
  staffListQuerySchema,
} from "../validators/user.schema.js";
import { PERMISSIONS } from "../config/permissions.js";
import { adminOrderNotesSchema } from "../validators/order.schema.js";
import { toOrderResponse } from "../services/order.service.js";

describe("staff validators", () => {
  it("accepts a valid staff create payload", () => {
    const result = staffCreateSchema.safeParse({
      name: "Ops Manager",
      email: "ops@example.com",
      password: "supersecret",
      staffRole: "manager",
      permissions: [PERMISSIONS.ORDERS_READ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown permissions and short passwords", () => {
    expect(
      staffCreateSchema.safeParse({
        name: "Ops",
        email: "ops@example.com",
        password: "short",
        permissions: ["root:everything"],
      }).success
    ).toBe(false);
  });

  it("requires at least one field on staff update", () => {
    expect(staffUpdateSchema.safeParse({}).success).toBe(false);
    expect(staffUpdateSchema.safeParse({ status: "suspended" }).success).toBe(true);
  });

  it("coerces staff list pagination", () => {
    const parsed = staffListQuerySchema.parse({ page: "2", limit: "10" });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(10);
  });
});

describe("notification validators", () => {
  it("normalizes unreadOnly query flags", () => {
    expect(notificationListQuerySchema.parse({ unreadOnly: "true" }).unreadOnly).toBe(true);
    expect(notificationListQuerySchema.parse({ unreadOnly: "false" }).unreadOnly).toBe(false);
  });

  it("validates notification ids", () => {
    expect(
      notificationIdParamsSchema.safeParse({ id: "507f1f77bcf86cd799439011" }).success
    ).toBe(true);
    expect(notificationIdParamsSchema.safeParse({ id: "not-an-id" }).success).toBe(false);
  });
});

describe("inventory validators", () => {
  it("accepts known reasons and rejects unknown ones", () => {
    expect(inventoryLogQuerySchema.safeParse({ reason: "restock" }).success).toBe(true);
    expect(inventoryLogQuerySchema.safeParse({ reason: "stolen" }).success).toBe(false);
  });
});

describe("order admin notes", () => {
  const baseOrder = {
    _id: "507f1f77bcf86cd799439011",
    orderNumber: "FD-TEST1234",
    userId: "507f1f77bcf86cd799439012",
    items: [],
    pricing: { totalPaise: 1000 },
    status: "confirmed",
    paymentStatus: "paid",
    payment: {},
    statusHistory: [],
    notes: "Customer note",
    adminNotes: "Internal note",
    placedAt: new Date("2026-01-01T00:00:00Z"),
  };

  it("accepts empty and bounded notes", () => {
    expect(adminOrderNotesSchema.safeParse({ adminNotes: "" }).success).toBe(true);
    expect(adminOrderNotesSchema.safeParse({ adminNotes: "x".repeat(1000) }).success).toBe(true);
    expect(adminOrderNotesSchema.safeParse({ adminNotes: "x".repeat(1001) }).success).toBe(false);
  });

  it("never exposes admin notes in the customer response shape", () => {
    expect(toOrderResponse(baseOrder).adminNotes).toBeUndefined();
    expect(toOrderResponse(baseOrder).notes).toBe("Customer note");
  });

  it("includes admin notes only for admin responses", () => {
    expect(toOrderResponse(baseOrder, { admin: true }).adminNotes).toBe("Internal note");
  });
});
