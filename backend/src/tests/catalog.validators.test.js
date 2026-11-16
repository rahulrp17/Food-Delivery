import { describe, expect, it } from "vitest";
import {
  productCreateSchema,
  productListQuerySchema,
  productStockSchema,
  reviewCreateSchema,
  searchQuerySchema,
} from "../validators/catalog.schema.js";

const validProduct = {
  name: "Paneer Pizza",
  description: "Fresh paneer with peppers and mozzarella.",
  categoryId: "64b7f9a2c1d3e4f5a6b7c8d9",
  pricePaise: 24900,
  compareAtPricePaise: 29900,
};

describe("catalog validators", () => {
  it("accepts a valid product payload", () => {
    const result = productCreateSchema.safeParse({
      ...validProduct,
      isVeg: true,
      tags: ["pizza", "veg"],
  });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields and invalid prices", () => {
    expect(
      productCreateSchema.safeParse({ ...validProduct, surprise: true }).success
    ).toBe(false);

    expect(
      productCreateSchema.safeParse({ ...validProduct, pricePaise: -1 }).success
    ).toBe(false);

    expect(
      productCreateSchema.safeParse({
        ...validProduct,
        compareAtPricePaise: 100,
      }).success
    ).toBe(false);
  });

  it("coerces list query pagination and boolean filters", () => {
    const result = productListQuerySchema.safeParse({
      page: "2",
      limit: "50",
      veg: "true",
      sort: "price_asc",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      page: 2,
      limit: 50,
      veg: true,
      sort: "price_asc",
    });
  });

  it("rejects unknown sort options and invalid price ranges", () => {
    expect(productListQuerySchema.safeParse({ sort: "cheapest" }).success).toBe(false);

    expect(
      productListQuerySchema.safeParse({ minPricePaise: "1000", maxPricePaise: "500" })
        .success
    ).toBe(false);
  });

  it("requires a search term", () => {
    expect(searchQuerySchema.safeParse({ q: "   " }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "pizza" }).success).toBe(true);
  });

  it("requires exactly one stock mutation field", () => {
    expect(productStockSchema.safeParse({ stock: 5 }).success).toBe(true);
    expect(productStockSchema.safeParse({ delta: -2 }).success).toBe(true);
    expect(productStockSchema.safeParse({}).success).toBe(false);
    expect(productStockSchema.safeParse({ stock: 5, delta: 1 }).success).toBe(false);
  });

  it("validates review ratings", () => {
    expect(
      reviewCreateSchema.safeParse({
        productId: "64b7f9a2c1d3e4f5a6b7c8d9",
        rating: 5,
        body: "Great",
      }).success
    ).toBe(true);

    expect(
      reviewCreateSchema.safeParse({
        productId: "64b7f9a2c1d3e4f5a6b7c8d9",
        rating: 6,
      }).success
    ).toBe(false);
  });
});
