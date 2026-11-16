import { expect } from "@playwright/test";
import { backendEnv } from "./env.js";

export async function loginAsAdmin(page, credentials = {}) {
  const env = backendEnv();
  const email = credentials.email || env.ADMIN_EMAIL;
  const password = credentials.password || env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env");
  }

  await page.goto("/admin/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => url.pathname === "/admin");
  await expect(page.getByText("Admin Sign In")).toHaveCount(0);
}

/**
 * Makes an authenticated admin API call from a signed-in browser context.
 *
 * The API is CSRF protected, so the `fd_csrf` cookie is mirrored into the
 * `x-csrf-token` header and the `Origin` is echoed back. `page.request`
 * shares the context's cookie jar, so the session cookie travels with it.
 */
export async function adminApi(page, { method = "GET", path, data } = {}) {
  const cookies = await page.context().cookies();
  const csrf = cookies.find((cookie) => cookie.name === "fd_csrf")?.value || "";

  const response = await page.request.fetch(path, {
    method,
    data,
    headers: {
      "x-csrf-token": csrf,
      origin: new URL(page.url()).origin,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok()) {
    throw new Error(
      `${method} ${path} failed (${response.status()}): ${JSON.stringify(body)}`
    );
  }

  return body;
}
