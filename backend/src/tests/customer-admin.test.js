import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/user.model.js", () => ({
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../models/address.model.js", () => ({
  default: { find: vi.fn() },
}));

vi.mock("../models/order.model.js", () => ({
  default: { find: vi.fn(), aggregate: vi.fn() },
}));

vi.mock("../models/product.model.js", () => ({
  default: { exists: vi.fn() },
}));

vi.mock("../services/order.service.js", () => ({
  toOrderResponse: (order) => ({ id: String(order._id), orderNumber: order.orderNumber }),
  attachMissingItemImages: async (orders) => orders,
}));

import Address from "../models/address.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { getCustomerAdmin, updateCustomerStatus } from "../services/user.service.js";

const makeUser = (overrides = {}) => ({
  _id: "customer-1",
  name: "Asha Rao",
  email: "asha@example.com",
  phone: "9876543210",
  role: "user",
  status: "active",
  tokenVersion: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  lastLoginAt: null,
  ...overrides,
});

const makeAddress = (overrides = {}) => {
  const address = {
    _id: "address-1",
    label: "Home",
    recipientName: "Asha Rao",
    phone: "9876543210",
    line1: "42 Test Kitchen Road",
    line2: "",
    landmark: "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    isDefault: true,
    ...overrides,
  };

  return {
    ...address,
    toJSON: () => ({ id: "address-1", ...address }),
  };
};

describe("admin customer service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    User.findById.mockReturnValue({
      select: vi.fn(() => Promise.resolve(makeUser())),
    });

    Address.find.mockReturnValue({
      sort: vi.fn(() => Promise.resolve([makeAddress()])),
    });

    Order.find.mockReturnValue({
      sort: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([{ _id: "order-1", orderNumber: "FD-1" }])),
      })),
    });

    Order.aggregate.mockResolvedValue([]);
  });

  it("returns the profile, the orders and the saved addresses", async () => {
    const result = await getCustomerAdmin("customer-1");

    expect(result.customer.email).toBe("asha@example.com");
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].orderNumber).toBe("FD-1");
    expect(result.addresses).toHaveLength(1);
    expect(result.addresses[0].pincode).toBe("560001");
  });

  it("rejects an unknown customer", async () => {
    User.findById.mockReturnValue({
      select: vi.fn(() => Promise.resolve(null)),
    });

    await expect(getCustomerAdmin("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("invalidates the open sessions when an account is suspended", async () => {
    const user = makeUser();
    user.save = vi.fn(() => Promise.resolve(user));
    User.findById.mockResolvedValue(user);

    await updateCustomerStatus("customer-1", "suspended");

    expect(user.status).toBe("suspended");
    expect(user.tokenVersion).toBe(1);
    expect(user.save).toHaveBeenCalled();
  });

  it("keeps the token version when an account is reactivated", async () => {
    const user = makeUser({ status: "suspended", tokenVersion: 3 });
    user.save = vi.fn(() => Promise.resolve(user));
    User.findById.mockResolvedValue(user);

    await updateCustomerStatus("customer-1", "active");

    expect(user.status).toBe("active");
    expect(user.tokenVersion).toBe(3);
  });

  it("never suspends an administrator account", async () => {
    const user = makeUser({ role: "admin" });
    user.save = vi.fn(() => Promise.resolve(user));
    User.findById.mockResolvedValue(user);

    await expect(updateCustomerStatus("customer-1", "suspended")).rejects.toMatchObject({
      status: 403,
    });
    expect(user.save).not.toHaveBeenCalled();
  });
});
