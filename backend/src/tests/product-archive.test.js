import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/product.model.js", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock("../models/category.model.js", () => ({
  default: { findOne: vi.fn() },
}));

vi.mock("../models/inventoryLog.model.js", () => ({
  default: { create: vi.fn() },
}));

vi.mock("../services/notification.service.js", () => ({
  createNotification: vi.fn(),
}));

import Product from "../models/product.model.js";
import { listProducts, restoreProduct } from "../services/catalog.service.js";

const queryChain = (result = []) => {
  const chain = {
    populate: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};

const archivedProduct = {
  _id: "product-1",
  name: "Paneer Pizza",
  slug: "paneer-pizza",
  description: "Fresh paneer with peppers.",
  pricePaise: 24900,
  stock: 8,
  isAvailable: true,
};

describe("product archive workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Product.find.mockReturnValue(queryChain());
    Product.countDocuments.mockResolvedValue(0);
  });

  it("lists archived products for the admin when asked for them", async () => {
    await listProducts({ page: 1, limit: 20, archived: true }, { includeArchived: true });

    expect(Product.find).toHaveBeenCalledWith({ deletedAt: { $ne: null } });
  });

  it("never exposes archived products to the storefront", async () => {
    await listProducts({ page: 1, limit: 20, archived: true });

    expect(Product.find).toHaveBeenCalledWith({ deletedAt: null });
  });

  it("restores an archived product back into the live catalog", async () => {
    Product.findOneAndUpdate.mockReturnValue({ populate: () => archivedProduct });

    const product = await restoreProduct("product-1");

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "product-1", deletedAt: { $ne: null } },
      { $set: { deletedAt: null, isAvailable: true } },
      { new: true }
    );
    expect(product.id).toBe("product-1");
    expect(product.isAvailable).toBe(true);
  });

  it("refuses to restore a product that is not archived", async () => {
    Product.findOneAndUpdate.mockReturnValue({ populate: () => null });

    await expect(restoreProduct("product-2")).rejects.toMatchObject({ status: 404 });
  });
});
