import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { csrfProtection } from "../middleware/csrf.js";
import { errorHandler } from "../middleware/errorHandler.js";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(csrfProtection);
  app.post("/mutate", (req, res) => res.json({ data: { ok: true } }));
  app.use(errorHandler);
  return app;
};

describe("csrfProtection", () => {
  it("allows safe methods", async () => {
    const app = buildApp();
    app.get("/safe", (req, res) => res.json({ data: { ok: true } }));

    const response = await request(app).get("/safe");

    expect(response.status).toBe(200);
  });

  it("rejects mutations without a CSRF token", async () => {
    const response = await request(buildApp()).post("/mutate").send({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("INVALID_CSRF");
  });

  it("rejects mismatched cookie and header tokens", async () => {
    const response = await request(buildApp())
      .post("/mutate")
      .set("Cookie", "fd_csrf=cookie-token")
      .set("X-CSRF-Token", "header-token")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("INVALID_CSRF");
  });

  it("accepts matching cookie and header tokens", async () => {
    const response = await request(buildApp())
      .post("/mutate")
      .set("Cookie", "fd_csrf=shared-token")
      .set("X-CSRF-Token", "shared-token")
      .send({});

    expect(response.status).toBe(200);
  });

  it("rejects disallowed origins even with a matching token", async () => {
    const response = await request(buildApp())
      .post("/mutate")
      .set("Origin", "https://evil.example")
      .set("Cookie", "fd_csrf=shared-token")
      .set("X-CSRF-Token", "shared-token")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("accepts the configured client origin", async () => {
    const response = await request(buildApp())
      .post("/mutate")
      .set("Origin", "http://localhost:5173")
      .set("Cookie", "fd_csrf=shared-token")
      .set("X-CSRF-Token", "shared-token")
      .send({});

    expect(response.status).toBe(200);
  });
});
