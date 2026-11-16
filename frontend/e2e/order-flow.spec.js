import { test, expect } from "@playwright/test";
import { backendEnv } from "./helpers/env.js";
import { sendCheckoutCompleted } from "./helpers/webhook.js";

const API_URL = process.env.API_URL || "http://localhost:4000";
const PASSWORD = "Test12345";

test("customer can pay for an order and admin can manage it", async ({ browser }) => {
  test.setTimeout(150_000);

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

  const customerContext = await browser.newContext();
  const page = await customerContext.newPage();
  let adminContext = null;

  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`console: ${message.text()}`);
  });

  let order;
  let sessionId;
  const email = `e2e+customer${Date.now()}@foodie.test`;

  try {
    await test.step("customer registers", async () => {
      await page.goto("/register");
      await page.locator('input[name="name"]').fill("E2E Customer");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(PASSWORD);
      await page.locator('input[name="confirmPassword"]').fill(PASSWORD);
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL((url) => url.pathname === "/");
    });

    await test.step("customer adds a product and opens the cart from the navbar", async () => {
      await page.goto("/menu");
      const addButton = page
        .locator('button[aria-label^="Add "][aria-label$=" to cart"]:not([disabled])')
        .first();
      await expect(addButton).toBeVisible({ timeout: 25_000 });
      await addButton.click();

      const cartLink = page.locator('a[href="/cart"]:visible').first();
      await expect(cartLink).toBeVisible();
      await cartLink.click();
      await expect(page).toHaveURL(/\/cart$/);
      await expect(page.getByRole("button", { name: /Proceed to Checkout/i })).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("customer enters an address and places the order", async () => {
      await page.getByRole("button", { name: /Proceed to Checkout/i }).click();
      await expect(page.getByRole("heading", { name: "Delivery Address" })).toBeVisible();

      const addAddress = page.getByRole("button", { name: /Add New Address/i });
      if (await addAddress.count()) await addAddress.click();

      await page.locator("#recipientName").fill("E2E Customer");
      await page.locator("#phone").fill("9876543210");
      await page.locator("#line1").fill("42 Test Kitchen Road");
      await page.locator("#city").fill("Bengaluru");
      await page.locator("#state").fill("Karnataka");
      await page.locator("#pincode").fill("560001");
      await page.getByRole("button", { name: "Save Address" }).click();

      const continueToPayment = page.getByRole("button", { name: /Continue to Payment/i });
      await expect(continueToPayment).toBeEnabled({ timeout: 20_000 });
      await continueToPayment.click();
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
      const orderBody = await orderResponse.json();
      order = orderBody.data.order;
      expect(order.id).toBeTruthy();
      expect(order.orderNumber).toBeTruthy();

      const payment = await paymentResponse;
      expect(payment.status).toBe(200);
      expect(payment.body?.data?.sessionUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);
      sessionId = payment.body.data.sessionId;
      expect(sessionId).toBeTruthy();
    });

    await test.step("payment webhook confirms the order", async () => {
      const result = await sendCheckoutCompleted({
        apiUrl: API_URL,
        sessionId,
        orderId: order.id,
        webhookSecret,
      });

      expect(result).toMatchObject({ received: true });
    });

    await test.step("customer sees a successful payment", async () => {
      await page.goto(`/verify?session_id=${encodeURIComponent(sessionId)}&order_id=${order.id}`);
      await expect(page.getByText("Payment Successful!")).toBeVisible();
    });

    await test.step("customer sees the confirmed order", async () => {
      await page.goto("/orders");
      const viewDetails = page.getByText("View Details").first();
      await expect(viewDetails).toBeVisible({ timeout: 20_000 });
      await viewDetails.click();
      await page.waitForURL(new RegExp(`/orders/${order.id}$`));
      await expect(page.getByTestId("order-status")).toHaveText(
        /confirmed/i
      );
    });

    await test.step("admin logs in and finds the order", async () => {
      adminContext = await browser.newContext();
      const admin = await adminContext.newPage();

      await admin.goto("/admin/login");
      await admin.locator("#email").fill(adminEmail);
      await admin.locator("#password").fill(adminPassword);
      await admin.getByRole("button", { name: "Sign In" }).click();
      await admin.waitForURL((url) => url.pathname === "/admin");
      await expect(admin.getByText("Admin Sign In")).toHaveCount(0);

      await admin.goto("/admin/orders");
      await admin.locator("#search").fill(order.orderNumber);
      await admin.getByRole("button", { name: /Filter/i }).click();
      await expect(admin.getByText(order.orderNumber).first()).toBeVisible({ timeout: 20_000 });

      await admin.locator(`a[href="/admin/orders/${order.id}"]`).click();
      await admin.waitForURL(new RegExp(`/admin/orders/${order.id}$`));
      await expect(admin.getByRole("heading", { name: new RegExp(order.orderNumber) })).toBeVisible();
    });

    await test.step("admin updates the order status", async () => {
      const admin = adminContext.pages()[0];
      await admin.getByRole("button", { name: "Preparing", exact: true }).click();
      await admin.getByRole("button", { name: /Yes, change status/i }).click();
      await expect(admin.locator(".detail-header")).toContainText(/preparing/i);
    });

    await test.step("customer sees the updated status", async () => {
      await page.reload();
      await expect(page.getByTestId("order-status")).toHaveText(
        /preparing/i
      );
    });

    await test.step("admin opens the board and saves internal order notes", async () => {
      const admin = adminContext.pages()[0];

      await admin.goto("/admin/orders");
      await admin.getByRole("button", { name: "Board", exact: true }).click();
      await expect(admin.locator(".order-board")).toBeVisible();

      const card = admin.locator(".order-card").filter({ hasText: order.orderNumber }).first();
      await expect(card).toBeVisible({ timeout: 20_000 });
      await card
        .getByRole("button", { name: new RegExp(`Open order ${order.orderNumber}`) })
        .click();

      const drawer = admin.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("heading", { name: order.orderNumber })).toBeVisible();

      await drawer.locator("#drawer-admin-notes").fill("E2E internal note");
      await drawer.getByRole("button", { name: /Save notes/i }).click();
      await expect(admin.getByText("Order notes saved").first()).toBeVisible();
      await expect(drawer.getByRole("button", { name: /Print invoice/i })).toBeVisible();

      await admin.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
    });

    await test.step("admin catalog pages load", async () => {
      const admin = adminContext.pages()[0];

      await admin.goto("/admin/products");
      await expect(
        admin.locator("#admin-main").getByRole("heading", { name: "Products" })
      ).toBeVisible();

      await admin.goto("/admin/categories");
      await expect(
        admin.locator("#admin-main").getByRole("heading", { name: "Categories" })
      ).toBeVisible();
    });

    await test.step("admin advanced modules load", async () => {
      const admin = adminContext.pages()[0];

      await expect(admin.locator('.sidebar-nav a[href="/admin/inventory"]')).toBeVisible();
      await expect(admin.locator('.sidebar-nav a[href="/admin/staff"]')).toBeVisible();

      await admin.goto("/admin/inventory");
      await expect(
        admin.locator("#admin-main").getByRole("heading", { name: "Inventory" })
      ).toBeVisible();
      await expect(admin.locator("#admin-main").getByText("Stock in")).toBeVisible();

      const [inventoryDownload] = await Promise.all([
        admin.waitForEvent("download"),
        admin.getByRole("button", { name: "Export CSV" }).click(),
      ]);
      expect(inventoryDownload.suggestedFilename()).toMatch(/^inventory-\d{4}-\d{2}-\d{2}\.csv$/);

      await admin.goto("/admin/staff");
      await expect(
        admin.locator("#admin-main").getByRole("heading", { name: "Staff" })
      ).toBeVisible();

      await admin.goto("/admin/audit-logs");
      await expect(
        admin.locator("#admin-main").getByRole("heading", { name: "Activity Log" })
      ).toBeVisible();

      const bell = admin.getByRole("button", { name: /^Notifications/ });
      await expect(bell).toBeVisible();
      await bell.click();
      await expect(admin.getByRole("menu").getByText("Notifications", { exact: true })).toBeVisible();
      await admin.keyboard.press("Escape");
    });

    await test.step("admin settings tabs render", async () => {
      const admin = adminContext.pages()[0];

      await admin.goto("/admin/settings");
      await expect(
        admin.locator("#admin-main").getByRole("heading", { name: "Settings" })
      ).toBeVisible();

      await admin.getByRole("tab", { name: "Business Hours" }).click();
      await expect(admin.getByText("Orders are accepted only during these hours")).toBeVisible();

      await admin.getByRole("tab", { name: "Payments" }).click();
      await expect(admin.getByRole("heading", { name: "Payment Provider" })).toBeVisible();
      await expect(admin.getByText("Configured").first()).toBeVisible();
    });

    await test.step("no unexpected browser errors", async () => {
      const unexpected = consoleErrors.filter((message) => !message.includes("401"));
      expect(unexpected).toEqual([]);
    });
  } finally {
    await customerContext.close();
    if (adminContext) await adminContext.close();
  }
});
