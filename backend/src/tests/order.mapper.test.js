import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { toOrderResponse } from "../services/order.service.js";

describe("order response mapping", () => {
  it("maps legacy orders for the new API", () => {
    const order = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Legacy item",
          price: 24,
          image: "legacy.png",
          quantity: 2,
        },
      ],
      amount: 50,
      address: { city: "Pune" },
      status: "Food Processing",
      payment: true,
    };

    const response = toOrderResponse(order);

    expect(response.pricing.totalPaise).toBe(5000);
    expect(response.status).toBe("preparing");
    expect(response.paymentStatus).toBe("paid");
    expect(response.items[0]).toMatchObject({
      name: "Legacy item",
      unitPricePaise: 2400,
      lineTotalPaise: 4800,
      imageUrl: "/images/legacy.png",
      quantity: 2,
    });
    expect(response.orderNumber).toMatch(/^FD-/);
  });

  it("maps new orders including customer details", () => {
    const userId = new mongoose.Types.ObjectId();
    const order = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: "FD-20261102-ABCDE",
      userId: { _id: userId, name: "Asha", email: "asha@example.com", phone: "9999999999" },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: "Paneer Pizza",
          imageUrl: "/images/pizza.png",
          unitPricePaise: 24900,
          quantity: 2,
          lineTotalPaise: 49800,
        },
      ],
      pricing: {
        subtotalPaise: 49800,
        discountPaise: 5000,
        deliveryFeePaise: 3900,
        taxPaise: 2240,
        totalPaise: 50940,
        currency: "INR",
        taxRateBps: 500,
      },
      status: "confirmed",
      paymentStatus: "paid",
      payment: { provider: "stripe", sessionId: "cs_test_1" },
      statusHistory: [],
      placedAt: new Date(),
    };

    const response = toOrderResponse(order);

    expect(response.orderNumber).toBe("FD-20261102-ABCDE");
    expect(response.customer).toMatchObject({ name: "Asha", email: "asha@example.com" });
    expect(response.pricing.totalPaise).toBe(50940);
    expect(response.payment.sessionId).toBe("cs_test_1");
  });

  it("keeps the timeline note, timestamp and actor", () => {
    const actorId = new mongoose.Types.ObjectId();
    const cancelledAt = new Date("2026-11-16T10:30:00.000Z");
    const order = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      items: [],
      amount: 12,
      status: "cancelled",
      paymentStatus: "refunded",
      statusHistory: [
        { status: "Pending Payment", at: cancelledAt, byUserId: null, note: "Order placed" },
        { status: "cancelled", at: cancelledAt, byUserId: actorId, note: "Customer asked to cancel" },
      ],
    };

    const response = toOrderResponse(order, { admin: true });

    expect(response.statusHistory).toHaveLength(2);
    expect(response.statusHistory[1]).toMatchObject({
      status: "cancelled",
      note: "Customer asked to cancel",
      byUserId: String(actorId),
    });
    expect(response.statusHistory[1].at).toEqual(cancelledAt);
    expect(response.statusHistory[0]).toMatchObject({
      status: "pending_payment",
      note: "Order placed",
      byUserId: null,
    });
  });
});
