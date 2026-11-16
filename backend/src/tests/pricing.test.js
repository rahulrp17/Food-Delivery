import { describe, expect, it } from "vitest";
import { calculatePricing, computeCouponDiscount } from "../services/pricing.service.js";

const settings = {
  taxRateBps: 500,
  deliveryFeePaise: 3900,
  freeDeliveryThresholdPaise: 49900,
};

const percentCoupon = {
  type: "percent",
  percentBps: 1000,
  amountPaise: 0,
  maxDiscountPaise: 5000,
  applicableCategoryIds: [],
};

describe("pricing engine", () => {
  it("matches the architecture worked example", () => {
    const pricing = calculatePricing({
      items: [{ unitPricePaise: 24900, quantity: 2, categoryId: "cat-a" }],
      coupon: percentCoupon,
      settings,
    });

    expect(pricing).toMatchObject({
      subtotalPaise: 49800,
      discountPaise: 4980,
      taxPaise: 2241,
      deliveryFeePaise: 3900,
      totalPaise: 50961,
      currency: "INR",
    });
  });

  it("caps percent coupons and never exceeds subtotal", () => {
    const capped = calculatePricing({
      items: [{ unitPricePaise: 100000, quantity: 1 }],
      coupon: percentCoupon,
      settings,
    });
    expect(capped.discountPaise).toBe(5000);

    expect(
      computeCouponDiscount({ type: "fixed", amountPaise: 90000 }, 50000)
    ).toBe(50000);
  });

  it("applies category-scoped discounts only to eligible lines", () => {
    const pricing = calculatePricing({
      items: [
        { unitPricePaise: 10000, quantity: 1, categoryId: "cat-a" },
        { unitPricePaise: 20000, quantity: 1, categoryId: "cat-b" },
      ],
      coupon: { ...percentCoupon, percentBps: 5000, maxDiscountPaise: null, applicableCategoryIds: ["cat-a"] },
      settings,
    });

    expect(pricing.subtotalPaise).toBe(30000);
    expect(pricing.discountPaise).toBe(5000);
    expect(pricing.taxPaise).toBe(1250);
    expect(pricing.totalPaise).toBe(30150);
  });

  it("waives delivery above the free-delivery threshold", () => {
    const pricing = calculatePricing({
      items: [{ unitPricePaise: 50000, quantity: 1 }],
      coupon: null,
      settings,
    });

    expect(pricing.deliveryFeePaise).toBe(0);
    expect(pricing.taxPaise).toBe(2500);
    expect(pricing.totalPaise).toBe(52500);
  });

  it("rounds tax half-up on integer paise", () => {
    const pricing = calculatePricing({
      items: [{ unitPricePaise: 333, quantity: 1 }],
      coupon: null,
      settings,
    });

    expect(pricing.taxPaise).toBe(17);
    expect(pricing.totalPaise).toBe(333 + 17 + 3900);
  });
});
