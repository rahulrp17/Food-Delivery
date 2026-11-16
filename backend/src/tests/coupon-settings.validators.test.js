import { describe, expect, it } from "vitest";
import {
  couponCreateSchema,
  couponRedemptionsQuerySchema,
  couponUpdateSchema,
} from "../validators/coupon.schema.js";
import { storeSettingsUpdateSchema } from "../validators/settings.schema.js";
import { isStoreOpenAt } from "../services/settings.service.js";

describe("coupon validators", () => {
  it("normalizes codes and accepts valid percent coupons", () => {
    const result = couponCreateSchema.safeParse({
      code: " welcome10 ",
      type: "percent",
      percentBps: 1000,
      maxDiscountPaise: 5000,
    });

    expect(result.success).toBe(true);
    expect(result.data.code).toBe("WELCOME10");
  });

  it("requires a positive value for the selected coupon type", () => {
    expect(couponCreateSchema.safeParse({ code: "OFF10", type: "percent" }).success).toBe(
      false
    );
    expect(
      couponCreateSchema.safeParse({ code: "OFF10", type: "fixed", amountPaise: 0 }).success
    ).toBe(false);
    expect(
      couponCreateSchema.safeParse({ code: "OFF10", type: "fixed", amountPaise: 5000 }).success
    ).toBe(true);
  });

  it("rejects invalid date ranges and empty updates", () => {
    expect(
      couponCreateSchema.safeParse({
        code: "OFF10",
        type: "fixed",
        amountPaise: 5000,
        startsAt: "2026-11-02",
        expiresAt: "2026-11-01",
      }).success
    ).toBe(false);
    expect(couponUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("validates redemption date filters", () => {
    expect(
      couponRedemptionsQuerySchema.safeParse({
        startDate: "2026-11-01",
        endDate: "2026-11-10",
      }).success
    ).toBe(true);
    expect(couponRedemptionsQuerySchema.safeParse({}).success).toBe(true);
    expect(
      couponRedemptionsQuerySchema.safeParse({
        startDate: "2026-11-10",
        endDate: "2026-11-01",
      }).success
    ).toBe(false);
    expect(couponRedemptionsQuerySchema.safeParse({ startDate: "not-a-date" }).success).toBe(
      false
    );
  });
});

describe("store settings validator", () => {
  it("validates fees, ranges, and pincodes", () => {
    expect(
      storeSettingsUpdateSchema.safeParse({
        deliveryFeePaise: 3900,
        deliveryEstimateMinutes: { min: 25, max: 35 },
        serviceablePincodes: ["411001", "411002"],
      }).success
    ).toBe(true);

    expect(
      storeSettingsUpdateSchema.safeParse({
        deliveryEstimateMinutes: { min: 40, max: 20 },
      }).success
    ).toBe(false);
    expect(
      storeSettingsUpdateSchema.safeParse({ serviceablePincodes: ["123"] }).success
    ).toBe(false);
    expect(storeSettingsUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("validates business hours, notification preferences, and invoice details", () => {
    const businessHours = Array.from({ length: 7 }, (_, day) => ({
      day,
      open: "09:00",
      close: "23:00",
      closed: day === 0,
    }));

    expect(
      storeSettingsUpdateSchema.safeParse({
        businessHours,
        notifications: { orderNew: true, lowStock: false, reviewNew: true },
        taxLabel: "GST",
        invoiceGstin: "29ABCDE1234F1Z5",
        invoiceLegalName: "Foodie Kitchen Pvt Ltd",
        invoiceFooter: "Thanks for ordering!",
      }).success
    ).toBe(true);

    expect(
      storeSettingsUpdateSchema.safeParse({
        businessHours: businessHours.map((entry) => ({ ...entry, day: 1 })),
      }).success
    ).toBe(false);
    expect(
      storeSettingsUpdateSchema.safeParse({
        businessHours: businessHours.map((entry, index) =>
          index === 0 ? { ...entry, open: "22:00", close: "09:00", closed: false } : entry
        ),
      }).success
    ).toBe(false);
    expect(
      storeSettingsUpdateSchema.safeParse({ invoiceGstin: "INVALID" }).success
    ).toBe(false);
    expect(
      storeSettingsUpdateSchema.safeParse({
        notifications: { orderNew: true, lowStock: true },
      }).success
    ).toBe(false);
  });
});

describe("business hours evaluation", () => {
  const hours = Array.from({ length: 7 }, (_, day) => ({
    day,
    open: "09:00",
    close: "22:00",
    closed: day === 0,
  }));

  it("treats Sunday as closed and Monday midday as open", () => {
    expect(isStoreOpenAt(hours, new Date(2026, 10, 8, 12, 0))).toBe(false);
    expect(isStoreOpenAt(hours, new Date(2026, 10, 9, 12, 0))).toBe(true);
    expect(isStoreOpenAt(hours, new Date(2026, 10, 9, 23, 30))).toBe(false);
    expect(isStoreOpenAt(hours, new Date(2026, 10, 9, 8, 59))).toBe(false);
  });
});
