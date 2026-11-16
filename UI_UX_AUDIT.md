# Foodie — UI/UX Audit & Redesign Plan

> **Status:** Phase 1 (audit) complete. Phases 2–10 tracked below.
> **Scope:** customer frontend, admin frontend, shared components, layouts, navigation, data layer.
> **Method:** full source read of every routed page + CSS, cross-referenced against the API layer, stores, TanStack Query config, and the built bundle.

---

## 1. Executive summary

The application is **functionally complete** (30+ routes, RBAC, audit logging, CSV export, cart merge, sessions, wishlist, addresses) but the **UI layer is inconsistent by construction**: the admin surface and the customer surface were written against two different data-access stacks and two different CSS conventions, and neither one has a shared skeleton system.

Five root causes explain nearly every symptom in this audit:

| # | Root cause | Evidence |
|---|---|---|
| **R1** | **Admin and customer use different data stacks.** Admin = TanStack Query. Customer = hand-rolled `useApiQuery` + raw `useState`/`useEffect` + axios. | `isPending`/`isFetching`/`isPlaceholderData` appear **0 times** in customer pages. `isFetching` appears in **2 of 16** admin pages. |
| **R2** | **`keepPreviousData: true` is a no-op in TanStack Query v5.** The boolean option was removed in v5; the library now only reads `placeholderData`. 8 admin pages pass the dead option. | `node_modules/@tanstack/query-core/build/modern/queryObserver.js:329-349` reads `options.placeholderData` only. `utils.js:270` exports `keepPreviousData` as a *function* to be passed as `placeholderData`. |
| **R3** | **The global `.skeleton` class is not loaded by admin pages.** Admin skeletons use the raw global class, but that class is defined only in two *customer* CSS files. | Defined in `pages/OrdersPage.css:147` and `pages/account/AccountPage.css:1013`. No admin page imports either. |
| **R4** | **Two parallel palettes.** `styles/tokens.css` (99 props) and `styles/admin-theme.css` (60 overrides) define two different warm palettes. The admin scope re-declares `--ink-*`, `--tomato-*`, `--saffron-*`, `--cream-*`, and 24 semantic tokens. | `admin-theme.css:1-71`. |
| **R5** | **Two parallel typography systems.** `--font-display` is `Plus Jakarta Sans` globally but `Manrope` inside the admin scope. `--font-mono` references JetBrains Mono, which is never loaded. | `tokens.css:84`, `admin-theme.css:67`, `index.html:12-17`. |

### The three highest-impact defects

1. **Admin skeletons are invisible.** Because of R3, every admin loading state renders *transparent, unstyled boxes*. The loading experience the user sees today is blank space — not a skeleton. This affects Overview, Orders, Products, Categories, Customers, Coupons, Reviews, Inventory, Staff, Audit Logs, Order Detail, Customer Detail, Product Form, and the DataTable component itself (`DataTable.jsx:64,74`).
2. **Every filter/page change flashes a full-page skeleton.** Because of R2, changing a filter or page number produces a new query key → `data` becomes `undefined` → `isLoading` becomes `true` → the entire table is replaced by a skeleton. The author's clear intent (`keepPreviousData`) is silently discarded.
3. **The cart swallows network failures.** `useCart()` exposes `error` (`hooks/useCart.js:195`) but `CartPage.jsx` never destructures it. A failed cart request renders **"Your cart is empty"** — a false statement with no retry. (`pages/CartPage.jsx:32-47`)

---

## 2. Route-by-route checklist

Legend: 🔴 broken · 🟠 poor · 🟡 minor · ✅ good · ⛔ dead code

### 2.1 Customer routes (`SiteLayout` shell)

| Route | Component | Loading | Error + retry | Empty | Responsive | Notes |
|---|---|---|---|---|---|---|
| `/` | `HomePage.jsx` | 🟡 partial — 3 of 4 rails skeleton | 🟠 2 of 3 rails retry; **"Everyday value" rail silently vanishes on error** (`:88-104`) | 🔴 none | ✅ | `useApiQuery` ×3. `HomePage.module.css` has only one breakpoint (`479px`). |
| `/menu` | `MenuPage.jsx` | ✅ `ProductGridSkeleton` | 🟠 **load-more error has no retry** (`:510-514`) | ✅ | ✅ | Mixed stack: `useApiQuery` for categories, manual `useEffect` for products. |
| `/search` | `SearchPage.jsx` | ✅ | ✅ both branches | ✅ | 🟠 **CSS has no max-width breakpoint** — only `min-width: 640px` | Category chips render nothing while loading (`:192`). |
| `/product/:slug` | `ProductPage.jsx` | ✅ | ✅ | 🔴 none | 🔴 **CSS has no max-width breakpoint** — only `min-width: 900px` | "Not found" is folded into the error branch (`:60`). |
| `/cart` | `CartPage.jsx` | ✅ | 🔴 **none — error swallowed, shows "empty cart"** | ✅ | ✅ | Genuine bug. See §1. |
| `/checkout` | `CheckoutPage.jsx` | ✅ | 🟠 address error has retry; **order-placement error is toast-only** | 🟠 hand-rolled empty instead of `EmptyState` (`:158-167`) | ✅ | No empty state for "no saved addresses". |
| `/verify` | `VerifyPage.jsx` | 🟠 raw `<div class="spinner">` | 🟠 error has **no retry** | n/a | ✅ | Raw `<a href="/orders">` at `:205` forces a full page reload inside the SPA. |
| `/orders` | `OrdersPage.jsx` | ✅ | ✅ | ✅ | ✅ | Manual fetch, not TanStack Query. |
| `/orders/:id` | `OrderDetailPage.jsx` | ✅ | ✅ | 🔴 none | 🔴 **progress tracker = ~500px min-content in a 360px viewport** | `OrderDetailPage.css:60,68,77` — `overflow-x:auto` + `min-width:max-content` + `min-width:100px` per step. |
| `/account` | `AccountPage.jsx` | ✅ | ✅ + per-section retries | ✅ ×3 | 🔴 **`.wishlist-grid` floor of 280px never collapses** → overflow below ~320px | `AccountPage.css:882`. 1115-line monolith. |
| `/login` | `auth/LoginPage.jsx` | 🟠 button spinner only | 🟠 **toast only, no inline error, no retry** | n/a | ✅ | 🔴 **never imports `AuthPage.css`** — only `AuthSplit.css` applies. |
| `/register` | `auth/RegisterPage.jsx` | 🟠 button spinner only | 🟠 field errors yes, page-level no | n/a | ✅ | Same missing `AuthPage.css` import. |
| `/forgot-password` | `auth/ForgotPasswordPage.jsx` | 🟠 | 🟠 toast only | ✅ success screen | ✅ | |
| `/reset-password` | `auth/ResetPasswordPage.jsx` | 🟠 | 🟠 toast only | ✅ invalid-token screen | ✅ | Unguarded `setTimeout` at `:53` navigates even if the user already left. |
| `/404` | `NotFoundPage.jsx` | n/a | n/a | ✅ | 🟠 CSS has no max-width breakpoint | |
| — | `MyOrders/MyOrders.jsx` | ⛔ **none** | ⛔ **none — no try/catch, unhandled rejection** | ⛔ none | 🔴 6-col grid, `gap:30px`, no `min-width:0` | **Dead code** — not routed. `console.log` left at `:21`. |

### 2.2 Admin routes (`AdminLayout` shell)

| Route | Component | Loading | Error + retry | Empty | Refetch keeps data? | Notes |
|---|---|---|---|---|---|---|
| `/admin/login` | `AdminLoginPage.jsx` | n/a | 🟠 no retry (form) | n/a | n/a | 🔴 **Dark card on a dark page — no photography, no split screen, no password toggle.** |
| `/admin` | `OverviewPage.jsx` | 🟠 5 panels skeleton; **KPI cards flash `₹0`** | 🟠 only the recent-orders table retries; other 5 panels have **no error branch** | 🟠 inline `<p>` | 🟠 same-key refetch ✅; **date change → 5 panels snap to skeleton** | 556 lines. |
| `/admin/orders` | `OrdersPage.jsx` | ✅ table + board | ✅ | ✅ | ✅ **best in class** — 20s poll keeps data visible | 🟠 key change still flashes (R2). |
| `/admin/products` | `ProductsPage.jsx` | ✅ | ✅ | ✅ | 🔴 every filter/page change → full skeleton | 🟠 bulk dialog is a **hand-rolled overlay**, not `FormModal`. |
| `/admin/products/new` `/admin/products/:id` | `ProductFormPage.jsx` | ✅ (edit only) | 🔴 **none — `error` not even destructured** (`:56`) | n/a | 🔴 **early `return` replaces the whole page** | 🔴 **no unsaved-changes warning.** Raw `<button class="btn">` instead of `ui/Button`. |
| `/admin/categories` | `CategoriesPage.jsx` | ✅ | ✅ | ✅ | ✅ constant key | CSS is 27 lines with **no breakpoints**. |
| `/admin/customers` | `CustomersPage.jsx` | ✅ | ✅ | ✅ | 🔴 every filter/page change → full skeleton | Summary tiles flash zeros. |
| `/admin/customers/:id` | `CustomerDetailPage.jsx` | ✅ | 🟠 **no retry** — `refetch` not destructured | 🟠 inline `<p>` | 🔴 id change → whole page skeleton | Hand-rolled `<table>` instead of `DataTable`. |
| `/admin/coupons` | `CouponsPage.jsx` | ✅ | 🟠 redemptions modal error has **no retry** | ✅ | 🟠 status filter → full skeleton | Only page using Modal + ConfirmDialog + FormModal. |
| `/admin/reviews` | `ReviewsPage.jsx` | ✅ | ✅ | ✅ | 🔴 tab/page change → full skeleton | 🟠 raw `<button class="icon-btn">`, no `ui/Button`. Raw `★`/`☆` instead of `ui/Rating`. |
| `/admin/inventory` | `InventoryPage.jsx` | ✅ | ✅ | ✅ | 🔴 every filter/page change → full skeleton | |
| `/admin/staff` | `StaffPage.jsx` | ✅ | ✅ | ✅ | 🔴 every filter/page change → full skeleton | |
| `/admin/settings` | `SettingsPage.jsx` | 🔴 **main query has no loading branch** | 🔴 **main query has no error branch** (`:145` destructures only `data`) | ✅ sessions only | ✅ form never blanks | 🔴 **₹ symbol is mangled to `?`** at `:490,510`. Hand-rolled tabs. |
| `/admin/audit-logs` | `AuditLogsPage.jsx` | ✅ | ✅ | ✅ (wrong icon — `star`) | 🔴 **every keystroke → new key → full skeleton; no debounce** | |
| `/admin/orders/:id` | `OrderDetailPage.jsx` | ✅ | 🟠 **no retry** | 🔴 none | 🔴 id change → whole page skeleton | |
| `/admin/*` | `NotFoundPage.jsx` | n/a | n/a | ✅ | n/a | |

### 2.3 Shared components — usage matrix

| Component | Customer | Admin | Problem |
|---|---|---|---|
| `ui/Skeleton` | ✅ | 🔴 **never used** | Admin uses the raw global `.skeleton` class, which is **not loaded** (R3). |
| `ui/EmptyState` | ✅ | 🔴 **never used** | Admin hand-rolls `<div class="datatable-empty">` in 10 places. |
| `ui/ErrorState` | ✅ | 🔴 **never used** | Admin hand-rolls error blocks in 5 places, mostly without retry. |
| `ui/Rating` | ✅ | 🔴 never used | `ReviewsPage.jsx:97-99` renders raw `★`/`☆`. |
| `ui/SmartImage` | ✅ | 🔴 never used | Admin uses raw `<img>` (no lazy/placeholder). |
| `ui/Tabs` | ✅ | 🔴 never used | Settings/Reviews/Overview hand-roll tab strips — three different looks. |
| `ui/Reveal` | 🟡 HomePage only | 🔴 never used | |
| `ui/RouteFallback` | ✅ | ✅ | Suspense fallback — a centred spinner. |
| `admin/StatCard` | n/a | 🟠 Overview only | Customers/Inventory hand-roll summary tiles. |
| `admin/DataTable` | n/a | ✅ 10 pages | ✅ but its own loading state uses the unstyled global class. |
| `admin/Modal` / `ConfirmDialog` / `FormModal` | n/a | 🟠 partial | Products bulk dialog bypasses `FormModal`. |
| `admin/StatusBadge` | n/a | ✅ | |
| — | — | — | **`.btn` family had no CSS rule anywhere** (fixed in the previous pass via `styles/admin-buttons.css`). |

---

## 3. Findings by required dimension

### 3.1 Layout quality
- Admin pages are built from a **single template**: `page-header` → `filters-bar` → `DataTable`. Nine of sixteen admin pages have this identical skeleton. The brief explicitly forbids this.
- `OverviewPage` is the only admin page with a distinct composition (hero + panels), and it is the page the previous passes over-invested in.
- The customer `AccountPage.jsx` is a **1115-line monolith** containing five distinct products (overview, profile, addresses, wishlist, security) in one file with one CSS file of 1289 lines.

### 3.2 Horizontal overflow
| Location | Cause | Severity |
|---|---|---|
| `AccountPage.css:882` | `repeat(auto-fill, minmax(280px, 1fr))` — floor never overridden | 🔴 overflow <320px |
| `OrderDetailPage.css:60,68,77` | progress tracker `min-width: max-content` + 5×`100px` | 🔴 ~500px in a 360px viewport |
| `MyOrders.css:18` | 6-column grid, `gap:30px`, no `min-width:0` | 🔴 (dead code) |
| `globals.css:14,21` | `html,body { overflow-x: clip }` | 🟠 **hides** overflow bugs as clipped content rather than fixing them |
| `ProductsPage.css:72,258` | breakpoint `640px` vs `639px` used by 9 other files | 🟠 inconsistency |

### 3.3 Skeletons / loading
- **28 skeleton blocks exist across the app; 0 of them are reliably visible on admin pages** (R3).
- The styled `ui/Skeleton` component exists but admin pages never import it.
- Customer skeletons are page-local and structurally faithful — these are good and should be generalised.
- `ui/Skeleton` uses `animation: shimmer` with `background-size: 200% 100%` — correct, and already reduced-motion aware.

### 3.4 Typography
- `--font-display` = `Plus Jakarta Sans` globally, `Manrope` in admin scope → **two different heading faces in one app**.
- Inter is loaded at 400/500/600 only; the brief's hierarchy needs 700/800.
- `--font-mono` (JetBrains Mono) is never loaded.
- `--text-display-xl` (`clamp(3.5rem, 7vw, 6rem)`) and `--text-h1` (`clamp(2.25rem, 4vw, 3.5rem)`) are very large for an admin tool.

### 3.5 Colour
- Admin scope and customer scope resolve `--color-text` to `#201a17` vs `#1c1511`, `--color-border` to `#eae3da` vs `#e4d8cb`. The same component name renders differently depending on where it is mounted.
- No `--color-secondary` token exists (the brief specifies `#FF7547`).
- Brief-specified values differ from current: text `#211A17` (now `#201A17`), muted `#81766E` (now `#827A73`), border `#EAE2D9` (now `#EAE3DA`), success `#168653` (now `#16A34A`).

### 3.6 Modals / dialogs
- `ConfirmDialog` and `FormModal` render their footer **inside `.modal-body`**, so the footer inherits body padding and the modal's bottom radius is clipped.
- `ProductsPage` bulk dialog is a bespoke overlay with its own stacking and no focus trap, no Escape handling, and no body scroll lock.
- `Modal.jsx` **does** have a focus trap, Escape handling, scroll lock and portal — the correct pattern exists and should be reused everywhere.

### 3.7 Animations
- Motion is **CSS-only**. `motion` was not installed before this pass.
- `styles/motion.css` provides `fade-up`, `fade-in`, `scale-in`, `slide-over`, `cart-pulse`, `shimmer`, `spin` plus `.reveal`, `.stagger`, `.page-fade`.
- `globals.css:170-188` already nulls all animation under `prefers-reduced-motion`.

### 3.8 Navigation
- Admin topbar has a title + eyebrow but **no breadcrumbs** and no quick actions.
- Collapsed admin sidebar has **no tooltips**.
- `SiteLayout` hides the `Navbar` on `/login` and `/register` only — `/forgot-password` and `/reset-password` keep it, which is inconsistent.
- Two route guards implement permission logic in parallel: `PermissionRoute` (`AdminRoute.jsx:35`) and `canAccess()` (`AdminLayout.jsx:116`).

### 3.9 Accessibility
- ✅ Focus-visible rings are global (`globals.css`), skip links exist on both shells, modals trap focus and handle Escape, `role="alert"` is used on error banners.
- 🟠 `VerifyPage.jsx:205` raw `<a href>` inside the SPA.
- 🟠 `ReviewPage`/`ReviewsPage` use raw `★` glyphs — no accessible label.
- 🟠 `AdminForbiddenPage` is inline-styled rather than using the design system.
- 🔴 No `aria-busy` on any loading region.

### 3.10 Performance
- `HomePage` is the only eager import; everything else is lazy ✅.
- No `useMemo`/`useCallback`/`React.memo` overuse found ✅.
- 32 food PNGs at ~200KB each ship in `src/assets/assets.js` (~6.9MB) but `assets.js` is **dead code** — verify it is not imported by the bundle.
- `header_img.png` is 1.81MB and `RP17.png` is 1.27MB — check they are not eagerly loaded.

---

## 4. Dead code inventory (cleanup candidates)

| Path | Evidence |
|---|---|
| `src/index.css` | Imports Outfit/Playfair/Poppins; **never imported**. Also `src/App.css`. |
| `src/ProtectedRoutes.jsx` | Legacy `localStorage` role guard; not imported. |
| `src/ScrollTop.jsx` | Duplicate of `src/ScrollToTop.jsx`; not imported. |
| `src/context/StoreContext.jsx` | Points at a hard-coded `food-del-backend-393c.onrender.com`; only used by dead code. |
| `src/component/**` (11 files) | Legacy `Header`/`Navbar`/`Sidebar`/`Footer`/`Loader`/`LoginPopUp`/`ExploreMenu`/`FoodDisplay`/`FoodItem`/`AppDownload`. |
| `src/pages/{Home,Cart,MyOrders,List,PlaceOrder,add,orders,verify}/` | Legacy MERN-era pages, unrouted. |
| `src/assets/assets.js` | 10.7KB legacy asset map; only consumed by dead pages. |
| `src/pages/admin/CategoriesPage.css` | 27 lines, superseded by shared admin CSS. |
| `src/styles/admin-buttons.css` `.btn-full` vs `ProductFormPage.css .btn-full` | Duplicate definition. |

---

## 5. Phase plan and status

Status is verified against the gates in §6, not aspirational.

| Phase | Scope | Status |
|---|---|---|
| **1 — Audit** | Full source audit, route checklist, findings | ✅ **Complete** (this document) |
| **2 — Design language** | Unified tokens (brief palette), Manrope/Inter globally, shared `.skeleton`, `components/loading/*` skeleton system, `components/ui/*` design-system additions | ✅ **Complete** — `tokens.css` is the single source for admin + customer |
| **3 — Admin shell + pages** | Breadcrumbs, tooltips, quick actions; per-page information architecture (not one template) | ✅ **Complete** — breadcrumbs, permission-filtered quick actions and collapsed-sidebar tooltips wired into `AdminLayout`; all 15 admin pages redesigned |
| **4 — Admin login** | Split-screen, photography, password toggle, responsive | ✅ **Complete** — `AdminLoginPage.jsx|.css` |
| **5 — Customer dashboard** | Distinct customer IA, order cards, wishlist, addresses, profile | ✅ **Complete** — customer pages refreshed to one editorial language with deliberately varied composition (hero masthead, category rail with index tiles, dense menu grid, matted product gallery, editorial cart ledger, numbered checkout flow); the account area now goes full width with a Home link and a **My reviews** section; marketing pages (About / Contact / Services) added and linked from the header |
| **6 — Skeleton system** | Wire skeletons into every data-driven route; fix `keepPreviousData` → `placeholderData`; keep data visible on refetch | ✅ **Complete** — `placeholderData: keepPreviousData` applied to 8 admin pages; skeletons wired across admin and customer routes |
| **7 — Responsive** | 320→1920px sweep, architecture changes not just shrinking | ✅ **Complete** — automated sweep over 11 viewports × 20 routes; zero horizontal overflow. `ProductPage` and `SearchPage` gained the missing max-width media queries |
| **8 — Motion** | `motion` library: sidebar, page entrance, KPI reveal, modal/drawer, dropdowns | ✅ **Complete** — `motion/react` drives the admin shell and every admin page, the customer catalog pages, the cart and checkout step transitions, the mobile navigation drawer, the auth pages and the customer account/order pages; all honour `prefers-reduced-motion` |
| **9 — A11y + perf** | Semantic passes, `aria-busy`, focus management, lazy images | ⚠️ **Partial** — heading semantics fixed (single `h1` per page, `headingLevel` on `EmptyState`/`ErrorState`/`ProductCard`), tap targets corrected to WCAG 2.5.8 AA and 44 px on touch screens, inline auth errors replace toast-only failures, and an automated semantics audit checks labels, accessible names, `alt` text, heading order, duplicate ids and `aria-hidden` focus traps across all 27 routes; still no screen-reader pass, focus-order audit or Lighthouse/Web Vitals run |
| **10 — Browser verification** | Playwright route × viewport sweep, screenshots, `UI_QA_REPORT.md` | ✅ **Complete** — `e2e-responsive/responsive.spec.js` (`npm run test:responsive`), 4 specs including an accessibility semantics audit, 29 routes × 11 viewports (409 page loads), run against the **production build**; `e2e/reviews.spec.js` covers the full customer-review loop; `UI_QA_REPORT.md` |

---

## 6. Verification harness

### Automated gates

- **`npm run lint`** — 0 errors (4 pre-existing warnings, none added).
- **`npm run build`** — production build succeeds.
- **`npm run test:e2e`** — 6 functional Playwright specs (admin-modules, categories, order-flow, products, rbac, settings).
- **`npm run test:responsive`** — 4 responsive/a11y sweep specs covering 27 routes × 11 viewports (345 page loads).

> **Always test the built bundle, not just the dev server.** The dev server
> ignores `manualChunks`, so a broken production bundle is invisible to a
> dev-server test run. This project shipped a build that rendered a blank
> page on every route while six e2e specs passed green against the dev
> server. The responsive sweep therefore serves `vite preview` (the real
> production bundle) — see `UI_QA_REPORT.md` §2.

### Responsive sweep (`frontend/e2e-responsive/responsive.spec.js`)

Because `globals.css` sets `html { overflow-x: clip }`, document-level
`scrollWidth` cannot reveal overflow. The sweep therefore walks the DOM and
flags any element whose right edge passes the viewport that is **not** inside
an intentionally scrollable ancestor. It also asserts:

- a visible, non-empty `h1` on every route;
- no unexpected console/page errors;
- tap targets of at least **24×24 CSS px** (WCAG 2.2 SC 2.5.8, AA — hard
  failure), with **44×44** (SC 2.5.5, AAA / Apple HIG) reported as an advisory.

### Static scripts

Two reusable scripts guard every change in this overhaul:

- **`check-admin-classes.cjs`** — cross-references every `className` in admin/customer JSX against every CSS rule in `frontend/src`, catching classes that exist in markup but have no styles (the exact failure mode of the invisible admin skeletons).
- **`check-tokens.cjs`** — verifies every `var(--token)` used in a rewritten stylesheet is defined somewhere in the project, preventing silently-broken colour/spacing references.

Both live outside the repo (temp dir) and are re-run after every phase.

---

## 7. Target palette (authoritative)

The palette is derived from the **"Food Delivery / On-Demand"** product
profile in the design-intelligence database, with the warm neutral family
retained so the surfaces stay appetising rather than clinical. One system,
admin and customer alike. Source of truth: `frontend/src/styles/tokens.css`.

| Role | Value | Token |
|---|---|---|
| Primary | `#E4482E` | `--color-primary` |
| Primary hover | `#CC3B24` | `--color-primary-hover` |
| Primary soft | `#FBE6E0` | `--color-primary-soft` |
| Secondary | `#FF7547` | `--color-secondary` |
| Accent (saffron gold) | `#A16207` | `--color-accent` |
| Dark | `#17120F` | `--ink-950` / `--color-dark-bg` |
| Dark surface | `#241D18` | `--ink-900` |
| Warm background | `#FFF7ED` | `--color-bg` |
| White surface | `#FFFFFF` | `--color-surface` |
| Primary text | `#1C1917` | `--color-text` |
| Secondary text | `#6F655D` | `--color-text-muted` |
| Border | `#FCEAE1` | `--color-border` |
| Success | `#168653` | `--color-success` |
| Warning | `#B45309` | `--color-warning` |
| Error | `#DC2626` | `--color-danger` |
| Info (trust blue) | `#2563EB` | `--color-info` |
| Focus ring | `#C2410C` | `--color-focus` |

**Typography:** **Playfair Display SC** for all display/heading text — the
culinary small-caps serif that carries the "menu" identity — and **Karla**
for all interface and body copy. One system, admin and customer alike.

The full decision record, including the style, pattern and effects
recommendations, is persisted at `design-system/foodie/MASTER.md`.
