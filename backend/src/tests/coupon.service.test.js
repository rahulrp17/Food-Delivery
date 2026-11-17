import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/coupon.model.js", () => ({
  default: { find: vi.fn(), countDocuments: vi.fn(), updateOne: vi.fn() },
}));
vi.mock("../models/order.model.js", () => ({
  default: { aggregate: vi.fn(), findOne: vi.fn() },
}));
vi.mock("../services/payment.service.js", () => ({ refundOrderPayment: vi.fn() }));
vi.mock("../services/inventory.service.js", () => ({ restockOrder: vi.fn() }));

const { default: Coupon } = await import("../models/coupon.model.js");
const { default: Order } = await import("../models/order.model.js");
const { listCoupons } = await import("../services/coupon.service.js");
const { cancelUserOrder } = await import("../services/order.service.js");

const couponCursor = (items = []) => {
  const cursor = {
    sort: () => cursor,
    skip: () => cursor,
    limit: () => Promise.resolve(items),
  };
  return cursor;
};

beforeEach(() => {
  vi.clearAllMocks();
  Coupon.find.mockReturnValue(couponCursor([{ toJSON: () => ({ code: "SAVE20" }) }]));
  Coupon.countDocuments.mockResolvedValue(1);
  Coupon.updateOne.mockResolvedValue({ modifiedCount: 1 });
  Order.aggregate.mockResolvedValue([]);
});

describe("coupon list filters", () => {
  it("treats an enabled coupon that has not started as scheduled", async () => {
    await listCoupons({ status: "scheduled" });

    const query = Coupon.find.mock.calls[0][0];

    expect(query.isActive).toBeUndefined();
    expect(query.startsAt.$gt).toBeInstanceOf(Date);
    expect(query.expiresAt).toBeUndefined();
  });

  it("treats an enabled coupon past its expiry as expired", async () => {
    await listCoupons({ status: "expired" });

    const query = Coupon.find.mock.calls[0][0];

    expect(query.isActive).toBeUndefined();
    expect(query.expiresAt.$ne).toBeNull();
    expect(query.expiresAt.$lte).toBeInstanceOf(Date);
  });

  it("only lists enabled coupons that have started and not expired as active", async () => {
    await listCoupons({ status: "active" });

    const query = Coupon.find.mock.calls[0][0];

    expect(query.isActive).toBe(true);
    expect(query.$and).toHaveLength(2);

    const [started, notExpired] = query.$and;
    expect(started.$or[0]).toEqual({ startsAt: null });
    expect(started.$or[1].startsAt.$lte).toBeInstanceOf(Date);
    expect(notExpired.$or[0]).toEqual({ expiresAt: null });
    expect(notExpired.$or[1].expiresAt.$gt).toBeInstanceOf(Date);
  });

  it("counts redeemed money from live orders only, using the pricing field", async () => {
    await listCoupons({});

    const pipeline = Order.aggregate.mock.calls[0][0];

    expect(pipeline[0].$match.status).toEqual({
      $nin: ["cancelled", "payment_failed"],
    });
    expect(pipeline[1].$group.totalDiscount.$sum).toBe("$pricing.discountPaise");
  });
});

describe("cancelling an order", () => {
  const buildOrder = (overrides = {}) => {
    const order = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      items: [],
      status: "confirmed",
      paymentStatus: "paid",
      payment: {},
      couponCode: "SAVE20",
      statusHistory: [],
      save: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    return order;
  };

  it("hands the coupon usage slot back when a paid order is cancelled", async () => {
    const order = buildOrder();
    Order.findOne.mockResolvedValue(order);

    const response = await cancelUserOrder(order.userId, order._id, "Changed my mind");

    expect(response.status).toBe("cancelled");
    expect(Coupon.updateOne).toHaveBeenCalledWith(
      { code: "SAVE20", deletedAt: null, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } }
    );
  });

  it("leaves the coupon alone when the cancelled order was never paid", async () => {
    const order = buildOrder({ paymentStatus: "unpaid", couponCode: "" });
    Order.findOne.mockResolvedValue(order);

    await cancelUserOrder(order.userId, order._id, "Changed my mind");

    expect(Coupon.updateOne).not.toHaveBeenCalled();
  });
});
