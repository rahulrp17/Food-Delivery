import { test, expect } from "@playwright/test";
import { adminAttempt, loginAsAdmin } from "./helpers/admin.js";

/**
 * Permission overrides replace the role defaults, so the account must show the
 * custom badge, see exactly the granted areas, and be refused everywhere else.
 * Suspension must then keep it out of the admin area entirely.
 */

test("explicit permissions widen a support account and suspension locks it out", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const stamp = Date.now();
  const name = `E2E Override ${stamp}`;
  const email = `e2e-override-${stamp}@foodie.local`;
  const password = "Test12345";

  await loginAsAdmin(page);
  await page.goto("/admin/staff");

  // A support account with two explicit permissions and no role defaults.
  await page.getByRole("button", { name: "Add staff" }).click();
  const createDialog = page.getByRole("dialog", { name: "Add staff member" });
  await createDialog.locator("#staff-name").fill(name);
  await createDialog.locator("#staff-email").fill(email);
  await createDialog.locator("#staff-password").fill(password);
  await createDialog.locator("#staff-role").selectOption("support");
  await createDialog.getByRole("checkbox", { name: /View dashboard/ }).check();
  await createDialog.getByRole("checkbox", { name: /View coupons/ }).check();
  await createDialog.getByRole("button", { name: "Create staff" }).click();
  await expect(page.getByText("Staff member added").first()).toBeVisible();

  await page.getByLabel("Search staff").fill(email);
  const card = page.locator(".staff-card", { hasText: email });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Support");
  await expect(card).toContainText("Custom permissions");
  await expect(card).toContainText("overview:read");
  await expect(card).toContainText("coupons:read");
  await expect(card).not.toContainText("coupons:write");
  await expect(card).not.toContainText("orders:read");

  // The override is stricter than the support defaults: only the granted areas.
  await page.context().clearCookies();
  await loginAsAdmin(page, { email, password });

  await expect(page.getByRole("link", { name: "Coupons" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Orders" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Customers" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Products" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Staff" })).toHaveCount(0);

  await page.goto("/admin/coupons");
  await expect(
    page.locator("#admin-main").getByRole("heading", { name: "Coupons" })
  ).toBeVisible();

  // Read is allowed, write is not.
  const read = await adminAttempt(page, { path: "/api/v1/admin/coupons" });
  expect(read.status()).toBe(200);

  const write = await adminAttempt(page, {
    method: "POST",
    path: "/api/v1/admin/coupons",
    data: { code: `E2E${stamp}`, type: "percent", percentBps: 1000 },
  });
  expect(write.status()).toBe(403);
  expect((await write.json()).error.code).toBe("FORBIDDEN");

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();

  // Suspending the account stops it from signing in at all.
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto("/admin/staff");
  await page.getByLabel("Search staff").fill(email);
  await page.getByRole("button", { name: `Edit ${name}` }).click();
  const editDialog = page.getByRole("dialog", { name: `Edit ${name}` });
  await editDialog.locator("#edit-status").selectOption("suspended");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Staff member updated").first()).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.locator(".admin-login-error")).toHaveText(
    /This account has been suspended/
  );
  await expect(page).toHaveURL(/\/admin\/login$/);

  // Reactivating restores the seat for the owner.
  await page.context().clearCookies();
  await loginAsAdmin(page);
  await page.goto("/admin/staff");
  await page.getByLabel("Search staff").fill(email);
  await page.getByRole("button", { name: `Edit ${name}` }).click();
  const reactivateDialog = page.getByRole("dialog", { name: `Edit ${name}` });
  await reactivateDialog.locator("#edit-status").selectOption("active");
  await reactivateDialog.locator("#edit-role").selectOption("manager");
  await reactivateDialog.getByRole("checkbox", { name: /View dashboard/ }).uncheck();
  await reactivateDialog.getByRole("checkbox", { name: /View coupons/ }).uncheck();
  await reactivateDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Staff member updated").first()).toBeVisible();

  const managerCard = page.locator(".staff-card", { hasText: email });
  await expect(managerCard).toContainText("Manager");
  await expect(managerCard).toContainText("Role default");
  await expect(managerCard).not.toContainText("Custom permissions");

  // The form keeps its state and its inline message on a rejected sign-in.
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("WrongPassword123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.locator(".admin-login-error")).toContainText(
    "Invalid email or password"
  );
  await expect(page.locator("#email")).toHaveValue(email);
  await expect(page).toHaveURL(/\/admin\/login$/);
});
