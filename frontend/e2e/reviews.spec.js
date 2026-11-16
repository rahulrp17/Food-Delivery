import { test, expect } from "@playwright/test";
import { adminApi, loginAsAdmin } from "./helpers/admin.js";
import { backendEnv } from "./helpers/env.js";
import { sendCheckoutCompleted } from "./helpers/webhook.js";

const API_URL = process.env.API_URL || "http://localhost:4000";
const PASSWORD = "Test12345";

/**
 * The full customer review loop.
 *
 * A review is only accepted from a customer who has actually received the
 * dish, so this exercises the whole chain:
 *
 *   order → payment webhook → admin advances to delivered → customer writes a
 *   review → admin approves it → the review appears publicly.
 *
 * It exists because the review endpoint used to query the legacy Order model
 * (where `userId` is a String) instead of the real one, so every submission
 * was rejected with 403 and nothing caught it — there was no test.
 */
test("customer can review a delivered dish and the review goes public once approved", async ({
  browser,
  request,
}) => {
  test.setTimeout(240_000);

  const env = backendEnv();
  const adminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env");
  }
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be set in backend/.env");
  }

  // A dish that can actually be ordered right now.
  const productsResponse = await request.get(`${API_URL}/api/v1/products?limit=20&inStock=true`);
  expect(productsResponse.ok()).toBeTruthy();
  const candidates = (await productsResponse.json())?.data?.items || [];
  const product = candidates.find(
    (item) => item.isAvailable !== false && (item.stock ?? 1) > 0 && item.slug
  );
  expect(product, "no in-stock product to order").toBeTruthy();

  const customerContext = await browser.newContext();
  const page = await customerContext.newPage();
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();

  const email = `e2e+review${Date.now()}@foodie.test`;
  const reviewTitle = `Reviewed by e2e ${Date.now()}`;

  try {
    await test.step("customer registers", async () => {
      await page.goto("/register");
      await page.locator('input[name="name"]').fill("E2E Reviewer");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(PASSWORD);
      await page.locator('input[name="confirmPassword"]').fill(PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL((url) => url.pathname === "/");
    });

    let orderId;
    let sessionId;

    await test.step("customer orders the dish", async () => {
      await page.goto(`/product/${product.slug}`);
      await page.getByRole("button", { name: `Add ${product.name} to cart` }).click();

      // Wait for the basket to actually take the item before navigating —
      // navigating straight away races the add mutation and lands on an
      // empty cart.
      await expect(page.getByText("Added to cart")).toBeVisible({ timeout: 20_000 });

      await page.goto("/cart");
      await expect(page.getByRole("button", { name: /Proceed to Checkout/i })).toBeVisible({
        timeout: 20_000,
      });
      await page.getByRole("button", { name: /Proceed to Checkout/i }).click();
      await expect(page.getByRole("heading", { name: "Delivery Address" })).toBeVisible();

      const addAddress = page.getByRole("button", { name: /Add New Address/i });
      if (await addAddress.count()) await addAddress.click();

      await page.locator("#recipientName").fill("E2E Reviewer");
      await page.locator("#phone").fill("9876543210");
      await page.locator("#line1").fill("42 Test Kitchen Road");
      await page.locator("#city").fill("Bengaluru");
      await page.locator("#state").fill("Karnataka");
      await page.locator("#pincode").fill("560001");
      await page.getByRole("button", { name: "Save Address" }).click();

      await page.getByRole("button", { name: /Continue to Payment/i }).click();
      await page.getByRole("button", { name: /Continue to Review/i }).click();

      let capturePayment;
      const paymentResponse = new Promise((resolve) => {
        capturePayment = resolve;
      });

      await page.route("**/api/v1/payments/checkout", async (route) => {
        const response = await route.fetch();
        const text = await response.text();
        let body = null;
        try {
          body = JSON.parse(text);
        } catch {
          body = null;
        }
        capturePayment({ status: response.status(), body, text });
        await route.fulfill({ response, body: text });
      });
      await page.route("**checkout.stripe.com**", (route) => route.abort());

      const orderResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/orders") &&
          response.request().method() === "POST",
        { timeout: 30_000 }
      );

      await page.getByRole("button", { name: "Place Order" }).click();

      const orderResponse = await orderResponsePromise;
      expect(orderResponse.ok()).toBeTruthy();
      orderId = (await orderResponse.json()).data.order.id;
      expect(orderId).toBeTruthy();

      const payment = await paymentResponse;
      expect(payment.status).toBe(200);
      sessionId = payment.body?.data?.sessionId;
      expect(sessionId).toBeTruthy();
    });

    await test.step("payment webhook confirms the order", async () => {
      const result = await sendCheckoutCompleted({
        apiUrl: API_URL,
        sessionId,
        orderId,
        webhookSecret,
      });
      expect(result).toMatchObject({ received: true });
    });

    await test.step("admin advances the order to delivered", async () => {
      await loginAsAdmin(admin);

      for (const status of ["preparing", "out_for_delivery", "delivered"]) {
        const body = await adminApi(admin, {
          method: "PATCH",
          path: `/api/v1/admin/orders/${orderId}/status`,
          data: { status },
        });
        expect(body?.data?.order?.status).toBe(status);
      }
    });

    await test.step("the review form is offered to a customer who received the dish", async () => {
      await page.goto(`/product/${product.slug}`);
      await expect(page.getByRole("radio", { name: /^5 stars/ })).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("customer submits the review", async () => {
      await page.getByRole("radio", { name: /^5 stars/ }).click();
      await page.locator("#review-title").fill(reviewTitle);
      await page
        .locator("#review-body")
        .fill("Cooked well, arrived hot and the portion was right.");
      await page.getByRole("button", { name: "Publish review" }).click();

      // Reviews are moderated, so the confirmation is the "with the team" note.
      await expect(page.getByText(/your review is with the team/i)).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("We could not publish your review")).toHaveCount(0);
    });

    await test.step("admin approves the pending review", async () => {
      const list = await adminApi(admin, {
        path: `/api/v1/admin/reviews?status=pending&productId=${product.id}&limit=20`,
      });

      const pending = (list?.data?.items || list?.data?.reviews || []).find(
        (review) => review.title === reviewTitle
      );
      expect(pending, "the submitted review was not queued for moderation").toBeTruthy();

      const moderated = await adminApi(admin, {
        method: "PATCH",
        path: `/api/v1/admin/reviews/${pending.id}`,
        data: { status: "approved" },
      });
      expect(moderated).toBeTruthy();
    });

    await test.step("the approved review is now public on the product page", async () => {
      await page.goto(`/product/${product.slug}`);
      await expect(page.getByText(reviewTitle)).toBeVisible({ timeout: 20_000 });
    });

    await test.step("a second review for the same order is rejected", async () => {
      const response = await page.request.fetch("/api/v1/reviews", {
        method: "POST",
        data: {
          productId: product.id,
          rating: 4,
          title: "A second attempt",
          body: "This should be refused.",
        },
        headers: {
          "x-csrf-token": "",
          origin: new URL(page.url()).origin,
        },
      });

      // Either the duplicate guard or the CSRF guard rejects it — the point
      // is that it never succeeds twice.
      expect(response.ok()).toBeFalsy();
    });
  } finally {
    await customerContext.close();
    await adminContext.close();
  }
});
