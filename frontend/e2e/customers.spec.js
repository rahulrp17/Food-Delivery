import { test, expect } from "@playwright/test";
import { adminApi, loginAsAdmin } from "./helpers/admin.js";
import { backendEnv } from "./helpers/env.js";
import { csrfHeaders, placePaidOrder, registerCustomer } from "./helpers/customer.js";

/**
 * The customers directory (list, filters, detail page and CSV export) plus the
 * account controls that hang off the detail page: suspension, reactivation and
 * role changes.
 *
 * Every customer the tests need is created through the public API so the
 * assertions run against real data instead of fixtures.
 */

const openDirectory = async (page) => {
  await page.goto("/admin/customers");
  await expect(
    page.locator("#admin-main").getByRole("heading", { name: "Customers" })
  ).toBeVisible();
};

const customerRow = (page, customer) =>
  page.locator("tr.datatable-row").filter({ hasText: customer.email });

const detailCard = (page, heading) =>
  page.locator("section.detail-card").filter({ hasText: heading });

test.describe("customers directory", () => {
  test("admin can find a customer, read their activity and export the list", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const env = backendEnv();
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET must be set in backend/.env");
    }

    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();
    const page = await adminContext.newPage();

    let customer = null;

    try {
      customer = await registerCustomer(customerContext);
      const { order, product } = await placePaidOrder(customerContext, customer, {
        webhookSecret,
      });

      await loginAsAdmin(page);
      await openDirectory(page);

      // The directory lists the customer and the numbers behind the account.
      const row = customerRow(page, customer);
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row.locator('td[data-label="Orders"]')).toHaveText("1");
      await expect(row.locator('td[data-label="Status"]')).toContainText("Active");
      await expect(row.locator('td[data-label="Spent"]')).not.toHaveText("₹0");

      // The cards view shows the same account.
      await page.getByRole("button", { name: "Cards" }).click();
      await expect(
        page.locator(".cust-dir-card").filter({ hasText: customer.email })
      ).toBeVisible();
      await page.getByRole("button", { name: "Table" }).click();
      await expect(customerRow(page, customer)).toBeVisible();

      // The detail page reports the activity, the order and the favourite dish.
      await page.getByRole("link", { name: `View ${customer.name}` }).click();
      await page.waitForURL(/\/admin\/customers\/[^/]+$/);
      await expect(page.getByRole("heading", { name: customer.name, level: 1 })).toBeVisible();

      const activity = detailCard(page, "Activity");
      await expect(activity).toContainText("Total orders:");
      await expect(activity).toContainText("1");

      await expect(detailCard(page, "Order history")).toContainText(order.orderNumber);
      await expect(detailCard(page, "Favourite products")).toContainText(product.name);

      // The saved delivery addresses come from the customer's own address book.
      const addresses = detailCard(page, "Saved addresses");
      await expect(addresses).toContainText("42 Test Kitchen Road");
      await expect(addresses).toContainText("560001");

      // The export contains the account that was just searched for.
      await page.goto("/admin/customers");
      await page.getByRole("searchbox", { name: "Search customers" }).fill(customer.email);
      await expect(page.locator("tr.datatable-row")).toHaveCount(1);
      await expect(customerRow(page, customer)).toBeVisible();

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export CSV" }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/^customers-\d{4}-\d{2}-\d{2}\.csv$/);

      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const csv = Buffer.concat(chunks).toString("utf8");

      expect(csv).toContain(customer.email);
      expect(csv).toContain(customer.name);
    } finally {
      await customerContext.close();
      await adminContext.close();
    }
  });

  test("admin can suspend and reactivate a customer account", async ({ browser }) => {
    test.setTimeout(120_000);

    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();
    const page = await adminContext.newPage();

    try {
      const customer = await registerCustomer(customerContext);

      await loginAsAdmin(page);
      await page.goto(`/admin/customers/${customer.id}`);
      await expect(page.getByRole("heading", { name: customer.name, level: 1 })).toBeVisible();

      // Suspend.
      await page.getByRole("button", { name: "Suspend account" }).click();
      await page.getByRole("button", { name: "Suspend", exact: true }).click();
      await expect(page.getByText("Customer account suspended").first()).toBeVisible();
      await expect(page.locator(".detail-header-badges")).toContainText("Suspended");

      // A suspended account cannot sign in any more.
      const loginResponse = await customerContext.request.post(
        "http://localhost:4000/api/v1/auth/login",
        {
          headers: await csrfHeaders(customerContext),
          data: { email: customer.email, password: customer.password },
        }
      );
      expect(loginResponse.status()).toBe(403);

      // The directory can single out suspended accounts.
      await openDirectory(page);
      await page.getByRole("searchbox", { name: "Search customers" }).fill(customer.email);
      await page.getByLabel("Status").selectOption("active");
      await expect(customerRow(page, customer)).toHaveCount(0);
      await page.getByLabel("Status").selectOption("suspended");
      await expect(customerRow(page, customer)).toBeVisible({ timeout: 20_000 });

      // Reactivate.
      await page.goto(`/admin/customers/${customer.id}`);
      await page.getByRole("button", { name: "Reactivate account" }).click();
      await page.getByRole("button", { name: "Reactivate", exact: true }).click();
      await expect(page.getByText("Customer account reactivated").first()).toBeVisible();
      await expect(page.locator(".detail-header-badges")).toContainText("Active");

      const loginAgain = await customerContext.request.post(
        "http://localhost:4000/api/v1/auth/login",
        {
          headers: await csrfHeaders(customerContext),
          data: { email: customer.email, password: customer.password },
        }
      );
      expect(loginAgain.status()).toBe(200);
    } finally {
      await customerContext.close();
      await adminContext.close();
    }
  });

  test("admin can change a customer role, and the account guards hold", async ({ browser }) => {
    test.setTimeout(120_000);

    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();
    const page = await adminContext.newPage();

    try {
      const customer = await registerCustomer(customerContext);

      await loginAsAdmin(page);
      await page.goto(`/admin/customers/${customer.id}`);
      await expect(page.getByRole("heading", { name: customer.name, level: 1 })).toBeVisible();

      // Promote to administrator.
      await page.getByRole("radio", { name: "Administrator" }).check();
      await page.getByRole("button", { name: "Confirm", exact: true }).click();
      await expect(page.getByText("Role changed to admin").first()).toBeVisible();
      await expect(page.locator(".detail-header-badges")).toContainText("Admin");

      // The role filter only lists administrators now.
      await openDirectory(page);
      await page.getByLabel("Role").selectOption("admin");
      await expect(
        page.locator("tr.datatable-row").filter({ hasText: customer.email })
      ).toBeVisible({ timeout: 20_000 });

      // Demote back to a customer.
      await page.goto(`/admin/customers/${customer.id}`);
      await page.getByRole("radio", { name: "Customer" }).check();
      await page.getByRole("button", { name: "Confirm", exact: true }).click();
      await expect(page.getByText("Role changed to user").first()).toBeVisible();

      const restored = await adminApi(page, {
        path: `/api/v1/admin/customers/${customer.id}`,
      });
      expect(restored.data.customer.role).toBe("user");

      // An admin cannot suspend or demote their own account.
      const me = await adminApi(page, { path: "/api/v1/auth/me" });
      const ownId = me.data.user.id;
      const headers = await csrfHeaders(adminContext);

      const suspend = await adminContext.request.patch(
        `http://localhost:4000/api/v1/admin/customers/${ownId}/status`,
        { headers, data: { status: "suspended" } }
      );
      expect(suspend.status()).toBe(403);

      const demote = await adminContext.request.patch(
        `http://localhost:4000/api/v1/admin/customers/${ownId}/role`,
        { headers, data: { role: "user" } }
      );
      expect(demote.status()).toBe(403);
    } finally {
      await customerContext.close();
      await adminContext.close();
    }
  });
});
