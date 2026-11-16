# UI QA Report — Foodie MERN App

Generated from the corrective UI/UX overhaul. Verification performed from `frontend/`.

## Verification gates

| Gate | Command | Result |
|------|---------|--------|
| Lint | `npm run lint` | ✅ **0 problems** (the 4 pre-existing warnings lived in the deleted legacy files) |
| Build | `npm run build` | ✅ builds successfully (`dist/`) |
| Functional E2E | `npm run test:e2e` | ✅ 7/7 specs — admin-modules, categories, order-flow, products, rbac, settings, reviews |
| Responsive / a11y sweep | `npm run test:responsive` | ✅ 4/4 specs — 29 routes × 11 viewports + an accessibility semantics audit, against the **production build** |

E2E creds: backend `ADMIN_EMAIL`/`ADMIN_PASSWORD`; customers `Test12345`. Backend auto-starts via Playwright `webServer` from `backend/`.

> The sweep deliberately runs against `vite preview` (the production bundle) rather than the dev server. `manualChunks` is a **build-only** option, so a broken production bundle is invisible to a dev-server test run. See §2.

---

## 2. Production build was broken — caught by testing the built bundle

**Severity: Critical.** The app's production bundle threw
`Cannot read properties of undefined (reading 'useLayoutEffect')` on page
load, leaving **every page blank** (including the admin login screen).

**Root cause.** `vite.config.js` had a hand-rolled `manualChunks` function:

```js
if (id.includes("react-dom") || id.includes("/react/")) return "react";
return "vendor";
```

`react`, `react-dom` and `scheduler` were split across two chunks. `scheduler`
does not match `"/react/"`, so it fell into `vendor`, while `react-dom` went
into `react`. That produced a **circular chunk dependency** (`react` →
`vendor` → `react`), and Rollup initialised `react-dom` before `react`, so
React's internals were undefined at first render.

**Why it went unnoticed.** `manualChunks` only applies to `build`. The entire
Playwright suite ran against the Vite **dev** server, so the broken bundle was
never exercised. The production build compiled without error and the app was
completely non-functional when actually deployed.

**Fix.** Replaced the function with the object form, which keeps React's
internals in one chunk with a single-direction dependency:

```js
manualChunks: {
  react: ["react", "react-dom", "scheduler"],
},
```

**Verification.** The admin login route now renders in the production bundle
(`h1` = "Welcome back", split-screen layout intact), and the full responsive
sweep — which now runs against `vite preview` — passes.

### Also fixed: production-only API proxy

`vite preview` does not inherit `server.proxy` in this setup, so the preview
server returned `index.html` for `/api/v1/*` calls. The shared proxy config
is now applied to both `server` and `preview`, and `preview.proxy` is
explicitly set so the sweep exercises the real API.

---

## 3. Responsive & accessibility sweep

`frontend/e2e-responsive/responsive.spec.js` (run with `npm run test:responsive`).

### Coverage

| Suite | Routes | Viewports | Page loads |
|---|---|---|---|
| Customer overflow + content | 18 (`/`, `/menu`, `/search?q=chicken`, `/cart`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/about`, `/contact`, `/services`, `/admin/login`, 404, `/product/:slug`, `/checkout`, `/orders`, `/account`, `/verify`) | 11 | 198 |
| Tap targets | 18 | 5 mobile | 90 |
| Admin overflow + content | 11 (`/admin` + 10 modules) | 11 | 121 |
| **Total** | **29** | **11** | **409** |

Viewports: **320, 360, 390, 430, 600, 768, 820, 1024, 1280, 1440, 1920 px**.

The protected routes (`/checkout`, `/orders`, `/account`, `/verify`) need a
session, so the sweep registers a throwaway customer and signs in before
visiting them. The registration is unique per attempt and retried, because
parallel workers can otherwise collide on the same millisecond and get a 409.

### How overflow is detected

`globals.css` sets `html { overflow-x: clip }`, which hides overflow from `documentElement.scrollWidth`. The sweep therefore walks the DOM and flags any element whose right edge passes the viewport that is **not** inside an intentionally scrollable ancestor (`overflow-x: auto/scroll/hidden/clip`).

### Assertions

1. **No horizontal overflow** on any route at any viewport.
2. **A visible, non-empty `h1`** on every route.
3. **No unexpected console/page errors** (401s are expected for guests).
4. **Tap targets ≥ 24×24 CSS px** — WCAG 2.2 SC 2.5.8 (AA), hard failure.
   **≥ 44×44** — SC 2.5.5 (AAA) / Apple HIG, reported as an advisory.
5. **Accessibility semantics** (separate spec) — see below.

### Accessibility semantics audit

A fourth spec runs a DOM-level semantics probe over all 20 routes and checks:

- the document declares a `lang`;
- exactly one visible `h1`;
- heading levels never skip (`h1` → `h3`);
- every visible image has an `alt` attribute;
- every form control has an accessible name (label / `aria-label` / `aria-labelledby` / `title`);
- every button and link has an accessible name;
- no duplicate `id` attributes;
- no focusable element is hidden from assistive tech via `aria-hidden`.

It found four genuine defects, all now fixed:

| Defect | Fix |
|---|---|
| **Admin overview date-range inputs had no label** — they used `<span class="visually-hidden">From</span>`, which is not a label element, so a screen reader announced two unlabelled date fields | Replaced with real `<label htmlFor>` + matching `id`s (`chart-date-from`, `chart-date-to`) | 
| **`/menu` skipped a heading level** (`h1` → `h3` on each dish card) | `ProductCard`/`ProductGrid` now accept a `headingLevel` prop; the menu and search grids pass `h2` since the grid sits directly under the page heading, while the home rails keep `h3` inside their `h2` section |
| **`/cart` skipped a heading level** (`h1` "Your cart" → `h3` "Your cart is empty") | `headingLevel="h2"` on the empty-cart panel (and the matching error panel) |
| **`/admin/coupons` skipped a heading level** (`h1` "Coupons" → `h3` "No promotions yet") | `headingLevel="h2"` on the empty and error panels |

### Result

**All 4 specs pass.** Zero horizontal overflow across all 345 page loads, and no
accessibility semantics defects. Remaining tap-target advisories are text links
narrower than 44 px wide but ≥24 px tall (e.g. breadcrumb "Home" at 34×44) —
compliant with WCAG AA.

### The production bundle is always rebuilt

The sweep's `webServer` entries run `npm run build && npm run preview` and
`npm start` (backend), both with `reuseExistingServer: false`. Reusing a
server that is already listening would silently test a stale bundle — the
exact class of bug this sweep exists to catch. It bit us twice during this
work.

`npm run test:responsive` first runs `e2e-responsive/free-ports.js`, which
frees ports 5173 and 4000. Playwright checks the webServer port *before*
`globalSetup` runs, so the cleanup has to be an explicit pre-step. Two details
that cost time:

- The port must be **5173**: the backend validates the request `Origin`
  against `CLIENT_URL` (default `http://localhost:5173`) and answers **403**
  for any other origin, which silently breaks every authenticated route.
- `netstat -ano -p tcp` omits IPv6 rows and Vite binds `[::1]`, so the
  cleanup matches the **local** address column of the plain `netstat -ano`
  output instead.

---

## 4. Defects found by the sweep and fixed

| # | Defect | Severity | Fix | File |
|---|---|---|---|---|
| 1 | **404 page had no `h1` at all** — `EmptyState` hardcoded `<h3>`, so a page whose entire body is a state panel had no top-level heading | A11y / SEO | Added a `headingLevel` prop to `EmptyState` and `ErrorState` (default `h3`), and promoted the panel to `h1` on pages where it is the whole page body | `src/components/ui/EmptyState.jsx`, `src/components/ui/ErrorState.jsx`, `src/pages/NotFoundPage.jsx` |
| 2 | Same defect on 3 more customer pages (product error, empty cart, order detail error) | A11y / SEO | `headingLevel="h1"` on each | `src/pages/ProductPage.jsx:63`, `src/pages/CheckoutPage.jsx:164`, `src/pages/OrderDetailPage.jsx:126` |
| 3 | **Duplicate `h1` on every admin page** — the topbar rendered `<h1>` *and* each page rendered its own `h1` | A11y | Demoted the topbar title to `<p class="topbar-title">`; added `line-height: 1.15` to preserve rendering | `src/components/layout/AdminLayout.jsx:399`, `src/components/layout/AdminLayout.css:355` |
| 4 | **`.eyebrow` standalone links were 18 px tall** (below the 24 px AA minimum) — "View full menu", "Shop under ₹150" | A11y | `a.eyebrow { min-height: 24px }`, `44px` under 767 px | `src/styles/globals.css:136` |
| 5 | **Hero "Explore the full menu" link was 21 px tall** | A11y | `.footLink` → `min-height: 24px`, `44px` under 767 px | `src/components/home/Hero.module.css:327` |
| 6 | **"Recover Password" link was 21 px tall** | A11y | `.recover` → `min-height: 24px`, `44px` under 767 px | `src/components/auth/AuthSplit.css` |
| 7 | Password reveal toggles were **38×38** on mobile | A11y | `44×44` under 767 px — both the shared `Input` trailing button and the admin login toggle | `src/components/ui/Input.module.css`, `src/pages/admin/AdminLoginPage.css` |
| 8 | Navbar logo (38 px), cart button (42 px), menu button (42 px) were under the 44 px touch target on mobile | A11y | `44 px` under 767 px | `src/components/layout/Logo.module.css`, `src/components/layout/Navbar.module.css` |
| 9 | Footer navigation links were 32 px tall on mobile | A11y | `44 px` under 767 px, with the column gap tightened to preserve the rhythm | `src/components/layout/Footer.module.css` |
| 10 | Search "clear" button was 36×36 on mobile | A11y | `44×44` under 767 px | `src/pages/SearchPage.module.css` |
| 11 | Product breadcrumbs were 32 px tall on mobile | A11y | `44 px` under 767 px | `src/pages/ProductPage.module.css` |
| 12 | Menu sort `<select>` was 42 px tall | A11y | `44 px` | `src/pages/MenuPage.module.css` |
| 13 | Admin login "Back to store" link was 35 px tall | A11y | `44 px` under 767 px | `src/pages/admin/AdminLoginPage.css` |
| 14 | **Admin pagination overflowed narrow viewports** — `.pagination-list` did not wrap, so once the audit log grew past ~10 pages the button row pushed `.pagination-info` past the viewport | Responsive | `flex-wrap: wrap` + `justify-content: center` on `.pagination-list`; removed `white-space: nowrap` from `.pagination-info` and let it wrap | `src/components/admin/Pagination.css` |
| 15 | **`/account` dashboard links were 21 px tall** — "View all" and "Edit" fell below the 24 px AA minimum | A11y | `.dashboard-card-link` → `min-height: 24px`, `44px` under 767 px | `src/pages/account/AccountPage.css` |
| 16 | **`/orders` status filters were 36 px tall** on mobile | A11y | `.order-filter` → `min-height: 44px` | `src/pages/OrdersPage.css` |
| 17 | **Toast close button was 14×16 px** — react-toastify's own control, too small to tap | A11y | Global override to 32×32 px | `src/styles/globals.css` |
| 18 | **Failed sign-in showed no inline error** — `useAuth.login` raised a toast only and `LoginPage` discarded the returned message, so the failure vanished before it could be read | A11y / UX | `AuthSplit` gained an `error` slot; `LoginPage`, `RegisterPage`, `ForgotPasswordPage` and `ResetPasswordPage` now surface the server message inline with `role="alert"` alongside the toast | `src/components/auth/AuthSplit.jsx`, `src/pages/auth/*.jsx` |
| 19 | **Two `@keyframes shimmer` shared a name** — `FoodThumb.css` defined a transform-based shimmer that overrode the global `background-position` one in `styles/motion.css`. Every skeleton in the app translated sideways instead of shimmering, and at 390 px the translated skeleton read as horizontal overflow | Visual / Responsive | Renamed the FoodThumb keyframes to `foodThumbShimmer`; the global `.skeleton` shimmer is now the one that applies. A repo-wide scan confirms no remaining *conflicting* keyframe names (the `spin` and `fadeIn` duplicates have identical bodies) | `src/components/admin/FoodThumb.css` |
| 20 | **`fade-in` keyframes collided** between `Tabs.module.css` (opacity + slide) and `styles/motion.css` (opacity only) — whichever loaded last won, so the tab panel sometimes lost its slide | Visual | Renamed to `tabFadeIn` | `src/components/ui/Tabs.module.css` |

---

## 5. Customer page bug fixes

| Page | Bug | Fix | File |
|------|-----|-----|------|
| HomePage | Third rail ("Everyday value") rendered `null` on error — silently disappeared | Render `ErrorState` with `onRetry={value.reload}` | `src/pages/HomePage.jsx:88` |
| CartPage | Cart fetch error swallowed — `error`/`refresh` from `useCart()` never destructured, so a failure showed "cart empty" with no retry | Destructure `error` + `refresh`; render `ErrorState` with retry when `error` is set | `src/pages/CartPage.jsx:32-47, 96-113` |
| CheckoutPage | Empty cart used a hand-rolled `<h1>` instead of shared `EmptyState` | Use `EmptyState` with "Explore the menu" action | `src/pages/CheckoutPage.jsx:158-166` |
| CheckoutPage | No empty state when the customer has no saved addresses | Render `EmptyState` ("No saved addresses yet" + "Add address") when `addresses.length === 0` and no load error | `src/pages/CheckoutPage.jsx` |
| CheckoutPage | Order-placement errors were toast-only, no inline retry | Add `orderError` state; show inline error + "Try again" calling `handlePlaceOrder` | `src/pages/CheckoutPage.jsx` |
| MenuPage | Load-more error showed a message with no retry button | Add "Try again" calling `loadMore` | `src/pages/MenuPage.jsx:510-517` |

---

## 6. Responsive media queries added

| Page | Breakpoint added | Change |
|------|------------------|--------|
| ProductPage | `max-width: 899px` | Reduced padding, stacked full-width action buttons, smaller breadcrumbs, 2-col nutrition grid |
| SearchPage | `max-width: 639px` | Reduced header padding, full-width search form, smaller title, tighter content padding |
| MenuPage | (existing) | `min-width: 640px` + `1023px` filter-drawer rules; animations honour `prefers-reduced-motion` |
| globals / Logo / Navbar / Footer / Input / AuthSplit / AdminLogin | `max-width: 767px` | 44 px touch targets |

Standard breakpoint set used across new CSS: `1023px, 767px, 639px, 479px`. No `overflow-x:hidden` used as an overflow fix; no universal horizontal-scroll tables.

---

## 6a. Design system refresh — professional food-ordering platform

The whole interface was re-derived from the **"Food Delivery / On-Demand"**
product profile and the **"Restaurant Menu"** typography pairing in the
design-intelligence database, and applied at the **token level** so all 27
routes inherit the change at once.

### Typography

| Role | Before | After |
|---|---|---|
| Display / headings | Manrope (geometric sans) | **Playfair Display SC** — the culinary small-caps serif that carries the "menu" identity |
| Body / UI | Inter | **Karla** — a grotesque with warmth, better for short reading spans |

The change is visible everywhere at once: the hero headline, the admin login
masthead, every panel and card title, the logo wordmark and the button labels
are all set in the new display face.

### Palette

Derived from the food-delivery profile, keeping the warm neutral family so the
surfaces stay appetising rather than clinical:

| Role | Before | After |
|---|---|---|
| Background | `#FAF7F2` | `#FFF7ED` (warmer cream) |
| Surface / surface-2 / surface-3 | `#FFFFFF` / `#F4F0EA` / `#ECE5DC` | `#FFFFFF` / `#F7EEE2` / `#EFE2D2` |
| Text / muted / subtle | `#211A17` / `#81766E` / `#A6998F` | `#1C1917` / `#6F655D` / `#8D8175` |
| Border / strong / subtle | `#EAE2D9` / `#D9CEC1` / `#F1EBE3` | `#FCEAE1` / `#F0D9C9` / `#FDF3EC` |
| Accent | `#F59E0B` | `#A16207` (saffron gold — the accent the palette pairs with the brand red) |
| Warning | `#D97706` | `#B45309` |
| Focus ring | `#F59E0B` | `#C2410C` (≈4.8:1 on the cream ground) |

Secondary text was darkened from `#81766E` to `#6F655D` so it clears 4.5:1 on
the new background, and the focus ring moved from amber to a deep orange so it
is visible against the brand colour.

### Type scale

Display sizes were raised to match the "large type (32px+)" guidance:
`--text-h1` `clamp(1.9rem, 3.4vw, 2.85rem)` → `clamp(2rem, 3.6vw, 3rem)`,
`--text-h2` → `clamp(1.625rem, 2.8vw, 2.25rem)`, `--text-h3` `1.25rem` → `1.375rem`.

### Decision record

Persisted at `design-system/foodie/MASTER.md` (style, pattern, colours,
typography, effects and the pre-delivery checklist), so the reasoning survives
the session.

### Food-platform features added

The theme change alone would have been a repaint. These are the behavioural
additions that make the product work like a food-ordering platform:

| Feature | What it does |
|---|---|
| **Sticky cart bar** (`components/layout/CartBar.jsx`) | A persistent bottom bar with the running total and a Checkout CTA appears as soon as the basket holds something, so the customer never has to scroll back to the header. Mobile only — the desktop header already carries the cart. Hidden on `/cart` and `/checkout`. A flow spacer reserves the room so the last card is never covered. |
| **Veg / non-veg marker** | The classic square green/red marker on every dish image, with a screen-reader label. Previously only a text badge. |
| **Discount ribbon** | Percentage-off ribbon on the image when a dish is on offer. |
| **Rating pill** | Average rating and review count overlaid on the image. |
| **Inline quantity stepper** | Once a dish is in the basket the Add button becomes a `− / n / +` stepper, so quantities can be adjusted without opening the cart. The last item can be removed from the stepper. |
| **Delivery promise strip** (`components/product/DeliveryStrip.jsx`) | Four chips answering the questions every food platform answers above the fold: delivery time, free-delivery threshold, hygiene rating and cook-to-order. Used on the menu and product pages. |
| **Customer reviews** (`components/product/ProductReviews.jsx`) | The public `GET /api/v1/reviews` endpoint existed on the backend but the frontend never called it. The product page now shows the average rating, a distribution histogram and the most recent approved reviews, with an admin-reply block. Reviews are moderated server-side, so only `approved` ones are returned. |
| **Review seed data** (`backend/scripts/seedReviews.js`) | Creates approved reviews for dishes that appear in real customer orders, so the section can be verified with realistic data. Idempotent — it skips reviews it already created. |

---

## 6b. Marketing pages, header and account area

| Change | Detail |
|---|---|
| **About page** (`/about`) | The story: hero, stats, five values, the market-to-door sequence, and a kitchen section. Shared styles live in `components/marketing/MarketingPage.module.css` so all three pages share one language. |
| **Services page** (`/services`) | Six delivery services, three pricing plans (Everyday / Subscriber / Gathering), and a closing CTA. States plainly that Foodie is a **delivery-only kitchen**. |
| **Contact page** (`/contact`) | Validated enquiry form (name, email, topic, message) with inline errors, plus the four contact channels and a "faster answers" panel. There is no message endpoint, so rather than pretend a message was delivered the form hands it to the visitor's mail client and says so. |
| **Header navigation** | Home · Menu · Services · About · Contact. The redundant "Search" text link is gone — search is now an **icon at every breakpoint**, 44×44 on touch screens. The user menu shows only the **first letter** in its avatar (the full name stays in the `aria-label` and the dropdown). |
| **Account area** | The site header is **hidden** on `/account`, which now goes **full width** with a "Home" link back, and a **My reviews** section listing every review the customer has written, with its moderation state (Published / Awaiting approval) and any reply from Foodie. |
| **My reviews** (`GET /api/v1/reviews/mine`) | New endpoint returning the signed-in customer's own reviews with the dish attached, so "My reviews" has real data behind it. |

### Customer order page — timeline wired properly

The order detail page's timeline was previously rendered **only** while the
order was active; a delivered, cancelled, refunded or failed order fell back
to a plain sentence, so the history of an order was never visible.

It now always renders, and each step is wired to the order's actual
`statusHistory` rather than inferred from the current status:

| Order state | Timeline |
|---|---|
| In progress (`pending_payment` → `out_for_delivery`) | Completed steps filled green, the live step marked current with a pulse, the rest upcoming |
| `delivered` | Every step filled green — the full journey is visible |
| `cancelled` / `payment_failed` / `refunded` | The steps the order actually reached are filled, the rest are struck through, and a terminal banner explains what happened |

Each step also carries the timestamp it was reached, taken from the status
history. The page itself was upgraded to match the rest of the system: the
header is a card with a live indicator, section headings use the display
serif, and the timeline nodes, connectors and terminal states were
redesigned.

### Icons that did not exist

Three icons referenced by dynamic expressions were missing from `Icon.jsx` and
therefore rendered nothing: `x-circle`, `info` and `alert-triangle`. All three
were added. A sweep over every `<Icon name="…">` usage in the app now confirms
that all names resolve.

### Account area

The "Home" link lives in the **account sidebar**, as the first item of the
account navigation, rather than floating above the page heading.

All three marketing pages are explicitly **delivery-only** — the About page lists "No dining room, no seating" as a value, and the Services page says "we never seat guests".

---

## 6c. Performance & security pass

### Data delivery

| Change | Effect |
|---|---|
| **`useApiQuery` cache with stale-while-revalidate** (`src/hooks/useApiQuery.js`) | The customer pages previously refetched everything on every mount. Cached values are now served immediately and revalidated in the background once stale (30 s TTL), and concurrent requests for the same key are de-duplicated into one network call. |
| **HTTP caching on the public catalog** (`backend/src/utils/cache.js`) | `GET /categories`, `/products`, `/products/:slug`, `/products/:slug/related` and `/search` now return a strong `ETag` and `Cache-Control: public, max-age=60, stale-while-revalidate=300`, so repeat visits are answered with a bodyless **304** instead of a fresh MongoDB query. |

Measured on the home → menu → home journey:

| | Before | After |
|---|---|---|
| API calls for the whole journey | 12 | **9** |
| API calls when revisiting the home page | 5 | **0** |

The verified `304` behaviour:

```
GET /api/v1/categories            -> 200  ETag: W/"5d203165-17001"
                                    Cache-Control: public, max-age=60, stale-while-revalidate=300
GET /api/v1/categories            -> 304  (conditional, If-None-Match)
```

### Re-render reduction

- **`useUiStore()` with no selector** subscribed five components to the *entire* store, so any store change re-rendered them. They now select only the function they use (`useUiStore((s) => s.success)`). Fixed in `useAuth.js`, `useCart.js`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx` and `CheckoutPage.jsx`.

### Dead code removed — 3.0 MB

`src/component/`, `src/context/`, the eight legacy page folders (`add`, `Cart`, `Home`, `List`, `MyOrders`, `orders`, `PlaceOrder`, `verify`), `src/assets/assets.js` and the two unused images (`header_img.png` 1.7 MB, `RP17.png` 1.2 MB) were unreferenced by any routed page. The legacy `LoginPopUp` also stored a **JWT and the user's role in `localStorage`**, which is an XSS token-theft pattern — removing the dead code removes the pattern entirely.

`src/` went from **10.3 MB to 7.3 MB**. Lint is now **0 problems** (the 4 remaining warnings were all inside the deleted legacy files).

### Security baseline confirmed

The backend already had a solid posture, verified rather than assumed: `helmet` with an explicit CSP, CORS restricted to `allowedOrigins`, `compression`, `cookieParser`, a `sanitizeInput` middleware covering body/params/query, three rate limiters (global 300/min, auth 10/15 min keyed by `ip:email`, write 60/min), CSRF double-submit protection on every mutating request, zod validation on every route, and httpOnly session cookies. Both `target="_blank"` links already carry `rel="noopener"`.

---

## 7. Admin shell & login

**`AdminLayout.jsx` / `.css`** — breadcrumbs via the shared `Breadcrumbs` component, permission-filtered quick-actions dropdown (Motion, closes on outside click and Escape), collapsed-sidebar CSS tooltips (`data-tooltip`), Motion page entrance honouring `useReducedMotion()`.

**`AdminLoginPage.jsx` / `.css`** — split screen: photographic panel with the editorial heading *"Your kitchen. Your business. One powerful dashboard."* on the left, premium form on the right with show/hide password, inline validation, auth error and loading state. Mobile collapses the photo panel to a compact band with a full-width form. Preserves `useAuth()`/cookies — no fake auth, no role selection.

---

## 7a. Customer page redesign (Phase 5)

All customer pages were refreshed to a single editorial language, with the
composition deliberately varied so no two sections read the same.

| Page | What changed |
|---|---|
| **Home** | Hero rebuilt as an editorial masthead with staggered entrance and a three-up stat strip; category rail gained a double-width lead tile, per-tile index numbers (`01`, `02`…) and a dark "Everything else" closer tile; section rhythm now alternates light → dark → light → dark rather than repeating one template; "Everyday value" switched to the editorial list variant so it no longer mirrors the "Tonight's picks" grid; "How it works" became a numbered ruled sequence |
| **Menu** | Split masthead (title + live stats card); persistent category chip rail with its own scroll; denser grid (up to 5 columns at 1400 px) via a new `dense` variant on `ProductGrid`/`ProductCard`; toolbar, filter pills, filter drawer and load-more retry all retained |
| **Product** | Matted gallery frame, image-counter badge, hover-lift thumbnails and an `AnimatePresence` crossfade on image change; purchase panel promoted to a bordered sticky card; the three facts became a 3-up strip; details accordions restyled |
| **Search** | Masthead split into headline + search field side by side at ≥900 px; stronger results header; `AnimatePresence` crossfade between the loading / error / results branches |
| **Cart** | Line items became an editorial ledger with hairline rules instead of boxed cards; cleaner quantity stepper; sticky order summary |
| **Checkout** | New masthead and a numbered 3-step flow with a connector rail and checkmark states; radio-style address cards with visible focus rings; a dedicated empty state for "no saved addresses" |

Two latent crashes were fixed in the process: the cart error branch and the
checkout empty-cart branch both rendered `<ErrorState>` / `<EmptyState>`
without importing them.

---

## 8. Motion / accessibility already in place

- `motion@^14.11.1` installed; `import { motion, AnimatePresence, useReducedMotion } from 'motion/react'`
- Global `.skeleton` + `[aria-busy="true"]` in `globals.css`; `prefers-reduced-motion` overrides
- Shared UI: `EmptyState`, `ErrorState`, `Button`, `Icon`, `Rating`, `Tabs`, `SmartImage`, `Skeleton`, `RefreshIndicator`, `PageHeader`, `FilterToolbar`, `Breadcrumbs`
- Token system: single source `src/styles/tokens.css` (admin + customer unified); `admin-theme.css` collapsed to sidebar-only
- Exactly one `h1` per page across customer and admin surfaces

---

## 9. Still pending

- **Phase 9 (a11y) is partial** — heading semantics, tap targets, inline auth errors and the heading-count assertions are done and automated, but no screen-reader pass (NVDA/VoiceOver), no focus-order audit and no Lighthouse/Web Vitals run.
- **The cart bar hides itself on `/cart` and `/checkout`** but there is still no dedicated mini-cart drawer; the customer opens the full cart page instead.
- **Reviews are now writable** — a customer who has received the dish gets a review form on the product page. The submission lands as `pending` and only appears publicly once an admin approves it.
- **The client-side data cache is in-memory only** — it makes navigation inside the app instant, but a hard refresh starts cold. A persisted cache (IndexedDB or `localStorage` with a schema version) would also survive a reload; it was left out because it needs an invalidation strategy that does not exist yet.
- **Bundle size** — the entry chunk is ~423 kB (135 kB gzipped) with `motion` split into its own 145 kB chunk. The split is safe because the `react` chunk has no dependency on any other chunk, which is exactly the invariant the original bug violated.
- **The hero photographs are still large PNGs** (`food_26.png` is 200 kB, `food_4.png` 235 kB) and are the LCP element on the home, About, Services and Contact pages. Converting them to WebP/AVIF would cut them by roughly 70%, but that needs an image pipeline that is not in the repo yet.
- CartPage.css (1023/719/420) and CheckoutPage.css (1023/639) still use non-standard breakpoints. Cosmetic only — the layouts are correct at every tested viewport.
- The sweep is inherently load-sensitive: with 3 parallel workers on a single-threaded backend it occasionally needed one retry per route. The sweep now retries a route once before recording a failure, so a genuinely broken route still fails (twice).
- The API lookup used to obtain a live product slug now retries and degrades gracefully (the product route is skipped) instead of failing the whole run.
- `/orders/:id` (order detail) is not in the sweep — it needs a real order id for the signed-in customer, which the sweep has no way to create without placing a paid order.

---

## 10. Notes

- No backend endpoints, auth behaviour, or cart/payment contracts changed.
- No fake data, no artificial loading delays, no Tailwind classes, no new npm dependencies.
- Customer data layer remains the hand-rolled `useApiQuery` + `useCart` (TanStack Query for the cart only); migrations were left alone to avoid contract risk.
- The responsive sweep runs as a **separate** Playwright project (`e2e-responsive/` + `playwright.responsive.config.js`) so the functional suite stays fast.
