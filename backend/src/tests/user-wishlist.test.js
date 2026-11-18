import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/user.model.js", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("../models/address.model.js", () => ({
  default: { find: vi.fn() },
}));

vi.mock("../models/order.model.js", () => ({
  default: { find: vi.fn() },
}));

vi.mock("../models/product.model.js", () => ({
  default: { exists: vi.fn() },
}));

vi.mock("../services/order.service.js", () => ({
  toOrderResponse: (order) => order,
  attachMissingItemImages: async (orders) => orders,
}));

import User from "../models/user.model.js";
import { getWishlist } from "../services/user.service.js";

const makeProduct = (overrides = {}) => ({
  _id: "food-1",
  name: "Ripple Ice Cream",
  slug: "ripple-ice-cream",
  shortDescription: "Vanilla ripple with berry sauce.",
  image: null,
  pricePaise: 2200,
  compareAtPricePaise: null,
  categoryId: { _id: "cat-1", name: "Desserts", slug: "desserts" },
  isVeg: true,
  ratingAvg: 5,
  ratingCount: 5,
  prepTimeMinutes: 25,
  stock: 12,
  isAvailable: true,
  ...overrides,
});

const mockPopulate = (wishlist) => {
  User.findById.mockReturnValue({
    populate: vi.fn(() => Promise.resolve({ wishlist })),
  });
};

describe("getWishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes saved dishes exactly like storefront cards", async () => {
    mockPopulate([makeProduct()]);

    const items = await getWishlist("user-1");

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "food-1",
      name: "Ripple Ice Cream",
      slug: "ripple-ice-cream",
      pricePaise: 2200,
      category: { id: "cat-1", name: "Desserts", slug: "desserts" },
      ratingAvg: 5,
      ratingCount: 5,
      prepTimeMinutes: 25,
      isOrderable: true,
    });
    expect(items[0]).not.toHaveProperty("description");
  });

  it("drops archived dishes that populate as null", async () => {
    mockPopulate([
      null,
      makeProduct({ _id: "food-2", name: "Veg Rolls", slug: "veg-rolls" }),
    ]);

    const items = await getWishlist("user-1");

    expect(items).toHaveLength(1);
    expect(items[0].slug).toBe("veg-rolls");
  });

  it("rejects an unknown user", async () => {
    User.findById.mockReturnValue({
      populate: vi.fn(() => Promise.resolve(null)),
    });

    await expect(getWishlist("missing")).rejects.toMatchObject({ status: 404 });
  });
});
