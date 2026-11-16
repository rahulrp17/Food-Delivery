import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "../services/audit.service.js";

describe("sanitizeAuditMetadata", () => {
  it("redacts credential fields recursively", () => {
    const result = sanitizeAuditMetadata({
      email: "admin@example.com",
      password: "plain-text",
      nested: {
        csrfToken: "token-value",
        cardNumber: "4242424242424242",
        note: "Status changed",
      },
    });

    expect(result.email).toBe("admin@example.com");
    expect(result.password).toBe("[redacted]");
    expect(result.nested.csrfToken).toBe("[redacted]");
    expect(result.nested.cardNumber).toBe("[redacted]");
    expect(result.nested.note).toBe("Status changed");
  });

  it("truncates oversized strings and arrays", () => {
    const result = sanitizeAuditMetadata({
      note: "x".repeat(600),
      items: Array.from({ length: 40 }, (_, index) => index),
    });

    expect(result.note).toHaveLength(503);
    expect(result.items).toHaveLength(25);
  });
});
