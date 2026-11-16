import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin.js";

test("admin can save store information settings", async ({ browser }) => {
  test.setTimeout(90_000);

  const stamp = Date.now().toString().slice(-8);
  const storeName = `E2E Store ${stamp}`;
  const supportEmail = `e2e-${stamp}@foodie.local`;

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);
    await page.goto("/admin/settings");
    await expect(page.locator("#admin-main").getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("tab", { name: "Store Information" }).click();

    await page.locator("#store-name").fill(storeName);
    await page.locator("#support-email").fill(supportEmail);

    await page.getByRole("button", { name: "Save Settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
  } finally {
    await context.close();
  }
});
