import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin.js";
import { backendEnv } from "./helpers/env.js";
import { placePaidOrder, registerCustomer } from "./helpers/customer.js";

/**
 * The overview dashboard: the KPI grid, the revenue series, the distribution
 * panels and the "live operations" header that sits above the range selector.
 *
 * The customer and the paid order are created through the public API so the
 * assertions run against real data instead of fixtures.
 */

const kpiCard = (page, label) =>
  page.locator("article.statcard").filter({ hasText: label });

test.describe("overview dashboard", () => {
  test("a new paid order shows up across the dashboard", async ({ browser }) => {
    test.setTimeout(150_000);

    const env = backendEnv();
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET must be set in backend/.env");
    }

    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();
    const page = await adminContext.newPage();

    try {
      const customer = await registerCustomer(customerContext);
      const { order } = await placePaidOrder(customerContext, customer, {
        webhookSecret,
        quantity: 2,
      });

      await loginAsAdmin(page);
      await expect(
        page.getByRole("heading", { name: "Kitchen dashboard", level: 1 })
      ).toBeVisible();

      // The KPI grid aggregates the last seven days, so the payment counts.
      await expect(kpiCard(page, "Revenue (7 days)").locator(".statcard-value")).toHaveText(
        /₹[1-9]/,
        { timeout: 20_000 }
      );
      await expect(kpiCard(page, "Orders (7 days)").locator(".statcard-value")).not.toHaveText(
        "0"
      );
      await expect(kpiCard(page, "Avg. order value")).toBeVisible();
      await expect(kpiCard(page, "Customers").locator(".statcard-value")).not.toHaveText("0");

      // The live header reports today and does not lose the numbers.
      const hero = page.locator(".overview-today");
      await expect(hero).toContainText("orders today");
      await expect(hero).not.toContainText("₹0 today");

      // The revenue series renders, and its accessible table exposes the rows.
      await expect(
        page.getByRole("img", { name: "Revenue last 7 days" })
      ).toBeVisible();
      await page.getByRole("button", { name: "View as table" }).click();
      const seriesTable = page.locator(".barchart-table");
      await expect(seriesTable).toBeVisible();
      await expect(seriesTable.getByRole("columnheader", { name: "Date" })).toBeVisible();
      expect(await seriesTable.locator("tbody tr").count()).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Hide table" }).click();
      await expect(seriesTable).toBeHidden();

      // Distribution panels are populated.
      await expect(page.getByRole("img", { name: "Orders grouped by status" })).toBeVisible();
      await expect(page.locator(".overview-product-list")).toContainText("sold");
      await expect(page.locator(".overview-category-list li").first()).toBeVisible();

      // The newest order appears in the recent-orders table and the activity feed.
      const recentOrders = page.getByRole("grid", { name: "Recent orders" });
      await expect(recentOrders).toContainText(order.orderNumber);
      await expect(page.locator(".overview-activity-list")).toContainText(
        `Order ${order.orderNumber}`
      );

      // The revenue CSV exports the visible seven-day window.
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Export CSV" }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(
        /^foodie-revenue-7d-\d{4}-\d{2}-\d{2}\.csv$/
      );
      const csv = await readFile(await download.path(), "utf8");
      const csvLines = csv.trim().split(/\r?\n/);
      expect(csvLines[0]).toContain("Date,Revenue (INR),Orders");
      expect(csvLines).toHaveLength(8);

      // Switching to the 30-day view relabels the range.
      await page.getByRole("tab", { name: "30 Days" }).click();
      await expect(page.getByRole("tab", { name: "30 Days" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      await expect(kpiCard(page, "Revenue (30 days)")).toBeVisible();
      await expect(page.getByRole("img", { name: "Revenue last 30 days" })).toBeVisible();
    } finally {
      await adminContext.close();
      await customerContext.close();
    }
  });

  test("a custom date range scopes the analysis but not the live header", async ({
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

    try {
      const customer = await registerCustomer(customerContext);
      await placePaidOrder(customerContext, customer, { webhookSecret, quantity: 1 });

      await loginAsAdmin(page);
      await expect(
        page.getByRole("heading", { name: "Kitchen dashboard", level: 1 })
      ).toBeVisible();

      // Wait for the dashboard data so the header shows today's real numbers.
      await expect(kpiCard(page, "Revenue (7 days)")).toBeVisible();
      await expect(kpiCard(page, "Revenue (7 days)").locator(".statcard-value")).toHaveText(
        /₹[1-9]/,
        { timeout: 20_000 }
      );

      const hero = page.locator(".overview-today");
      const todayText = ((await hero.textContent()) || "").replace(/\s+/g, " ").trim();
      expect(todayText).not.toContain("₹0 today");

      // A window with no orders empties the range panels.
      await page.locator("#chart-date-from").fill("2020-01-01");
      await page.locator("#chart-date-to").fill("2020-01-01");

      const revenueKpi = kpiCard(page, "Revenue (");
      await expect(revenueKpi).toContainText("1 Jan 2020");
      await expect(revenueKpi.locator(".statcard-value")).toHaveText("₹0");
      await expect(kpiCard(page, "Orders (").locator(".statcard-value")).toHaveText("0");
      await expect(page.locator(".overview-panel-orders")).toContainText("No orders yet.");
      await expect(page.locator(".overview-panel-bestsellers")).toContainText(
        "No paid orders yet."
      );
      await expect(page.locator(".overview-panel-categories")).toContainText(
        "No paid orders yet."
      );

      // The header describes *right now*, so the range must not blank it.
      await expect(hero).toHaveText(todayText);

      // Clearing the range restores the default seven-day window.
      await page.getByRole("button", { name: "Clear" }).click();
      await expect(page.locator("#chart-date-from")).toHaveValue("");
      await expect(kpiCard(page, "Revenue (7 days)")).toBeVisible();
      await expect(page.locator(".overview-panel-orders")).not.toContainText(
        "No orders yet."
      );
    } finally {
      await adminContext.close();
      await customerContext.close();
    }
  });
});
