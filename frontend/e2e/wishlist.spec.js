import { expect, test } from "@playwright/test";
import { csrfHeaders, registerCustomer } from "./helpers/customer.js";

test.describe("wishlist", () => {
  test("guests are sent to login when they save a dish", async ({ page }) => {
    await page.goto("/menu");
    const heart = page.locator('button[aria-label*="wishlist"]').first();
    await heart.waitFor({ timeout: 30_000 });
    await heart.click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });

  test("a saved dish survives a reload and shows in the account wishlist", async ({
    page,
    context,
  }) => {
    await registerCustomer(context);
    await page.goto("/menu");

    const card = page.locator("article").filter({ hasText: "Ripple Ice Cream" }).first();
    await card.scrollIntoViewIfNeeded();
    const name = (await card.locator("h2, h3").first().innerText()).trim();
    const price = (await card.locator('[class*="prices"] > span').first().innerText()).trim();
    const heart = card.locator('button[aria-label*="wishlist"]');
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });

    await page.reload();
    const reloadedHeart = page
      .locator("article")
      .filter({ hasText: name })
      .first()
      .locator('button[aria-label*="wishlist"]');
    await expect(reloadedHeart).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });

    await page.goto("/account");
    await page.getByRole("button", { name: /Wishlist/i }).first().click();

    const saved = page.locator(".wishlist-item").first();
    await expect(saved).toContainText(name, { timeout: 15_000 });
    await expect(saved.locator(".wishlist-price")).toHaveText(price);
    await expect(saved.locator(".wishlist-name")).toHaveAttribute(
      "href",
      /^\/product\/[a-z0-9-]+$/
    );
    await expect(page.locator("main.account-main")).not.toContainText("undefined");
  });

  test("the wishlist API returns card-shaped dishes", async ({ context }) => {
    await registerCustomer(context);
    const product = (
      await (await context.request.get("http://localhost:4000/api/v1/products?limit=1")).json()
    ).data.items[0];

    const save = await context.request.post(
      `http://localhost:4000/api/v1/users/me/wishlist/${product.id}`,
      { headers: await csrfHeaders(context) }
    );
    expect(save.ok()).toBeTruthy();

    const response = await context.request.get(
      "http://localhost:4000/api/v1/users/me/wishlist"
    );
    expect(response.ok()).toBeTruthy();
    const item = (await response.json()).data.items[0];

    expect(item).toMatchObject({
      id: product.id,
      name: product.name,
      slug: product.slug,
      pricePaise: product.pricePaise,
    });
    expect(item.pricePaise).toBeGreaterThan(0);
  });
});
