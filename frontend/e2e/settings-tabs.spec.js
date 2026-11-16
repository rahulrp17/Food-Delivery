import { test, expect } from "@playwright/test";
import { adminApi, loginAsAdmin } from "./helpers/admin.js";

/**
 * The settings screen has ten tabs. Every tab except the store information one
 * (already covered by settings.spec.js) is exercised here: the value is typed
 * in the UI, the saved value is read back from the API, and the original value
 * is restored so the shared configuration is left untouched.
 */

const readSettings = async (page) => {
  const body = await adminApi(page, { path: "/api/v1/admin/settings" });
  return body.data.settings;
};

const patchSettings = async (page, patch) => {
  const body = await adminApi(page, {
    method: "PATCH",
    path: "/api/v1/admin/settings",
    data: patch,
  });
  return body.data.settings;
};

const openSettings = async (page) => {
  await page.goto("/admin/settings");
  await expect(
    page.locator("#admin-main").getByRole("heading", { name: "Settings" })
  ).toBeVisible();
};

const saveSettings = async (page) => {
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Settings saved").first()).toBeVisible();
};

test.describe("settings tabs", () => {
  test("admin can save business hours", async ({ browser }) => {
    test.setTimeout(90_000);

    const context = await browser.newContext();
    const page = await context.newPage();
    let original = null;

    try {
      await loginAsAdmin(page);
      original = await readSettings(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Business Hours" }).click();

      const sunday = page.locator(".hours-row").first();
      await sunday.getByLabel("Closed").uncheck();
      await page.getByLabel("Sunday opening time").fill("08:15");
      await page.getByLabel("Sunday closing time").fill("22:45");

      await saveSettings(page);

      const updated = await readSettings(page);
      const sundayHours = updated.businessHours.find((entry) => entry.day === 0);
      expect(sundayHours.open).toBe("08:15");
      expect(sundayHours.close).toBe("22:45");
      expect(sundayHours.closed).toBe(false);
    } finally {
      if (original) {
        await patchSettings(page, { businessHours: original.businessHours });
      }
      await context.close();
    }
  });

  test("admin can save delivery and pricing", async ({ browser }) => {
    test.setTimeout(90_000);

    const context = await browser.newContext();
    const page = await context.newPage();
    let original = null;

    try {
      await loginAsAdmin(page);
      original = await readSettings(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Delivery & Pricing" }).click();

      await page.locator("#delivery-fee").fill("45.50");
      await page.locator("#free-threshold").fill("600.00");
      await page.locator("#min-order").fill("99.00");

      await saveSettings(page);

      const updated = await readSettings(page);
      expect(updated.deliveryFeePaise).toBe(4550);
      expect(updated.freeDeliveryThresholdPaise).toBe(60000);
      expect(updated.minOrderPaise).toBe(9900);
    } finally {
      if (original) {
        await patchSettings(page, {
          deliveryFeePaise: original.deliveryFeePaise,
          freeDeliveryThresholdPaise: original.freeDeliveryThresholdPaise,
          minOrderPaise: original.minOrderPaise,
        });
      }
      await context.close();
    }
  });

  test("admin can save tax and invoice details", async ({ browser }) => {
    test.setTimeout(90_000);

    const context = await browser.newContext();
    const page = await context.newPage();
    let original = null;

    try {
      await loginAsAdmin(page);
      original = await readSettings(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Tax & Invoice" }).click();

      await page.locator("#tax-rate").fill("7.5");
      await page.locator("#tax-label").fill("GST");
      await page.locator("#invoice-legal-name").fill("E2E Foods Pvt Ltd");
      await page.locator("#invoice-footer").fill("E2E invoice footer");

      await saveSettings(page);

      const updated = await readSettings(page);
      expect(updated.taxRateBps).toBe(750);
      expect(updated.taxLabel).toBe("GST");
      expect(updated.invoiceLegalName).toBe("E2E Foods Pvt Ltd");
      expect(updated.invoiceFooter).toBe("E2E invoice footer");
    } finally {
      if (original) {
        await patchSettings(page, {
          taxRateBps: original.taxRateBps,
          taxLabel: original.taxLabel,
          invoiceLegalName: original.invoiceLegalName,
          invoiceFooter: original.invoiceFooter,
        });
      }
      await context.close();
    }
  });

  test("admin can save the delivery estimate window", async ({ browser }) => {
    test.setTimeout(90_000);

    const context = await browser.newContext();
    const page = await context.newPage();
    let original = null;

    try {
      await loginAsAdmin(page);
      original = await readSettings(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Delivery Estimate" }).click();

      await page.locator("#estimate-min").fill("31");
      await page.locator("#estimate-max").fill("46");

      await saveSettings(page);

      const updated = await readSettings(page);
      expect(updated.deliveryEstimateMinutes.min).toBe(31);
      expect(updated.deliveryEstimateMinutes.max).toBe(46);
    } finally {
      if (original) {
        await patchSettings(page, {
          deliveryEstimateMinutes: original.deliveryEstimateMinutes,
        });
      }
      await context.close();
    }
  });

  test("admin can save serviceable pincodes", async ({ browser }) => {
    test.setTimeout(90_000);

    const context = await browser.newContext();
    const page = await context.newPage();
    let original = null;

    try {
      await loginAsAdmin(page);
      original = await readSettings(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Serviceable Pincodes" }).click();

      await page.locator("#pincodes").fill("110001\n560001");

      await saveSettings(page);

      const updated = await readSettings(page);
      expect(updated.serviceablePincodes).toEqual(["110001", "560001"]);
    } finally {
      if (original) {
        await patchSettings(page, {
          serviceablePincodes: original.serviceablePincodes,
        });
      }
      await context.close();
    }
  });

  test("admin can save notification preferences", async ({ browser }) => {
    test.setTimeout(90_000);

    const context = await browser.newContext();
    const page = await context.newPage();
    let original = null;

    try {
      await loginAsAdmin(page);
      original = await readSettings(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Notifications" }).click();

      const lowStock = page.getByRole("checkbox", { name: /Low stock/ });
      const wasChecked = await lowStock.isChecked();
      await lowStock.setChecked(!wasChecked);

      await saveSettings(page);

      const updated = await readSettings(page);
      expect(updated.notifications.lowStock).toBe(!wasChecked);
    } finally {
      if (original) {
        await patchSettings(page, { notifications: original.notifications });
      }
      await context.close();
    }
  });

  test("admin can update the admin profile", async ({ browser }) => {
    test.setTimeout(90_000);

    const stamp = Date.now().toString().slice(-8);
    const context = await browser.newContext();
    const page = await context.newPage();

    let originalName = null;
    let originalPhone = '';

    try {
      await loginAsAdmin(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Admin Profile" }).click();

      originalName = await page.locator("#profile-name").inputValue();
      originalPhone = await page.locator("#profile-phone").inputValue();

      await page.locator("#profile-name").fill(`E2E Admin ${stamp}`);
      await page.getByRole("button", { name: "Save Profile" }).click();
      await expect(page.getByText("Profile updated").first()).toBeVisible();

      // Saving the profile must not sign the admin out.
      await expect(page.getByRole("button", { name: "Save Profile" })).toBeVisible();

      const me = await adminApi(page, { path: "/api/v1/auth/me" });
      expect(me.data.user.name).toBe(`E2E Admin ${stamp}`);
    } finally {
      // Restore the original profile so the shared admin account is unchanged.
      if (originalName) {
        await adminApi(page, {
          method: "PATCH",
          path: "/api/v1/auth/profile",
          data: {
            name: originalName,
            ...(originalPhone ? { phone: originalPhone } : {}),
          },
        });
      }
      await context.close();
    }
  });

  test("admin sees active sessions and the password form validates", async ({ browser }) => {
    test.setTimeout(90_000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginAsAdmin(page);

      await openSettings(page);
      await page.getByRole("tab", { name: "Security & Sessions" }).click();

      // The session list of the signed in device.
      await expect(page.getByRole("heading", { name: "Active Sessions" })).toBeVisible();
      await expect(page.getByText("This device").first()).toBeVisible();

      // A confirmation that does not match the new password is rejected before
      // the request leaves the browser.
      await page.locator("#current-password").fill("Admin@12345");
      await page.locator("#new-password").fill("E2EPassw0rd");
      await page.locator("#confirm-password").fill("Different1");
      await page.getByRole("button", { name: "Update Password" }).click();
      await expect(page.getByText("Passwords do not match")).toBeVisible();

      // A too short password is rejected as well.
      await page.locator("#new-password").fill("short");
      await page.locator("#confirm-password").fill("short");
      await page.getByRole("button", { name: "Update Password" }).click();
      await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
