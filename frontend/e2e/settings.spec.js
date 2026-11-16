import { test, expect } from "@playwright/test";
import { adminApi, loginAsAdmin } from "./helpers/admin.js";

test("admin can save store information settings", async ({ browser }) => {
  test.setTimeout(90_000);

  const stamp = Date.now().toString().slice(-8);
  const storeName = `E2E Store ${stamp}`;
  const supportEmail = `e2e-${stamp}@foodie.local`;

  const context = await browser.newContext();
  const page = await context.newPage();

  let original = null;

  try {
    await loginAsAdmin(page);

    const before = await adminApi(page, { path: "/api/v1/admin/settings" });
    original = before.data.settings;

    await page.goto("/admin/settings");
    await expect(page.locator("#admin-main").getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("tab", { name: "Store Information" }).click();

    await page.locator("#store-name").fill(storeName);
    await page.locator("#support-email").fill(supportEmail);

    await page.getByRole("button", { name: "Save Settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    const after = await adminApi(page, { path: "/api/v1/admin/settings" });
    expect(after.data.settings.name).toBe(storeName);
    expect(after.data.settings.supportEmail).toBe(supportEmail);
  } finally {
    // Restore the original store details so the shared configuration is left
    // untouched.
    if (original) {
      await adminApi(page, {
        method: "PATCH",
        path: "/api/v1/admin/settings",
        data: {
          name: original.name,
          supportEmail: original.supportEmail,
          supportPhone: original.supportPhone,
        },
      });
    }
    await context.close();
  }
});
