import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin.js";

test("admin can create and delete a coupon, and navigate on mobile", async ({ browser }) => {
  test.setTimeout(90_000);

  const desktopContext = await browser.newContext();
  const page = await desktopContext.newPage();
  const code = `E2E${Date.now().toString().slice(-8)}`;

  try {
    await loginAsAdmin(page);
    await page.goto("/admin/coupons");
    await expect(page.locator("#admin-main").getByRole("heading", { name: "Coupons" })).toBeVisible();

    await page.getByRole("button", { name: "New Coupon" }).click();
    await page.locator("#coupon-code").fill(code);
    await page.locator("#coupon-value").fill("10");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Coupon created").first()).toBeVisible();
    await expect(page.getByRole("button", { name: `View redemptions for ${code}` })).toBeVisible();

    await page.getByRole("button", { name: `View redemptions for ${code}` }).click();
    await expect(
      page.getByRole("heading", { name: new RegExp(`Redemptions.*${code}`) })
    ).toBeVisible();
    await expect(page.getByText("No orders have used this coupon yet.")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^coupon-${code.toLowerCase()}-\\d{4}-\\d{2}-\\d{2}\\.csv$`)
    );

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: `Delete coupon ${code}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Coupon deleted").first()).toBeVisible();
    await expect(page.getByText(code)).toHaveCount(0);
  } finally {
    await desktopContext.close();
  }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();

  try {
    await loginAsAdmin(mobile);
    const openMenu = mobile.getByRole("button", { name: "Open navigation menu" });
    await expect(openMenu).toBeVisible();
    await openMenu.click();

    const couponsLink = mobile.getByRole("link", { name: "Coupons" });
    await expect(couponsLink).toBeVisible();
    await mobile.waitForTimeout(400);
    await Promise.all([
      mobile.waitForURL(/\/admin\/coupons$/),
      couponsLink.click(),
    ]);
    await expect(mobile.locator("#admin-main").getByRole("heading", { name: "Coupons" })).toBeVisible();
    await expect(mobile.getByRole("button", { name: "Close navigation menu" })).toHaveCount(0);
  } finally {
    await mobileContext.close();
  }
});
