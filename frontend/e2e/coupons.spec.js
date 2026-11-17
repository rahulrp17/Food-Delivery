import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { adminApi, adminAttempt, loginAsAdmin } from "./helpers/admin.js";
import { backendEnv } from "./helpers/env.js";
import {
  addFirstProductToCart,
  applyCouponToCart,
  placePaidOrder,
  registerCustomer,
} from "./helpers/customer.js";

/**
 * Coupons are the one admin area where the badge on screen, the status filter,
 * the usage limits and the redemption analytics all describe the same thing.
 * These specs check they agree with each other and with what customers can
 * actually redeem.
 */

const stamp = Date.now().toString().slice(-8);
const percentCode = `E2EP${stamp}`;
const scheduledCode = `E2ES${stamp}`;
const expiredCode = `E2EE${stamp}`;
const limitCode = `E2EL${stamp}`;

/** A `datetime-local` value the browser will read as local time. */
const localInput = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const newCouponDialog = async (page) => {
  await page.getByRole("button", { name: "New Coupon" }).click();
  const dialog = page.getByRole("dialog", { name: "New Coupon" });
  await expect(dialog).toBeVisible();
  return dialog;
};

const fillCoupon = async (dialog, { code, description, percentBps, startsAt, expiresAt, usageLimit, perUserLimit }) => {
  await dialog.locator("#coupon-code").fill(code);

  if (description) await dialog.locator("#coupon-desc").fill(description);
  if (percentBps !== undefined) await dialog.locator("#coupon-value").fill(String(percentBps));
  if (startsAt) await dialog.locator("#coupon-starts").fill(startsAt);
  if (expiresAt) await dialog.locator("#coupon-expires").fill(expiresAt);
  if (usageLimit) await dialog.locator("#coupon-usage-limit").fill(String(usageLimit));
  if (perUserLimit) await dialog.locator("#coupon-per-user").fill(String(perUserLimit));
};

const createCouponThroughUi = async (page, fields) => {
  const dialog = await newCouponDialog(page);
  await fillCoupon(dialog, fields);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Coupon created").first()).toBeVisible();
};

test.describe("coupons", () => {
  test("admin can create, edit and filter coupons by the state customers see", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginAsAdmin(page);
      await page.goto("/admin/coupons");
      await expect(
        page.locator("#admin-main").getByRole("heading", { name: "Coupons" })
      ).toBeVisible();

      // A percentage coupon with every limit filled in.
      await createCouponThroughUi(page, {
        code: percentCode,
        description: "E2E percent coupon",
        percentBps: 1500,
        usageLimit: 2,
        perUserLimit: 1,
      });

      const percentCard = page.locator(".coupon-card", { hasText: percentCode });
      await expect(percentCard).toContainText("15% off");
      await expect(percentCard).toContainText("Active");
      await expect(percentCard).toContainText("E2E percent coupon");
      await expect(percentCard).toContainText("Per user");
      await expect(percentCard).toContainText("1");

      // The form refuses a percentage below the minimum instead of saving it.
      const invalidDialog = await newCouponDialog(page);
      await fillCoupon(invalidDialog, { code: `${percentCode}X`, percentBps: 0 });
      await invalidDialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(
        invalidDialog.getByText("Percentage must be between 0.01% and 100%")
      ).toBeVisible();
      await invalidDialog.getByRole("button", { name: "Cancel" }).click();
      await expect(invalidDialog).toHaveCount(0);

      // Two coupons whose state comes from their dates, not from isActive.
      await createCouponThroughUi(page, {
        code: scheduledCode,
        percentBps: 1000,
        startsAt: localInput(daysFromNow(2)),
      });
      await createCouponThroughUi(page, {
        code: expiredCode,
        percentBps: 1000,
        startsAt: localInput(daysFromNow(-5)),
        expiresAt: localInput(daysFromNow(-1)),
      });

      await expect(page.locator(".coupon-card", { hasText: scheduledCode })).toContainText(
        "Scheduled"
      );
      await expect(page.locator(".coupon-card", { hasText: expiredCode })).toContainText(
        "Expired"
      );

      const statusFilter = page.getByLabel("Status");
      const scheduledCard = page.locator(".coupon-card", { hasText: scheduledCode });
      const expiredCard = page.locator(".coupon-card", { hasText: expiredCode });

      await statusFilter.selectOption("scheduled");
      await expect(expiredCard).toHaveCount(0);
      await expect(percentCard).toHaveCount(0);
      await expect(scheduledCard).toBeVisible();

      await statusFilter.selectOption("expired");
      await expect(scheduledCard).toHaveCount(0);
      await expect(percentCard).toHaveCount(0);
      await expect(expiredCard).toBeVisible();

      await statusFilter.selectOption("active");
      await expect(scheduledCard).toHaveCount(0);
      await expect(expiredCard).toHaveCount(0);
      await expect(percentCard).toBeVisible();

      await statusFilter.selectOption("");
      await expect(scheduledCard).toBeVisible();

      // Codes are unique and the date window is validated on the server.
      const duplicate = await adminAttempt(page, {
        method: "POST",
        path: "/api/v1/admin/coupons",
        data: { code: percentCode, type: "percent", percentBps: 1000 },
      });
      expect(duplicate.status()).toBe(409);
      expect((await duplicate.json()).error.code).toBe("COUPON_EXISTS");

      const badWindow = await adminAttempt(page, {
        method: "POST",
        path: "/api/v1/admin/coupons",
        data: {
          code: `${percentCode}W`,
          type: "percent",
          percentBps: 1000,
          startsAt: daysFromNow(2).toISOString(),
          expiresAt: daysFromNow(-1).toISOString(),
        },
      });
      expect(badWindow.status()).toBe(400);
      const badWindowBody = await badWindow.json();
      expect(badWindowBody.error.code).toBe("VALIDATION_ERROR");
      expect(
        badWindowBody.error.details.some((detail) => detail.field === "expiresAt")
      ).toBe(true);

      // Editing keeps the same coupon and refreshes the card.
      await page.getByRole("button", { name: `Edit coupon ${percentCode}` }).click();
      const editDialog = page.getByRole("dialog", { name: "Edit Coupon" });
      await expect(editDialog.locator("#coupon-code")).toHaveValue(percentCode);
      await editDialog.locator("#coupon-value").fill("2000");
      await editDialog.locator("#coupon-desc").fill("E2E percent coupon (edited)");
      await editDialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("Coupon updated").first()).toBeVisible();
      await expect(percentCard).toContainText("20% off");
      await expect(percentCard).toContainText("E2E percent coupon (edited)");

      // Deleting hides the coupon from every filter.
      await page.getByRole("button", { name: `Delete coupon ${scheduledCode}` }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.getByText("Coupon deleted").first()).toBeVisible();
      await expect(page.locator(".coupon-card", { hasText: scheduledCode })).toHaveCount(0);
    } finally {
      await context.close();

      const cleanup = await browser.newContext();
      const cleanupPage = await cleanup.newPage();
      try {
        await loginAsAdmin(cleanupPage);
        for (const code of [percentCode, scheduledCode, expiredCode]) {
          const list = await adminApi(cleanupPage, {
            path: `/api/v1/admin/coupons?limit=100`,
          });
          const coupon = list.data.items.find((item) => item.code === code);
          if (coupon) {
            await adminApi(cleanupPage, {
              method: "DELETE",
              path: `/api/v1/admin/coupons/${coupon.id}`,
            }).catch(() => {});
          }
        }
      } catch {
        // The coupon may already be deleted; cleanup is best effort.
      } finally {
        await cleanup.close();
      }
    }
  });

  test("coupon limits, redemptions and analytics stay in sync", async ({ browser }) => {
    test.setTimeout(240_000);

    const webhookSecret = backendEnv().STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET must be set in backend/.env");
    }

    const adminContext = await browser.newContext();
    const page = await adminContext.newPage();
    const firstCustomer = await browser.newContext();
    const secondCustomer = await browser.newContext();
    const thirdCustomer = await browser.newContext();
    const customerContexts = [firstCustomer, secondCustomer, thirdCustomer];
    let couponId;

    try {
      await loginAsAdmin(page);

      const created = await adminApi(page, {
        method: "POST",
        path: "/api/v1/admin/coupons",
        data: {
          code: limitCode,
          description: "E2E limited coupon",
          type: "fixed",
          amountPaise: 1000,
          usageLimit: 2,
          perUserLimit: 1,
        },
      });
      couponId = created.data.coupon.id;

      const openCoupons = async () => {
        await page.goto("/admin/coupons");
        const card = page.locator(".coupon-card", { hasText: limitCode });
        await expect(card).toBeVisible();
        return card;
      };

      const one = await registerCustomer(firstCustomer);
      const { order: firstOrder } = await placePaidOrder(firstCustomer, one, {
        webhookSecret,
        quantity: 1,
        couponCode: limitCode,
        minPricePaise: 1500,
      });
      expect(firstOrder.couponCode).toBe(limitCode);
      expect(firstOrder.pricing.discountPaise).toBe(1000);

      let card = await openCoupons();
      await expect(card).toContainText("1 uses");
      await expect(card).toContainText("₹10 redeemed");

      // The per-user limit blocks the same customer even before she pays again.
      await addFirstProductToCart(firstCustomer, { quantity: 1 });
      const repeat = await applyCouponToCart(firstCustomer, limitCode);
      expect(repeat.status()).toBe(400);
      expect((await repeat.json()).error.message).toContain(
        "already used this coupon the maximum number of times"
      );

      const two = await registerCustomer(secondCustomer);
      const { order: secondOrder } = await placePaidOrder(secondCustomer, two, {
        webhookSecret,
        quantity: 1,
        couponCode: limitCode,
        minPricePaise: 1500,
      });

      card = await openCoupons();
      await expect(card).toContainText("2 uses");
      await expect(card).toContainText("₹20 redeemed");

      // A third customer hits the global usage limit.
      await registerCustomer(thirdCustomer);
      await addFirstProductToCart(thirdCustomer, { quantity: 1 });
      const exhausted = await applyCouponToCart(thirdCustomer, limitCode);
      expect(exhausted.status()).toBe(400);
      expect((await exhausted.json()).error.message).toContain(
        "This coupon has reached its usage limit"
      );

      // Cancelling one redemption gives the slot and the analytics back.
      await adminApi(page, {
        method: "POST",
        path: `/api/v1/admin/orders/${secondOrder.id}/cancel`,
        data: { reason: "E2E coupon cancellation" },
      });

      card = await openCoupons();
      await expect(card).toContainText("1 uses");
      await expect(card).toContainText("₹10 redeemed");

      // The freed slot is redeemable again.
      const retry = await applyCouponToCart(thirdCustomer, limitCode);
      expect(retry.ok()).toBe(true);
      const retryBody = await retry.json();
      expect(retryBody.data.coupon.code).toBe(limitCode);
      expect(retryBody.data.coupon.valid).toBe(true);

      // The history lists only the live redemption, and the export mirrors it.
      await page.getByRole("button", { name: `View redemptions for ${limitCode}` }).click();
      const modal = page.getByRole("dialog", { name: /Redemptions/ });
      await expect(modal).toBeVisible();
      await expect(modal.getByText("1 redemption")).toBeVisible();
      await expect(modal).toContainText(firstOrder.orderNumber);
      await expect(modal).toContainText(one.email);
      await expect(modal).not.toContainText(secondOrder.orderNumber);

      const downloadPromise = page.waitForEvent("download");
      await modal.getByRole("button", { name: "Export CSV" }).click();
      const download = await downloadPromise;
      const csv = await readFile(await download.path(), "utf8");
      expect(csv).toContain('"Date","Order","Customer","Email","Order total (INR)"');
      expect(csv).toContain(firstOrder.orderNumber);
      expect(csv).toContain(one.email);
      expect(csv).not.toContain(secondOrder.orderNumber);
    } finally {
      await Promise.all(customerContexts.map((context) => context.close()));
      await adminContext.close();

      const cleanup = await browser.newContext();
      const cleanupPage = await cleanup.newPage();
      try {
        await loginAsAdmin(cleanupPage);
        await adminApi(cleanupPage, {
          method: "DELETE",
          path: `/api/v1/admin/coupons/${couponId}`,
        }).catch(() => {});
      } catch {
        // Best effort.
      } finally {
        await cleanup.close();
      }
    }
  });
});



