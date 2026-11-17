import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { adminApi, adminAttempt, loginAsAdmin } from "./helpers/admin.js";

/**
 * The inventory page is a read model on top of the stock endpoints: a manual
 * correction must be written to the ledger, filterable, summarised and
 * exportable. This spec changes stock through the admin API, then checks the
 * page that the staff actually read.
 */

const stamp = Date.now().toString().slice(-8);
const productName = `E2E Inventory Item ${stamp}`;

test("admin can trace a stock correction through the inventory ledger", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const context = await browser.newContext();
  const page = await context.newPage();
  let productId;

  try {
    await loginAsAdmin(page);

    const categories = await adminApi(page, { path: "/api/v1/admin/categories" });
    const categoryId = categories.data.categories[0]?.id;
    expect(categoryId).toBeTruthy();

    const created = await adminApi(page, {
      method: "POST",
      path: "/api/v1/admin/products",
      data: {
        name: productName,
        slug: `e2e-inventory-${stamp}`,
        description: "Product created to exercise the inventory ledger.",
        categoryId,
        pricePaise: 19900,
        stock: 10,
      },
    });
    productId = created.data.product.id;

    // +5 restock, then a -3 correction (a correction down is an adjustment).
    const restock = await adminApi(page, {
      method: "PATCH",
      path: `/api/v1/admin/products/${productId}/stock`,
      data: { delta: 5 },
    });
    expect(restock.data.product.stock).toBe(15);

    const correct = await adminApi(page, {
      method: "PATCH",
      path: `/api/v1/admin/products/${productId}/stock`,
      data: { stock: 12 },
    });
    expect(correct.data.product.stock).toBe(12);

    // Setting the same stock is not a movement and writes no entry.
    await adminApi(page, {
      method: "PATCH",
      path: `/api/v1/admin/products/${productId}/stock`,
      data: { stock: 12 },
    });

    // Stock cannot go below zero, and the body must name exactly one of the fields.
    const tooLow = await adminAttempt(page, {
      method: "PATCH",
      path: `/api/v1/admin/products/${productId}/stock`,
      data: { stock: -5 },
    });
    expect(tooLow.status()).toBe(400);
    expect((await tooLow.json()).error.code).toBe("VALIDATION_ERROR");

    const belowZero = await adminAttempt(page, {
      method: "PATCH",
      path: `/api/v1/admin/products/${productId}/stock`,
      data: { delta: -50 },
    });
    expect(belowZero.status()).toBe(409);
    expect((await belowZero.json()).error.code).toBe("OUT_OF_STOCK");

    const bothFields = await adminAttempt(page, {
      method: "PATCH",
      path: `/api/v1/admin/products/${productId}/stock`,
      data: { stock: 12, delta: 1 },
    });
    expect(bothFields.status()).toBe(400);

    // The ledger lists both movements for the product, scoped by search.
    await page.goto("/admin/inventory");
    await expect(
      page.locator("#admin-main").getByRole("heading", { name: "Inventory" })
    ).toBeVisible();

    await page.getByLabel("Search products").fill(productName);

    const entries = page.locator(".movement-entry");
    await expect(entries).toHaveCount(2);
    await expect(entries.filter({ hasText: "Restock" })).toContainText("+5");
    await expect(entries.filter({ hasText: "Adjustment" })).toContainText("-3");
    await expect(entries.first()).toContainText(productName);

    // The summary adds up the filtered movements.
    const summary = page.locator(".inventory-summary-card");
    await expect(summary.filter({ hasText: "Stock in" })).toContainText("+5");
    await expect(summary.filter({ hasText: "Stock out" })).toContainText("-3");
    await expect(summary.filter({ hasText: "Net change" })).toContainText("+2");
    await expect(summary.filter({ hasText: "Movements" })).toContainText("2");

    // The reason filter narrows the same ledger further.
    const reasonFilter = page.getByLabel("Reason");
    await reasonFilter.selectOption("adjust");
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText("-3");
    await expect(entries.first()).toContainText("Adjustment");

    await reasonFilter.selectOption("restock");
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText("+5");
    await expect(entries.first()).toContainText("Restock");

    await reasonFilter.selectOption("cancel");
    await expect(page.getByText("No stock movements yet")).toBeVisible();

    await reasonFilter.selectOption("");

    // The export mirrors the filter and the ledger.
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^inventory-${new Date().toISOString().slice(0, 10)}(\\.csv)?$`)
    );

    const csv = await readFile(await download.path(), "utf8");
    expect(csv).toContain('"Date","Product","Change","Reason","Order ID","Actor"');
    expect(csv).toContain(`"${productName}"`);
    expect(csv).toContain('"restock"');
    expect(csv).toContain('"adjust"');

    await expect(page.getByText("Inventory report exported").first()).toBeVisible();
  } finally {
    if (productId) {
      await adminApi(page, {
        method: "DELETE",
        path: `/api/v1/admin/products/${productId}`,
      }).catch(() => {});
    }
    await context.close();
  }
});
