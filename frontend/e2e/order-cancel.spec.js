import { test, expect } from "@playwright/test";
import { adminApi, adminAttempt, loginAsAdmin } from "./helpers/admin.js";
import { backendEnv } from "./helpers/env.js";
import { placePaidOrder, registerCustomer } from "./helpers/customer.js";

/**
 * Cancelling a paid order is the one admin action that touches money and
 * stock at the same time: it refunds the payment, returns the units to the
 * inventory and writes an inventory log entry. The spec drives the real UI
 * and then verifies the side effects through the API.
 */

const stockOf = async (page, productId) => {
  const body = await adminApi(page, { path: `/api/v1/admin/products/${productId}` });
  return body.data.product.stock;
};

test("admin can cancel a paid order, restock it and keep the record", async ({ browser }) => {
  test.setTimeout(180_000);

  const webhookSecret = backendEnv().STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be set in backend/.env");
  }

  const adminContext = await browser.newContext();
  const customerContext = await browser.newContext();
  const page = await adminContext.newPage();
  const stamp = Date.now().toString().slice(-8);
  const reason = `E2E cancellation ${stamp}`;

  try {
    const customer = await registerCustomer(customerContext);
    const { order, product } = await placePaidOrder(customerContext, customer, {
      webhookSecret,
      quantity: 2,
    });

    await loginAsAdmin(page);

    // Paying took the units out of stock.
    const stockAfterPayment = await stockOf(page, product.id);
    expect(stockAfterPayment).toBe(product.stock - 2);

    await page.goto(`/admin/orders/${order.id}`);
    await expect(
      page.getByRole("heading", { name: new RegExp(order.orderNumber) })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".detail-header")).toContainText("Confirmed");
    await expect(page.locator(".detail-header")).toContainText("Paid");

    // Cancelling needs a reason before it reaches the API.
    await page.getByRole("button", { name: "Cancel Order" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancel Order" });
    await expect(dialog).toBeVisible();

    const reasonField = dialog.getByLabel("Cancellation reason");
    await expect(reasonField).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel Order" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Please add a short reason");
    await expect(reasonField).toHaveAttribute("aria-invalid", "true");
    await expect(reasonField).toHaveAttribute("aria-describedby", "cancel-reason-error");

    await reasonField.fill(reason);
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel Order" }).click();

    await expect(page.getByText("Order cancelled")).toBeVisible();
    await expect(dialog).toHaveCount(0);

    // The header shows the new status, the refunded payment and the timeline entry.
    await expect(page.locator(".detail-header")).toContainText("Cancelled");
    await expect(page.locator(".detail-header")).toContainText("Refunded");
    await expect(page.locator(".detail-header")).not.toContainText("Paid");
    await expect(page.locator(".timeline")).toContainText(reason);

    // No further action is offered on a cancelled order.
    await expect(page.getByRole("heading", { name: "Cancel order", level: 3 })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Preparing", exact: true })).toHaveCount(0);
    await expect(page.getByText("No forward status change is available.")).toBeVisible();

    // The units came back and the inventory log records the return.
    expect(await stockOf(page, product.id)).toBe(stockAfterPayment + 2);

    const logs = await adminApi(page, {
      path: `/api/v1/admin/inventory/logs?productId=${product.id}&reason=cancel&limit=5`,
    });
    const restock = logs.data.items.find(
      (entry) => entry.orderId === order.id && entry.reason === "cancel"
    );
    expect(restock).toBeTruthy();
    expect(restock.delta).toBe(2);
    expect(restock.product.name).toBe(product.name);

    // Both cancel attempts and invalid transitions are refused from the API.
    const secondCancel = await adminAttempt(page, {
      method: "POST",
      path: `/api/v1/admin/orders/${order.id}/cancel`,
      data: { reason: "Cancelling twice" },
    });
    expect(secondCancel.status()).toBe(409);
    expect((await secondCancel.json()).error.code).toBe("INVALID_TRANSITION");

    const invalidTransition = await adminAttempt(page, {
      method: "PATCH",
      path: `/api/v1/admin/orders/${order.id}/status`,
      data: { status: "delivered" },
    });
    expect(invalidTransition.status()).toBe(409);
    expect((await invalidTransition.json()).error.code).toBe("INVALID_TRANSITION");

    // The customer sees the cancellation and the reason in their timeline.
    const customerPage = await customerContext.newPage();
    await customerPage.goto(`/orders/${order.id}`);
    await expect(customerPage.getByTestId("order-status")).toHaveText("Cancelled", {
      timeout: 20_000,
    });
    const customerTimeline = customerPage.locator(".timeline");
    await expect(customerTimeline).toContainText(reason);
    await expect(customerTimeline).toContainText("Payment confirmed");
    await expect(customerTimeline.locator(".timeline-time").first()).not.toBeEmpty();

    // …and the API agrees with what the pages show.
    const customerOrder = await customerContext.request.get(
      `${process.env.API_URL || "http://localhost:4000"}/api/v1/orders/${order.id}`
    );
    expect(customerOrder.ok()).toBe(true);
    const customerBody = await customerOrder.json();
    expect(customerBody.data.order.status).toBe("cancelled");
    expect(customerBody.data.order.paymentStatus).toBe("refunded");
    expect(customerBody.data.order.cancellationReason).toBe(reason);
  } finally {
    await adminContext.close();
    await customerContext.close();
  }
});
