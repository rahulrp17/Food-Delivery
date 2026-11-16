import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin.js";

test("admin can create, edit, delete, and bulk-update products", async ({ browser }) => {
  test.setTimeout(90_000);

  const stamp = Date.now().toString().slice(-8);
  const productNameA = `E2E Product A ${stamp}`;
  const productNameB = `E2E Product B ${stamp}`;
  const categoryName = `E2E Category ${stamp}`;
  const categorySlug = `e2e-category-${stamp}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);

    // Ensure a category exists (product form requires one).
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "New Category" }).click();
    await page.locator("#cat-name").fill(categoryName);
    await page.locator("#cat-slug").fill(categorySlug);
    await page.locator("#cat-desc").fill("Category for E2E product tests.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Category created").first()).toBeVisible();

    await page.goto("/admin/products");
    await expect(page.locator("#admin-main").getByRole("heading", { name: "Products" })).toBeVisible();

    // Create product A.
    await page.getByRole("button", { name: "New Product" }).click();
    await page.locator("#name").fill(productNameA);
    await page.locator("#slug").fill(`e2e-product-a-${stamp}`);
    await page.locator("#categoryId").selectOption({ label: categoryName });
    await page.locator("#price").fill("129.00");
    await page.locator("#stock").fill("20");
    await page.locator("#description").fill("E2E product A description.");
    await page.getByRole("button", { name: "Save Product" }).first().click();
    await expect(page.getByText("Product created").first()).toBeVisible();
    await expect(page.getByText(productNameA)).toBeVisible();

    // Edit product A.
    await page.getByRole("button", { name: `Edit ${productNameA}` }).click();
    await page.locator("#price").fill("149.00");
    await page.getByRole("button", { name: "Save Product" }).first().click();
    await expect(page.getByText("Product updated").first()).toBeVisible();

    // Create product B (needed for bulk action).
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "New Product" }).click();
    await page.locator("#name").fill(productNameB);
    await page.locator("#slug").fill(`e2e-product-b-${stamp}`);
    await page.locator("#categoryId").selectOption({ label: categoryName });
    await page.locator("#price").fill("99.00");
    await page.locator("#stock").fill("5");
    await page.locator("#description").fill("E2E product B description.");
    await page.getByRole("button", { name: "Save Product" }).first().click();
    await expect(page.getByText("Product created").first()).toBeVisible();

    // Bulk update stock on product B.
    await page.goto("/admin/products");
    await page.locator(`input[aria-label="Select ${productNameB}"]`).check();
    await page.getByRole("button", { name: "Bulk actions" }).click();
    await page.locator("#bulk-stock").fill("99");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Bulk update applied")).toBeVisible();

    // Delete product B.
    await page.getByRole("button", { name: `Delete ${productNameB}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Product deleted").first()).toBeVisible();

    // Delete product A.
    await page.getByRole("button", { name: `Delete ${productNameA}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Product deleted").first()).toBeVisible();

    await expect(page.getByText(productNameA)).toHaveCount(0);
    await expect(page.getByText(productNameB)).toHaveCount(0);
  } finally {
    await context.close();
  }
});
