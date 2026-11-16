import { describe, expect, it } from "vitest";
import { normalizeOrderStatus, orderStatusDbValues } from "../utils/orderStatus.js";

describe("order status normalization", () => {
  it("maps legacy title-case statuses to canonical values", () => {
    expect(normalizeOrderStatus("Food Processing")).toBe("preparing");
    expect(normalizeOrderStatus("Out for Delivery")).toBe("out_for_delivery");
    expect(normalizeOrderStatus("Delivered")).toBe("delivered");
    expect(normalizeOrderStatus("Pending Payment")).toBe("pending_payment");
  });

  it("keeps canonical statuses unchanged", () => {
    expect(normalizeOrderStatus("preparing")).toBe("preparing");
    expect(normalizeOrderStatus("refunded")).toBe("refunded");
  });

  it("returns legacy database aliases for status filters", () => {
    expect(orderStatusDbValues("preparing")).toEqual(
      expect.arrayContaining(["preparing", "Food Processing"])
    );
    expect(orderStatusDbValues("out_for_delivery")).toEqual(
      expect.arrayContaining(["out_for_delivery", "Out for Delivery"])
    );
  });
});
