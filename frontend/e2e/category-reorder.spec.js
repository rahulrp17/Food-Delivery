import { test, expect } from "@playwright/test";
import { adminApi, loginAsAdmin } from "./helpers/admin.js";

const STALE_PREFIX = "E2E Reorder ";

const createCategory = async (page, { name, slug, sortOrder = 999 }) => {
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "New Category" }).click();
  await page.locator("#cat-name").fill(name);
  await page.locator("#cat-slug").fill(slug);
  await page.locator("#cat-sort").fill(String(sortOrder));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Category created").first()).toBeVisible();
};

const deleteCategory = async (page, name) => {
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Category deleted").first()).toBeVisible();
};

// Removes the categories a previously failed run may have left behind.
const removeStaleCategories = async (page) => {
  const stale = await adminApi(page, { path: "/api/v1/admin/categories" });

  for (const category of stale.data.categories) {
    if (category.name.startsWith(STALE_PREFIX)) {
      await adminApi(page, {
        method: "DELETE",
        path: `/api/v1/admin/categories/${category.id}`,
      });
    }
  }
};

const persistedOrder = async (page) => {
  const body = await adminApi(page, { path: "/api/v1/admin/categories" });
  return body.data.categories.map((category) => category.name);
};

/**
 * Categories can be reordered by dragging the handle on a card onto another
 * card. The drag has to survive the round trip to the API, so the test reads
 * the persisted order back instead of trusting the DOM.
 */
test("admin can reorder categories by dragging a card", async ({ browser }) => {
  test.setTimeout(120_000);

  const stamp = Date.now().toString().slice(-8);
  const names = [
    `${STALE_PREFIX}Drag A ${stamp}`,
    `${STALE_PREFIX}Drag B ${stamp}`,
    `${STALE_PREFIX}Drag C ${stamp}`,
  ];

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);
    await removeStaleCategories(page);

    // Three categories, parked at the end of the menu so the seeded categories
    // keep their order.
    for (const [index, name] of names.entries()) {
      await createCategory(page, { name, slug: `e2e-reorder-drag-${index}-${stamp}` });
    }

    await page.goto("/admin/categories");
    await expect(page.locator(".category-card").first()).toBeVisible();

    const titles = await page.locator(".category-card-title").allTextContents();
    const positions = names
      .map((name) => ({ name, index: titles.indexOf(name) }))
      .filter((entry) => entry.index !== -1)
      .sort((a, b) => a.index - b.index);

    expect(positions).toHaveLength(names.length);

    const source = positions[positions.length - 1];
    const target = positions[0];

    const sourceHandle = page.getByRole("button", { name: `Reorder ${source.name}` });
    const targetCard = page.locator(".category-card").filter({ hasText: target.name });

    // Both cards have to be on screen for the pointer drag to work.
    await targetCard.scrollIntoViewIfNeeded();
    await sourceHandle.scrollIntoViewIfNeeded();

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetCard.boundingBox();
    const viewport = page.viewportSize();

    expect(sourceBox.y).toBeLessThan(viewport.height);
    expect(targetBox.y).toBeLessThan(viewport.height);

    // Drop the last card onto the first one. The top-left corner of the target
    // card means "insert before it". The drag is driven with explicit mouse
    // moves because Chromium only starts a native drag after the pointer moves
    // while the button is held down.
    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2 + 8,
      sourceBox.y + sourceBox.height / 2 + 4,
      { steps: 4 }
    );
    await page.mouse.move(targetBox.x + 12, targetBox.y + 12, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByText("Categories reordered").first()).toBeVisible();

    // The persisted order must match what the UI shows.
    const persisted = await persistedOrder(page);
    expect(persisted.indexOf(source.name)).toBeLessThan(persisted.indexOf(target.name));

    const uiTitles = await page.locator(".category-card-title").allTextContents();
    expect(uiTitles.indexOf(source.name)).toBeLessThan(uiTitles.indexOf(target.name));

    // Clean up the categories created by the test.
    for (const name of names) {
      await deleteCategory(page, name);
    }
  } finally {
    await context.close();
  }
});

/**
 * Dragging needs a pointer. The handle is also a control: focusing it and
 * pressing the arrow keys moves the category one step at a time.
 */
test("admin can reorder categories with the keyboard", async ({ browser }) => {
  test.setTimeout(120_000);

  const stamp = Date.now().toString().slice(-8);
  const nameA = `${STALE_PREFIX}Key A ${stamp}`;
  const nameB = `${STALE_PREFIX}Key B ${stamp}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);
    await removeStaleCategories(page);

    await createCategory(page, { name: nameA, slug: `e2e-reorder-key-a-${stamp}` });
    await createCategory(page, { name: nameB, slug: `e2e-reorder-key-b-${stamp}` });

    await page.goto("/admin/categories");
    await expect(page.locator(".category-card").first()).toBeVisible();

    const before = await persistedOrder(page);
    expect(before.indexOf(nameA)).toBeLessThan(before.indexOf(nameB));

    await page.getByRole("button", { name: `Reorder ${nameB}` }).focus();
    await page.keyboard.press("ArrowUp");

    await expect(page.getByText("Categories reordered").first()).toBeVisible();

    const after = await persistedOrder(page);
    expect(after.indexOf(nameB)).toBeLessThan(after.indexOf(nameA));

    const uiTitles = await page.locator(".category-card-title").allTextContents();
    expect(uiTitles.indexOf(nameB)).toBeLessThan(uiTitles.indexOf(nameA));

    // Clean up the categories created by the test.
    await deleteCategory(page, nameA);
    await deleteCategory(page, nameB);
  } finally {
    await context.close();
  }
});
