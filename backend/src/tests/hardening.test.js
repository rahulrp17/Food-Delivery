import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app.js";

// The v1 API is mounted behind CSRF protection, so any mutating request needs
// the double-submit token pair (cookie + header) before it reaches a route.
const issueCsrfToken = async () => {
  const response = await request(app).get("/api/v1/auth/csrf");
  const cookies = (response.headers["set-cookie"] || [])
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

  return { token: response.body.data.csrfToken, cookies };
};

describe("API hardening", () => {
  it("serves a health check with a request id", async () => {
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns a consistent 404 error envelope", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.requestId).toBe(response.headers["x-request-id"]);
  });

  it("requires authentication for protected routes", async () => {
    const response = await request(app).get("/api/v1/orders");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("blocks admin-only mutations without a session", async () => {
    const { token, cookies } = await issueCsrfToken();

    const response = await request(app)
      .post("/api/v1/admin/products")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({ name: "Test dish" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects disallowed origins", async () => {
    const response = await request(app)
      .get("/healthz")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows the configured client origin", async () => {
    const response = await request(app)
      .get("/healthz")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects malformed JSON bodies", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("strips query operators from request payloads", async () => {
    const { token, cookies } = await issueCsrfToken();

    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({ email: { $gt: "" }, password: { $gt: "" } });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("issues a CSRF token for the v1 API", async () => {
    const response = await request(app).get("/api/v1/auth/csrf");

    expect(response.status).toBe(200);
    expect(response.body.data.csrfToken).toEqual(expect.any(String));
    expect(response.headers["set-cookie"].join(";")).toContain("fd_csrf=");
  });

  it("requires CSRF for v1 mutations", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "rahul@example.com", password: "strongpass1" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("INVALID_CSRF");
  });

  it("requires a session for v1 user routes", async () => {
    const response = await request(app).get("/api/v1/users/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("permanently rejects the removed legacy API", async () => {
    const response = await request(app)
      .post("/api/orders/verify")
      .send({ orderId: "64b64b64b64b64b64b64b64b", success: true });

    expect(response.status).toBe(410);
    expect(response.body.error.code).toBe("LEGACY_API_REMOVED");
  });
});
