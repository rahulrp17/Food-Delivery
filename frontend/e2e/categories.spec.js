import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin.js";

test("admin can create, edit, reorder, and delete categories", async ({ browser }) => {
  test.setTimeout(90_000);

  const stamp = Date.now().toString().slice(-8);
  const categoryNameA = `E2E Category A ${stamp}`;
  const categorySlugA = `e2e-category-a-${stamp}`;
  const categoryNameB = `E2E Category B ${stamp}`;
  const categorySlugB = `e2e-category-b-${stamp}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);
    await page.goto("/admin/categories");
    await expect(page.locator("#admin-main").getByRole("heading", { name: "Categories" })).toBeVisible();

    // Create category A.
    await page.getByRole("button", { name: "New Category" }).click();
    await page.locator("#cat-name").fill(categoryNameA);
    await page.locator("#cat-slug").fill(categorySlugA);
    await page.locator("#cat-desc").fill("First E2E category.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Category created").first()).toBeVisible();

    // Create category B.
    await page.getByRole("button", { name: "New Category" }).click();
    await page.locator("#cat-name").fill(categoryNameB);
    await page.locator("#cat-slug").fill(categorySlugB);
    await page.locator("#cat-desc").fill("Second E2E category.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Category created").first()).toBeVisible();

    await expect(page.getByText(categoryNameA)).toBeVisible();
    await expect(page.getByText(categoryNameB)).toBeVisible();

    // Reorder A down, then back up.
    await page.getByRole("button", { name: `Move ${categoryNameA} down` }).click();
    await expect(page.getByText("Category reordered").first()).toBeVisible();
    await page.getByRole("button", { name: `Move ${categoryNameA} up` }).click();
    await expect(page.getByText("Category reordered").first()).toBeVisible();

    // Edit category A.
    await page.getByRole("button", { name: `Edit ${categoryNameA}` }).click();
    await page.locator("#cat-name").fill(`${categoryNameA} Updated`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Category updated").first()).toBeVisible();

    const updatedNameA = `${categoryNameA} Updated`;
    await expect(page.getByText(updatedNameA)).toBeVisible();

    // Delete category B.
    await page.getByRole("button", { name: `Delete ${categoryNameB}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Category deleted").first()).toBeVisible();

    // Delete category A.
    await page.getByRole("button", { name: `Delete ${updatedNameA}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Category deleted").first()).toBeVisible();

    await expect(page.getByText(categoryNameA)).toHaveCount(0);
    await expect(page.getByText(categoryNameB)).toHaveCount(0);
    await expect(page.getByText(updatedNameA)).toHaveCount(0);
  } finally {
    await context.close();
  }
});
