import { test, expect } from "@playwright/test";

/**
 * The food-card grid is fixed at 2 / 4 / 5 columns (mobile / tablet / desktop)
 * instead of fluid auto-fit, so a regression is instantly visible to shoppers.
 * These checks read the resolved grid template rather than trusting a
 * screenshot, and also guard the classic 2-up failure modes: horizontal
 * overflow and cards that collapse narrower than their content.
 */

const ADD_BUTTON = 'button[aria-label^="Add "][aria-label$=" to cart"]';

async function gridColumnCount(page) {
  const button = page.locator(ADD_BUTTON).first();
  await expect(button).toBeVisible({ timeout: 30_000 });
  return button.evaluate((element) => {
    let node = element;
    while (node && getComputedStyle(node).display !== "grid") {
      node = node.parentElement;
    }
    if (!node) return 0;
    return getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length;
  });
}

async function firstCardBox(page) {
  const button = page.locator(ADD_BUTTON).first();
  return button.evaluate((element) => {
    let node = element;
    while (node && node.tagName !== "ARTICLE") node = node.parentElement;
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
}

const viewports = [
  { label: "mobile", width: 390, height: 844, columns: 2 },
  { label: "large phone", width: 430, height: 844, columns: 2 },
  { label: "tablet", width: 768, height: 1024, columns: 4 },
  { label: "laptop", width: 1280, height: 900, columns: 5 },
  { label: "wide", width: 1600, height: 900, columns: 5 },
];

for (const viewport of viewports) {
  test(`menu grid renders ${viewport.columns} food cards at ${viewport.label} width`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();

    try {
      await page.goto("/menu");

      expect(await gridColumnCount(page)).toBe(viewport.columns);

      const card = await firstCardBox(page);
      expect(card).not.toBeNull();
      // Two-up on a 390px phone leaves ~150px per card; anything less means
      // padding or gaps are eating the layout.
      expect(card.width).toBeGreaterThan(140);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    } finally {
      await context.close();
    }
  });
}

test("home rails follow the same 2 / 4 / 5 rhythm", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto("/");
    expect(await gridColumnCount(page)).toBe(5);
  } finally {
    await context.close();
  }
});
