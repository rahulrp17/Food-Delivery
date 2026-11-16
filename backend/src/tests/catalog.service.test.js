import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { toProductDetail, toProductListItem } from "../services/catalog.service.js";

const baseProduct = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  name: "Paneer Pizza",
  slug: "paneer-pizza",
  description: "Fresh paneer with peppers and mozzarella.",
  shortDescription: "Paneer and peppers",
  image: "pizza.png",
  pricePaise: 24900,
  compareAtPricePaise: 29900,
  categoryId: {
    _id: new mongoose.Types.ObjectId(),
    name: "Pizza",
    slug: "pizza",
  },
  category: "Pizza",
  isVeg: true,
  ratingAvg: 4.5,
  ratingCount: 12,
  prepTimeMinutes: 25,
  stock: 10,
  isAvailable: true,
  isFeatured: true,
  isBestseller: false,
  isNewArrival: true,
  gallery: ["pizza-1.png", "https://cdn.example/pizza-2.png"],
  allergens: ["milk"],
  ingredients: ["paneer"],
  nutrition: { calories: 600 },
  tags: ["pizza"],
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

describe("catalog product mapping", () => {
  it("maps a product to the public list shape", () => {
    const item = toProductListItem(baseProduct());

    expect(item.id).toBeTruthy();
    expect(item.pricePaise).toBe(24900);
    expect(item.image).toEqual({ url: "/images/pizza.png" });
    expect(item.category).toMatchObject({ name: "Pizza", slug: "pizza" });
    expect(item.isNew).toBe(true);
    expect(item.isOrderable).toBe(true);
  });

  it("marks out-of-stock products as not orderable", () => {
    const item = toProductListItem(baseProduct({ stock: 0 }));

    expect(item.isOrderable).toBe(false);
  });

  it("falls back to legacy whole-rupee price", () => {
    const legacy = baseProduct({
      pricePaise: undefined,
      price: 24,
      get(key) {
        return key === "price" ? 24 : undefined;
      },
    });

    expect(toProductListItem(legacy).pricePaise).toBe(2400);
  });

  it("builds image urls for gallery entries in the detail shape", () => {
    const detail = toProductDetail(baseProduct());

    expect(detail.gallery).toEqual([
      { url: "/images/pizza-1.png" },
      { url: "https://cdn.example/pizza-2.png" },
    ]);
    expect(detail.description).toContain("Fresh paneer");
  });
});
