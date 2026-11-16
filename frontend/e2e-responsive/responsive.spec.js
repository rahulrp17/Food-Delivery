import { test, expect } from "@playwright/test";
import { backendEnv } from "../e2e/helpers/env.js";

/**
 * Responsive sweep — Phase 10.
 *
 * For every route in the sweep matrix we load the page at a range of
 * viewports and assert:
 *
 *  1. No horizontal overflow. `globals.css` sets `html { overflow-x: clip }`,
 *     which hides overflow from `documentElement.scrollWidth`, so we walk the
 *     DOM and look for elements whose right edge extends past the viewport
 *     that are NOT inside an intentionally scrollable ancestor.
 *  2. No unexpected console/page errors (401s are expected for guests).
 *  3. The primary content actually rendered (visible heading, non-empty).
 *  4. Key interactive controls are big enough to tap on small screens.
 *
 * The sweep is a separate spec so it can be run on its own:
 *   npx playwright test e2e/responsive.spec.js --project=chromium
 */

const API_URL = process.env.API_URL || "http://localhost:4000";

const VIEWPORTS = [
  { name: "320", width: 320, height: 720, mobile: true },
  { name: "360", width: 360, height: 800, mobile: true },
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "600", width: 600, height: 900, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: false },
  { name: "820", width: 820, height: 1180, mobile: false },
  { name: "1024", width: 1024, height: 768, mobile: false },
  { name: "1280", width: 1280, height: 800, mobile: false },
  { name: "1440", width: 1440, height: 900, mobile: false },
  { name: "1920", width: 1920, height: 1080, mobile: false },
];

/** Routes that do not need an authenticated session. */
const PUBLIC_ROUTES = [
  { path: "/", name: "Home" },
  { path: "/menu", name: "Menu" },
  { path: "/search?q=chicken", name: "Search" },
  { path: "/cart", name: "Cart" },
  { path: "/login", name: "Customer login" },
  { path: "/register", name: "Customer register" },
  { path: "/forgot-password", name: "Forgot password" },
  { path: "/reset-password", name: "Reset password" },
  { path: "/about", name: "About" },
  { path: "/contact", name: "Contact" },
  { path: "/services", name: "Services" },
  { path: "/admin/login", name: "Admin login" },
  { path: "/this-route-does-not-exist", name: "Not found" },
];

/** Routes behind `ProtectedRoute` — the sweep signs in before visiting these. */
const AUTHENTICATED_ROUTES = [
  { path: "/checkout", name: "Checkout" },
  { path: "/orders", name: "My orders" },
  { path: "/account", name: "Account" },
  { path: "/verify", name: "Payment verify" },
];

/**
 * Runs in the browser. Finds elements that stick out past the right edge of
 * the viewport without being inside an intentionally scrollable container.
 */
const OVERFLOW_PROBE = () => {
  const root = document.documentElement;
  const viewportWidth = root.clientWidth;
  const offenders = [];

  const label = (element) => {
    const className =
      typeof element.className === "string"
        ? element.className
        : element.getAttribute("class") || "";
    const id = element.id ? `#${element.id}` : "";
    return `${element.tagName.toLowerCase()}${id}${className ? `.${className.trim().split(/\s+/).join(".")}` : ""}`;
  };

  const isInsideScroller = (element) => {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const overflowX = getComputedStyle(parent).overflowX;
      if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden" || overflowX === "clip") {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  };

  for (const element of document.body.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (style.position === "fixed") continue;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= viewportWidth + 1) continue;
    if (isInsideScroller(element)) continue;

    offenders.push({
      selector: label(element),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
    });
  }

  return {
    viewportWidth,
    scrollWidth: root.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: offenders.slice(0, 10),
  };
};

/**
 * Measures tap-target sizes for visible interactive controls.
 *
 * WCAG 2.2 SC 2.5.8 (Target Size Minimum, AA) requires 24x24 CSS px and is
 * a hard failure below that. 44x44 is the WCAG 2.5.5 AAA / Apple HIG target
 * and is reported as an advisory rather than a failure.
 */
const TAP_TARGET_PROBE = () => {
  const AA_MINIMUM = 24;
  const AAA_MINIMUM = 44;

  const label = (element) => {
    const className =
      typeof element.className === "string"
        ? element.className
        : element.getAttribute("class") || "";
    const text = (element.textContent || "").trim().slice(0, 30);
    const aria = element.getAttribute("aria-label") || "";
    return {
      selector: `${element.tagName.toLowerCase()}${className ? `.${className.trim().split(/\s+/)[0]}` : ""}`,
      text: text || aria || "(no accessible name)",
      height: Math.round(element.getBoundingClientRect().height),
      width: Math.round(element.getBoundingClientRect().width),
    };
  };

  const selector = 'button, a[href], input:not([type="hidden"]), select, [role="button"], [role="tab"]';
  const failures = [];
  const advisories = [];

  for (const element of document.body.querySelectorAll(selector)) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (style.opacity === "0") continue;
    if (element.closest("[aria-hidden='true']")) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Inline links inside a sentence are not tap targets.
    if (element.tagName === "A" && element.closest("p, li, label, address, figcaption")) continue;

    // A checkbox inherits the size of its associated label.
    if (element.tagName === "INPUT" && element.type === "checkbox" && element.closest("label")) continue;

    if (rect.height < AA_MINIMUM || rect.width < AA_MINIMUM) {
      failures.push(label(element));
    } else if (rect.height < AAA_MINIMUM || rect.width < AAA_MINIMUM) {
      advisories.push(label(element));
    }
  }

  return { failures: failures.slice(0, 12), advisories: advisories.slice(0, 12) };
};

/**
 * Accessibility semantics probe.
 *
 * Checks the semantics that a screen reader depends on and that are
 * mechanically verifiable:
 *
 *  - the document declares a language;
 *  - exactly one visible `h1`;
 *  - heading levels never skip (h1 -> h3);
 *  - every visible image has an `alt` attribute;
 *  - every form control has an accessible name (label / aria-label / ...);
 *  - every button and link has an accessible name;
 *  - no duplicate `id` attributes;
 *  - no focusable element is hidden from assistive tech via aria-hidden.
 */
const A11Y_PROBE = () => {
  const issues = [];
  const describe = (element) => {
    const className =
      typeof element.className === "string"
        ? element.className
        : element.getAttribute("class") || "";
    const id = element.id ? `#${element.id}` : "";
    return `${element.tagName.toLowerCase()}${id}${className ? `.${className.trim().split(/\s+/)[0]}` : ""}`;
  };

  const isVisible = (element) => {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return element.getClientRects().length > 0;
  };

  const hasAccessibleName = (element) => {
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) return true;

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const referenced = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean);
      if (referenced.some((node) => (node.textContent || "").trim())) return true;
    }

    const title = element.getAttribute("title");
    if (title && title.trim()) return true;

    if (element.tagName === "INPUT" || element.tagName === "SELECT" || element.tagName === "TEXTAREA") {
      // A wrapping label counts.
      if (element.closest("label")) return true;
      // An explicit label[for] counts.
      if (element.id) {
        const escaped = window.CSS?.escape ? window.CSS.escape(element.id) : element.id;
        const labels = document.querySelectorAll(`label[for="${escaped}"]`);
        if ([...labels].some((label) => (label.textContent || "").trim())) return true;
      }
      return false;
    }

    // Buttons and links: their own text content is the name.
    if ((element.textContent || "").trim()) return true;

    // An image with alt text inside the control is the name.
    const image = element.querySelector("img[alt]");
    if (image && (image.getAttribute("alt") || "").trim()) return true;

    return false;
  };

  // ---- document language ----------------------------------------------
  const lang = document.documentElement.getAttribute("lang");
  if (!lang || !lang.trim()) {
    issues.push("html: missing lang attribute");
  }

  // ---- headings --------------------------------------------------------
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(isVisible);
  const h1s = headings.filter((heading) => heading.tagName === "H1");
  if (h1s.length === 0) {
    issues.push("document: no visible h1");
  } else if (h1s.length > 1) {
    issues.push(`document: ${h1s.length} visible h1 elements`);
  }

  let previousLevel = 0;
  for (const heading of headings) {
    const level = Number(heading.tagName.slice(1));
    if (previousLevel && level > previousLevel + 1) {
      issues.push(
        `heading: level skipped h${previousLevel} -> h${level} at "${(heading.textContent || "").trim().slice(0, 40)}"`
      );
    }
    previousLevel = level;
  }

  // ---- images ----------------------------------------------------------
  for (const image of document.querySelectorAll("img")) {
    if (!isVisible(image)) continue;
    if (image.closest("[aria-hidden='true']")) continue;
    if (!image.hasAttribute("alt")) {
      issues.push(`image: missing alt attribute (${image.getAttribute("src") || "no src"})`);
    }
  }

  // ---- form controls ---------------------------------------------------
  const controls = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea'
  );
  for (const control of controls) {
    if (!isVisible(control)) continue;
    if (control.closest("[aria-hidden='true']")) continue;
    if (!hasAccessibleName(control)) {
      issues.push(`control: no accessible name (${describe(control)})`);
    }
  }

  // ---- buttons and links ----------------------------------------------
  for (const element of document.querySelectorAll("button, a[href], [role='button'], [role='tab']")) {
    if (!isVisible(element)) continue;
    if (element.closest("[aria-hidden='true']")) continue;
    if (!hasAccessibleName(element)) {
      issues.push(`button/link: no accessible name (${describe(element)})`);
    }
  }

  // ---- duplicate ids ---------------------------------------------------
  const seenIds = new Map();
  for (const element of document.querySelectorAll("[id]")) {
    const id = element.id;
    if (!id) continue;
    if (seenIds.has(id)) {
      issues.push(`duplicate id: #${id}`);
    } else {
      seenIds.set(id, element);
    }
  }

  // ---- focusable inside aria-hidden ------------------------------------
  for (const element of document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
  )) {
    if (!isVisible(element)) continue;
    if (element.closest("[aria-hidden='true']")) {
      issues.push(`aria-hidden: focusable element hidden from assistive tech (${describe(element)})`);
    }
  }

  return issues;
};

async function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

/**
 * Navigates to a route and waits until the page has actually painted.
 *
 * Under parallel load the server occasionally serves a route that never
 * paints (the auth bootstrap has not resolved yet), so a failed wait is
 * retried once with a reload. A route that is genuinely broken still fails,
 * because it fails twice.
 */
async function settleRoute(page, path, headingSelector, attempt = 1) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  const heading = page.locator(headingSelector).first();
  const painted = await heading
    .waitFor({ state: "visible", timeout: 20000 })
    .then(() => true)
    .catch(() => false);

  if (!painted && attempt === 1) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await heading.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  }

  await page.waitForTimeout(250);
  return heading;
}

/**
 * Looks up a live product slug so the sweep can exercise the product detail
 * route. The API is retried because the backend can be mid-restart while the
 * sweep runs. Returns null when no product is available, in which case the
 * product route is simply skipped.
 */
/**
 * Registers a throwaway customer and leaves the browser session
 * authenticated, so the protected routes can be swept.
 *
 * The UI path is used deliberately: it exercises the real CSRF-protected
 * login flow instead of poking the API directly.
 */
async function loginAsCustomer(page) {
  const password = "Test12345";
  let lastError = "(unknown)";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    // A unique address per attempt: parallel workers can otherwise collide
    // on the same millisecond and get a 409.
    const email = `sweep-${crypto.randomUUID()}@foodie.test`;

    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="name"]').fill("Sweep Customer");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();

    try {
      await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
      return { email, password };
    } catch {
      lastError = await page
        .locator("[role='alert'], .field-error, .form-error, .auth-error")
        .first()
        .innerText()
        .catch(() => "");
      lastError = lastError.trim() || "(no visible error message)";
    }
  }

  throw new Error(`Could not register a sweep customer: ${lastError}`);
}

async function fetchProductSlug(request) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await request.get(`${API_URL}/api/v1/products?limit=1&inStock=true`);
      if (!response.ok()) throw new Error(`API responded ${response.status()}`);
      const body = await response.json();
      const items = body?.data?.items || [];
      return items[0]?.slug || null;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return null;
}

test("customer routes do not overflow at any viewport", async ({ page, request }) => {
  test.setTimeout(900_000);

  const productSlug = await fetchProductSlug(request);
  const guestRoutes = productSlug
    ? [...PUBLIC_ROUTES, { path: `/product/${productSlug}`, name: "Product detail" }]
    : PUBLIC_ROUTES;

  // The protected routes need a session, so they are swept after signing in.
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAsCustomer(page);
  const routes = [...guestRoutes, ...AUTHENTICATED_ROUTES];

  const failures = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of routes) {
      const errors = await collectErrors(page);
      const heading = await settleRoute(page, route.path, "h1");

      const probe = await page.evaluate(OVERFLOW_PROBE);
      const unexpectedErrors = errors.filter(
        (message) => !message.includes("401") && !message.includes("Failed to load resource")
      );

      const headingVisible = await heading.isVisible().catch(() => false);
      const headingText = headingVisible ? (await heading.innerText().catch(() => "")) : "";

      const problems = [];
      if (probe.offenders.length) {
        problems.push(
          `overflow: ${probe.offenders.map((o) => `${o.selector} (right=${o.right}, w=${o.width})`).join(", ")}`
        );
      }
      if (!headingVisible || !headingText.trim()) {
        problems.push("no visible h1 content");
      }
      if (unexpectedErrors.length) {
        problems.push(`errors: ${unexpectedErrors.join(" | ")}`);
      }

      if (problems.length) {
        failures.push(
          `${viewport.name}px ${route.path} (${route.name}): ${problems.join(" ; ")}`
        );
      }
    }
  }

  expect(failures, failures.join("\n")).toEqual([]);
});

test("interactive controls meet tap-target size on mobile", async ({ page, request }) => {
  test.setTimeout(900_000);

  const productSlug = await fetchProductSlug(request);
  const guestRoutes = productSlug
    ? [...PUBLIC_ROUTES, { path: `/product/${productSlug}`, name: "Product detail" }]
    : PUBLIC_ROUTES;

  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAsCustomer(page);
  const routes = [...guestRoutes, ...AUTHENTICATED_ROUTES];

  const failures = [];
  const advisories = [];

  for (const viewport of VIEWPORTS.filter((item) => item.mobile)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of routes) {
      await settleRoute(page, route.path, "h1");

      const probe = await page.evaluate(TAP_TARGET_PROBE);

      if (probe.failures.length) {
        failures.push(
          `${viewport.name}px ${route.path}: ${probe.failures
            .map((item) => `${item.selector} "${item.text}" ${item.width}x${item.height}`)
            .join(", ")}`
        );
      }
      if (probe.advisories.length) {
        advisories.push(
          `${viewport.name}px ${route.path}: ${probe.advisories
            .map((item) => `${item.selector} "${item.text}" ${item.width}x${item.height}`)
            .join(", ")}`
        );
      }
    }
  }

  // Below 24x24 (WCAG 2.5.8 AA) is a hard failure. Between 24 and 44 is an
  // advisory that gets reported but does not fail the run.
  if (advisories.length) {
    console.log(`\nTap-target advisories (24-44px):\n${[...new Set(advisories)].join("\n")}\n`);
  }

  expect(failures, failures.join("\n")).toEqual([]);
});

test("admin routes do not overflow at any viewport", async ({ page }) => {
  test.setTimeout(900_000);

  const env = backendEnv();
  const adminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env");
  }

  const ADMIN_ROUTES = [
    { path: "/admin", name: "Overview" },
    { path: "/admin/products", name: "Products" },
    { path: "/admin/orders", name: "Orders" },
    { path: "/admin/categories", name: "Categories" },
    { path: "/admin/customers", name: "Customers" },
    { path: "/admin/coupons", name: "Coupons" },
    { path: "/admin/reviews", name: "Reviews" },
    { path: "/admin/inventory", name: "Inventory" },
    { path: "/admin/staff", name: "Staff" },
    { path: "/admin/settings", name: "Settings" },
    { path: "/admin/audit-logs", name: "Audit log" },
  ];

  const failures = [];

  // Log in once — the session cookie survives viewport resizes, and
  // /admin/login redirects away once the session exists.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(adminEmail);
  await page.locator("#password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30_000 });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ADMIN_ROUTES) {
      const errors = await collectErrors(page);
      const heading = await settleRoute(page, route.path, "#admin-main h1");

      const probe = await page.evaluate(OVERFLOW_PROBE);
      const unexpectedErrors = errors.filter(
        (message) => !message.includes("401") && !message.includes("Failed to load resource")
      );

      const headingVisible = await heading.isVisible().catch(() => false);

      const problems = [];
      if (probe.offenders.length) {
        problems.push(
          `overflow: ${probe.offenders.map((o) => `${o.selector} (right=${o.right}, w=${o.width})`).join(", ")}`
        );
      }
      if (!headingVisible) {
        problems.push("no visible admin h1");
      }
      if (unexpectedErrors.length) {
        problems.push(`errors: ${unexpectedErrors.join(" | ")}`);
      }

      if (problems.length) {
        failures.push(
          `${viewport.name}px ${route.path} (${route.name}): ${problems.join(" ; ")}`
        );
      }
    }
  }

  expect(failures, failures.join("\n")).toEqual([]);
});

test("routes expose correct accessibility semantics", async ({ page, request }) => {
  test.setTimeout(900_000);

  const productSlug = await fetchProductSlug(request);
  const guestRoutes = productSlug
    ? [...PUBLIC_ROUTES, { path: `/product/${productSlug}`, name: "Product detail" }]
    : PUBLIC_ROUTES;

  const failures = [];

  // Customer routes are checked at one representative viewport — the
  // semantics do not change with width.
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAsCustomer(page);
  const customerRoutes = [...guestRoutes, ...AUTHENTICATED_ROUTES];

  for (const route of customerRoutes) {
    await settleRoute(page, route.path, "h1");
    const issues = await page.evaluate(A11Y_PROBE);
    if (issues.length) {
      failures.push(`${route.path} (${route.name}): ${[...new Set(issues)].join(" | ")}`);
    }
  }

  // Admin routes need a session.
  const env = backendEnv();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env");
  }

  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(env.ADMIN_EMAIL);
  await page.locator("#password").fill(env.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30_000 });

  const adminRoutes = [
    { path: "/admin", name: "Overview" },
    { path: "/admin/products", name: "Products" },
    { path: "/admin/orders", name: "Orders" },
    { path: "/admin/categories", name: "Categories" },
    { path: "/admin/customers", name: "Customers" },
    { path: "/admin/coupons", name: "Coupons" },
    { path: "/admin/reviews", name: "Reviews" },
    { path: "/admin/inventory", name: "Inventory" },
    { path: "/admin/staff", name: "Staff" },
    { path: "/admin/settings", name: "Settings" },
    { path: "/admin/audit-logs", name: "Audit log" },
  ];

  for (const route of adminRoutes) {
    await settleRoute(page, route.path, "#admin-main h1");
    const issues = await page.evaluate(A11Y_PROBE);
    if (issues.length) {
      failures.push(`${route.path} (${route.name}): ${[...new Set(issues)].join(" | ")}`);
    }
  }

  expect(failures, failures.join("\n")).toEqual([]);
});
