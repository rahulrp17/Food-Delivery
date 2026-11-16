import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app.js";

describe("catalog API guards", () => {
  it("validates product list query before hitting the database", async () => {
    const response = await request(app).get("/api/v1/products?sort=cheapest");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details[0].field).toBe("sort");
  });

  it("rejects inverted price ranges", async () => {
    const response = await request(app).get(
      "/api/v1/products?minPricePaise=1000&maxPricePaise=500"
    );

    expect(response.status).toBe(400);
  });

  it("requires admin authentication for catalog management", async () => {
    const response = await request(app).get("/api/v1/admin/categories");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("requires a non-empty search term", async () => {
    const response = await request(app).get("/api/v1/search?q=");

    expect(response.status).toBe(400);
  });
});
