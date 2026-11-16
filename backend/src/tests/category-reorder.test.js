import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/category.model.js", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    bulkWrite: vi.fn(),
  },
}));

vi.mock("../models/product.model.js", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../models/inventoryLog.model.js", () => ({
  default: { create: vi.fn() },
}));

vi.mock("../services/notification.service.js", () => ({
  createNotification: vi.fn(),
}));

import Category from "../models/category.model.js";
import { reorderCategories, reorderCategory } from "../services/catalog.service.js";

const makeCategory = (id, name, sortOrder) => ({
  _id: id,
  name,
  sortOrder,
  toJSON: () => ({ id, name, sortOrder }),
});

const categoryDocs = [
  makeCategory("c1", "Starters", 0),
  makeCategory("c2", "Mains", 1),
  makeCategory("c3", "Desserts", 2),
];

const mockCategories = (docs = categoryDocs) => {
  const chain = {
    sort: vi.fn(() => Promise.resolve(docs)),
  };
  Category.find.mockReturnValue(chain);
  return chain;
};

describe("category reordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Category.bulkWrite.mockResolvedValue({ modifiedCount: 0 });
    mockCategories();
  });

  it("persists the submitted order as sequential sortOrder values", async () => {
    const result = await reorderCategories(["c3", "c1", "c2"]);

    expect(Category.bulkWrite).toHaveBeenCalledTimes(1);
    const operations = Category.bulkWrite.mock.calls[0][0];
    expect(operations.map((op) => op.updateOne.update.$set.sortOrder)).toEqual([0, 1, 2]);
    expect(operations.map((op) => String(op.updateOne.filter._id))).toEqual([
      "c3",
      "c1",
      "c2",
    ]);
    expect(result.map((category) => category.id)).toEqual(["c3", "c1", "c2"]);
    expect(result.map((category) => category.sortOrder)).toEqual([0, 1, 2]);
  });

  it("appends categories that were not part of the submitted order", async () => {
    const result = await reorderCategories(["c2"]);

    expect(result.map((category) => category.id)).toEqual(["c2", "c1", "c3"]);
    expect(result.map((category) => category.sortOrder)).toEqual([0, 1, 2]);
  });

  it("ignores duplicate ids", async () => {
    const result = await reorderCategories(["c1", "c1", "c2"]);

    expect(result.map((category) => category.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("rejects an unknown category id", async () => {
    await expect(reorderCategories(["c1", "nope"])).rejects.toMatchObject({
      status: 404,
    });
    expect(Category.bulkWrite).not.toHaveBeenCalled();
  });

  it("rejects an empty order", async () => {
    await expect(reorderCategories([])).rejects.toMatchObject({ status: 400 });
  });

  it("moves a single category up and down", async () => {
    await reorderCategory("c2", "up");

    const operations = Category.bulkWrite.mock.calls[0][0];
    expect(operations.map((op) => String(op.updateOne.filter._id))).toEqual([
      "c2",
      "c1",
      "c3",
    ]);
  });

  it("keeps the order when a category is already at the edge", async () => {
    await reorderCategory("c1", "up");

    expect(Category.bulkWrite).not.toHaveBeenCalled();
  });
});
