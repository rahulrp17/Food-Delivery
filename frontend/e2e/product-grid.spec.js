import { test, expect } from "@playwright/test";

/**
 * The food-card grid uses a fixed column plan instead of fluid auto-fit, so a
 * regression is instantly visible to shoppers. These checks read the resolved
 * grid template rather than trusting a screenshot, and also guard the classic
 * failure modes: horizontal overflow, cards that collapse narrower than their
 * content, and touch targets that shrink on phones.
 *
 * Plan:
 *   < 360px   1 column
 *   360-767   2 columns
 *   768-1023  3 columns
 *   1024-1439 4 columns
 *   >= 1440   5 columns
 *
 * Product rails never go past four columns, because a four-dish rail would
 * leave a hole in a five-up row.
 */

const ADD_BUTTON = 'button[aria-label^="Add "][aria-label$=" to cart"]';
const WISHLIST_BUTTON = 'button[aria-label^="Save "]';

/**
 * Columns of the card grid. The search starts from the wishlist heart because
 * the home page also renders a list-variant rail whose rows are grids of their
 * own, and the first cart button on the page can belong to that list.
 */
async function gridColumnCount(page) {
  const heart = page.locator(WISHLIST_BUTTON).first();
  await expect(heart).toBeVisible({ timeout: 30_000 });
  return heart.evaluate((element) => {
    const card = element.closest("article");
    if (!card) return 0;
    let node = card.parentElement;
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
  { label: "narrow phone", width: 320, height: 844, columns: 1 },
  { label: "small phone", width: 360, height: 844, columns: 2 },
  { label: "mobile", width: 390, height: 844, columns: 2 },
  { label: "large phone", width: 430, height: 844, columns: 2 },
  { label: "phablet", width: 600, height: 900, columns: 2 },
  { label: "tablet", width: 768, height: 1024, columns: 3 },
  { label: "laptop", width: 1024, height: 768, columns: 4 },
  { label: "laptop wide", width: 1280, height: 900, columns: 4 },
  { label: "desktop", width: 1440, height: 900, columns: 5 },
  { label: "wide", width: 1920, height: 1080, columns: 5 },
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
      // Even the 2-up 360px phone leaves ~150px per card; anything less
      // means padding or gaps are eating the layout.
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

test("home rails use 2 / 3 / 4 columns and never five", async ({ browser }) => {
  for (const { width, columns } of [
    { width: 390, columns: 2 },
    { width: 768, columns: 3 },
    { width: 1280, columns: 4 },
    { width: 1600, columns: 4 },
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    try {
      await page.goto("/");
      expect(await gridColumnCount(page)).toBe(columns);
    } finally {
      await context.close();
    }
  }
});

test("the add control keeps a 44px touch target in the 2-up phone grid", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await page.goto("/menu");
    const button = page.locator(ADD_BUTTON).first();
    const box = await button.boundingBox();

    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(43.5);
  } finally {
    await context.close();
  }
});

test("the wishlist heart keeps a 44px touch target on a touch phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    await page.goto("/menu");
    const heart = page.locator(WISHLIST_BUTTON).first();
    await expect(heart).toBeVisible({ timeout: 30_000 });

    const box = await heart.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(43.5);
    expect(box.height).toBeGreaterThanOrEqual(43.5);
  } finally {
    await context.close();
  }
});

test("a signed-out shopper is sent to sign-in from the wishlist heart", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto("/menu");

    const heart = page.locator(WISHLIST_BUTTON).first();
    await expect(heart).toBeVisible();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(heart).toHaveAttribute("type", "button");

    await heart.click();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await context.close();
  }
});
