import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin.js";

test("support staff only see permitted admin areas", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-support-${stamp}@foodie.local`;
  const password = "Test12345";

  await loginAsAdmin(page);

  await page.goto("/admin/staff");
  await page.getByRole("button", { name: "Add staff" }).click();
  await page.locator("#staff-name").fill(`E2E Support ${stamp}`);
  await page.locator("#staff-email").fill(email);
  await page.locator("#staff-password").fill(password);
  await page.locator("#staff-role").selectOption("support");
  await page.getByRole("button", { name: "Create staff" }).click();
  await expect(page.getByText("Staff member added")).toBeVisible();

  await page.locator("#staff-search").fill(email);
  await expect(page.getByText(email)).toBeVisible();

  await page.context().clearCookies();
  await loginAsAdmin(page, { email, password });

  await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Customers" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Coupons" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff" })).toHaveCount(0);

  await page.goto("/admin/coupons");
  await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();

  const forbidden = await page.request.get("/api/v1/admin/coupons");
  expect(forbidden.status()).toBe(403);

  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto("/admin/staff");
  await page.locator("#staff-search").fill(email);
  await page.getByRole("button", { name: `Edit E2E Support ${stamp}` }).click();
  await page.locator("#edit-status").selectOption("suspended");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Staff member updated")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
