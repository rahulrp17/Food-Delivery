import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/order.model.js", () => ({
  default: { aggregate: vi.fn(), find: vi.fn() },
}));

vi.mock("../models/product.model.js", () => ({
  default: { find: vi.fn() },
}));

vi.mock("../models/user.model.js", () => ({
  default: { find: vi.fn(), countDocuments: vi.fn() },
}));

vi.mock("../models/address.model.js", () => ({ default: {} }));
vi.mock("../models/cart.model.js", () => ({ default: {} }));

vi.mock("../services/pricing.service.js", () => ({ calculatePricing: vi.fn() }));
vi.mock("../services/coupon.service.js", () => ({ validateCouponForCart: vi.fn() }));
vi.mock("../services/settings.service.js", () => ({
  getStoreSettings: vi.fn(),
  assertStoreOpen: vi.fn(),
}));
vi.mock("../services/inventory.service.js", () => ({ restockOrder: vi.fn() }));
vi.mock("../services/payment.service.js", () => ({ refundOrderPayment: vi.fn() }));
vi.mock("../services/catalog.service.js", () => ({ toProductListItem: vi.fn() }));
vi.mock("../services/cart.service.js", () => ({
  addCartItem: vi.fn(),
  getCart: vi.fn(),
}));
vi.mock("../services/notification.service.js", () => ({ createNotification: vi.fn() }));

import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { getAdminOverview } from "../services/order.service.js";

/** Chainable stand-in for the Mongoose cursor used by the overview queries. */
const cursor = (value) => {
  const chain = {
    select: () => chain,
    populate: () => chain,
    sort: () => chain,
    limit: () => chain,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };

  return chain;
};

const stubOverviewQueries = ({
  totals = {},
  series = [],
  scopedStatuses = [],
  today = [],
  liveStatuses = [],
} = {}) => {
  Order.aggregate
    .mockResolvedValueOnce([{ _id: null, orderCount: 0, paidOrderCount: 0, revenuePaise: 0, ...totals }])
    .mockResolvedValueOnce(series)
    .mockResolvedValueOnce(scopedStatuses)
    .mockResolvedValueOnce(today)
    .mockResolvedValueOnce(liveStatuses)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);

  Order.find.mockReturnValue(cursor([]));
  Product.find.mockReturnValue(cursor([]));
  User.find.mockReturnValue(cursor([]));
  User.countDocuments.mockResolvedValue(7);
};

describe("admin overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports present-tense counts even when the range excludes them", async () => {
    stubOverviewQueries({
      scopedStatuses: [],
      liveStatuses: [
        { _id: "preparing", count: 3 },
        { _id: "pending_payment", count: 2 },
        { _id: "delivered", count: 9 },
      ],
    });

    const overview = await getAdminOverview({ from: "2020-01-01", to: "2020-01-01" });

    // The donut follows the selected (empty) range…
    expect(overview.statusBreakdown).toEqual([]);
    expect(overview.orderCount).toBe(0);
    expect(overview.revenuePaise).toBe(0);

    // …while "active now" and "awaiting payment" keep describing right now.
    expect(overview.activeOrderCount).toBe(3);
    expect(overview.pendingOrderCount).toBe(2);
    expect(overview.today.activeOrderCount).toBe(3);
    expect(overview.customerCount).toBe(7);
  });

  it("counts every alias of an active status in the live totals", async () => {
    stubOverviewQueries({
      liveStatuses: [
        { _id: "confirmed", count: 1 },
        { _id: "preparing", count: 1 },
        { _id: "food_processing", count: 2 },
        { _id: "Out for Delivery", count: 1 },
        { _id: "cancelled", count: 4 },
      ],
    });

    const overview = await getAdminOverview();

    expect(overview.activeOrderCount).toBe(5);
    expect(overview.pendingOrderCount).toBe(0);
  });

  it("returns ordered daily buckets and the aggregated period totals", async () => {
    stubOverviewQueries({
      totals: { orderCount: 4, paidOrderCount: 2, revenuePaise: 45000 },
      series: [
        { _id: "2020-01-01", orderCount: 1, revenuePaise: 20000 },
        { _id: "2020-01-03", orderCount: 2, revenuePaise: 25000 },
      ],
      today: [{ _id: null, orderCount: 1, revenuePaise: 5000 }],
    });

    const overview = await getAdminOverview({ from: "2020-01-01", to: "2020-01-03" });

    expect(overview.revenuePaise).toBe(45000);
    expect(overview.paidOrderCount).toBe(2);
    expect(overview.aovPaise).toBe(22500);
    expect(overview.today).toMatchObject({ revenuePaise: 5000, orderCount: 1 });
    expect(overview.series.map((entry) => entry.date)).toEqual([
      "2020-01-01",
      "2020-01-02",
      "2020-01-03",
    ]);
    expect(overview.series[0]).toMatchObject({ orderCount: 1, revenuePaise: 20000 });
    expect(overview.series[1]).toMatchObject({ orderCount: 0, revenuePaise: 0 });
    expect(overview.series[2]).toMatchObject({ orderCount: 2, revenuePaise: 25000 });
  });
});
