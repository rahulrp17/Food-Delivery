import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin.js";

/**
 * The archive workflow: deleting a product soft-deletes it, it disappears from
 * the live catalog, it shows up in the archived view and it can be restored
 * back into the live catalog.
 */
test("admin can archive a product and restore it", async ({ browser }) => {
  test.setTimeout(90_000);

  const stamp = Date.now().toString().slice(-8);
  const productName = `E2E Archive ${stamp}`;
  const categoryName = `E2E Archive Category ${stamp}`;
  const categorySlug = `e2e-archive-category-${stamp}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);

    // A product needs a category.
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "New Category" }).click();
    await page.locator("#cat-name").fill(categoryName);
    await page.locator("#cat-slug").fill(categorySlug);
    await page.locator("#cat-desc").fill("Category for the archive workflow test.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Category created").first()).toBeVisible();

    // Create the product that will be archived.
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "New Product" }).click();
    await page.locator("#name").fill(productName);
    await page.locator("#slug").fill(`e2e-archive-${stamp}`);
    await page.locator("#categoryId").selectOption({ label: categoryName });
    await page.locator("#price").fill("179.00");
    await page.locator("#stock").fill("12");
    await page.locator("#description").fill("E2E product for the archive workflow test.");
    await page.getByRole("button", { name: "Save Product" }).first().click();
    await expect(page.getByText("Product created").first()).toBeVisible();

    // Archive it.
    await page.goto("/admin/products");
    await page.locator('input[aria-label="Search products"]').fill(productName);
    await expect(page.getByText(productName)).toBeVisible();

    await page.getByRole("button", { name: `Delete ${productName}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Product deleted").first()).toBeVisible();

    // It is gone from the live catalog.
    await page.locator('input[aria-label="Search products"]').fill(productName);
    await expect(page.getByText(productName)).toHaveCount(0);

    // It is listed as archived.
    await page.locator("#products-catalog-view").selectOption("archived");
    await page.locator('input[aria-label="Search products"]').fill(productName);
    await expect(page.getByText(productName)).toBeVisible();
    await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();

    // Restore it.
    await page.getByRole("button", { name: `Restore ${productName}` }).click();
    await expect(page.getByText("Product restored to the catalog").first()).toBeVisible();

    // It is back in the live catalog and gone from the archived view.
    await page.locator("#products-catalog-view").selectOption("");
    await page.locator('input[aria-label="Search products"]').fill(productName);
    await expect(page.getByText(productName)).toBeVisible();

    await page.locator("#products-catalog-view").selectOption("archived");
    await page.locator('input[aria-label="Search products"]').fill(productName);
    await expect(page.getByText(productName)).toHaveCount(0);

    // Clean up the product created by the test.
    await page.locator("#products-catalog-view").selectOption("");
    await page.locator('input[aria-label="Search products"]').fill(productName);
    await page.getByRole("button", { name: `Delete ${productName}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Product deleted").first()).toBeVisible();

    // Clean up the category created by the test.
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: `Delete ${categoryName}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Category deleted").first()).toBeVisible();
  } finally {
    await context.close();
  }
});
