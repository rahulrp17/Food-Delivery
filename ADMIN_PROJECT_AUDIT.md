; storefront food cards use a fixed 2 / 4 / 5 column grid with container-query density (§15.16)# Foodie Admin Pro — Phase 1 Project Audit

**Repository:** `C:\Users\Rahul\Documents\New folder\Mission 1\MERN\Food Delivery`  
**Audit date:** 2026-11-09  
**Scope:** Existing frontend, backend, database models, auth, admin functionality, security, performance, testing, and documentation.  
**Change policy:** Read-only audit. No application code or database state was changed while producing this document.

> **Resolution status (2026-11-16).** The legacy surfaces this audit flagged as
> critical/high are now **removed**:
> - The pre-v1 API (`/api/user`, `/api/food`, `/api/cart`, `/api/orders`) and its
>   controllers, legacy models (`foodmodel`, `orderModel`, `userModel`) and JWT
>   middleware are deleted. Retired paths answer `410 LEGACY_API_REMOVED`.
>   This closes the unauthenticated `POST /api/orders/verify` finding, the
>   client-trusted legacy amount/price finding and the legacy-`tokenVersion`
>   finding, and removes the second schema that shared the `orders` collection.
> - The retired standalone `admin/` app is deleted (it hardcoded an external
>   backend with no login integration).
> - `backend/node_modules` is untracked and purged from git history; the
>   `" - Copy"` files are removed.
> - `LEGACY_API_ENABLED` is gone from the env schema.
> The findings below are kept as the historical record; see §15.3 for the
> current gap list.

---

## 1. Executive Summary

The project is a MERN food-delivery application with a **functional integrated admin module** at `/admin/*` inside the customer-facing Vite application. The active admin is no longer only a basic CRUD dashboard: it already includes server-paginated tables, filters, charts, order status transitions, customer suspension/role controls, coupon management, review moderation, and store settings.

The main risks and gaps are:

1. **Critical legacy API exposure remains.** The old `/api/*` routes are still mounted. In particular, `POST /api/orders/verify` is unauthenticated and can mark an order paid or delete it using only an order ID.
2. **Legacy payment/order logic still trusts client prices and amounts.**
3. **The retired standalone `admin/` application is still in the repository** and points to a hardcoded external Render backend.
4. **No backend audit log** exists for administrator mutations, despite the documented architecture requiring one.
5. **No granular admin RBAC.** Only `user` and `admin` roles exist; there are no manager/product/order roles or explicit permissions.
6. **Major premium-dashboard features are missing or partial:** date-range analytics and export, real live-order monitoring, Kanban/drawer operations, bulk actions, product galleries, category drag sorting, customer CRM depth, coupon analytics/redemption history, review replies/reporting, inventory UI/history, staff management, activity logs, and notifications.
7. **Documentation is partly stale.** `ARCHITECTURE.md`, `DESIGN.md`, and `PROJECT_AUDIT.md` contain claims that do not match the current working tree.
8. **Repository hygiene is poor.** Tracked `node_modules`, many legacy duplicate files, 13 `" - Copy"` files, temporary diagnostic scripts, and uncommitted source changes are present.

**Overall assessment:** The active admin foundation is usable and should be extended rather than rebuilt. Phase 2 should preserve the current `/api/v1` and `/admin/*` architecture, remove/quarantine legacy surfaces safely, and then deepen the product in priority order.

---

## 2. Current Architecture

### 2.1 Applications and folders

| Path | Role | Status |
|---|---|---|
| `frontend/` | Active React 19 + Vite application, including customer and admin routes | Active |
| `backend/` | Active Express 5 ESM API, `backend/src/**` is the current codebase | Active |
| `admin/` | Old standalone Vite admin app with `/add`, `/list`, `/orders` | Legacy/obsolete |
| `frontend/src/pages/admin/` | Current integrated admin UI | Active |
| `frontend/src/components/admin/` | Current admin UI components | Active |
| `frontend/src/component/` | Old singular customer component tree | Legacy/dead |
| `frontend/src/pages/{add,List,orders,Home,MyOrders,PlaceOrder,verify,Cart}/` | Old unreachable pages or duplicates | Legacy/dead |
| `backend/src/controllers/{cartController,foodController,orderController,userController}.js` | Legacy controllers | Legacy/live through `/api/*` |
| `backend/src/models/{foodmodel,orderModel,userModel}.js` | Legacy models; `orderModel` shares the `orders` collection | Legacy/important for compatibility |
| `backend/src/routes/{cartRoutes,foodRoutes,orderRoutes,userRoute}.js` | Legacy route modules | Legacy/live through `/api/*` |

### 2.2 Active stack

**Frontend**
- React 19, React Router 7, Vite 6, TanStack Query 5, Zustand 5, Zod 4, Axios, React Toastify, Tailwind CSS 4 (limited use; the design system is primarily CSS variables).
- Custom SVG charts; no chart library.
- Playwright for E2E.
- Admin routes are lazy-loaded.

**Backend**
- Express 5, Mongoose 8, MongoDB, Zod, JWT, bcrypt cost 12, Stripe 18, Helmet, CORS, compression, Pino, Multer, express-rate-limit.
- New API mounted under `/api/v1`.
- Legacy API mounted under `/api/user`, `/api/food`, `/api/cart`, `/api/orders`.
- Stripe webhook mounted before the global JSON parser at `/api/v1/payments/webhook`.

### 2.3 Routing

Customer routes include:
`/`, `/menu`, `/search`, `/product/:slug`, `/cart`, `/checkout`, `/verify`, `/orders`, `/orders/:id`, `/account`, `/login`, `/register`, `/forgot-password`, `/reset-password`.

Admin routes:
`/admin/login`, `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/:id`, `/admin/categories`, `/admin/orders`, `/admin/orders/:id`, `/admin/customers`, `/admin/customers/:id`, `/admin/coupons`, `/admin/reviews`, `/admin/settings`, and `/admin/*`.

Admin protection is implemented in React through `AdminRoute` and `AdminLoginGuard`, but **all real authorization is also enforced by backend middleware** (`authenticate` + `requireRole("admin")`).

---

## 3. Existing Admin Functionality

### 3.1 Navigation and shell

Current sidebar sections:

1. Overview
2. Products
3. Categories
4. Orders
5. Customers
6. Coupons
7. Reviews
8. Settings

Implemented shell features:
- Dark fixed sidebar with active route indicator.
- Responsive off-canvas mobile drawer with overlay and hamburger.
- Skip link and accessible landmarks.
- Topbar with route-derived page title, order search, admin name/role, and sign-out.
- View Store and Sign Out actions.
- Lazy-loaded admin pages and a route transition wrapper.

Gaps:
- No notification center.
- No quick actions or administrator profile menu.
- Global search only searches orders and causes a full page reload.
- No collapsible desktop sidebar with tooltips.
- No breadcrumb navigation.

### 3.2 Overview

Implemented:
- Revenue, orders, active orders, and customer KPIs.
- Today revenue/order/active summary.
- Revenue and order charts with 7-day/30-day client-side display.
- Order status donut and legend.
- Top products, recent customers, recent orders.
- Manual refresh; TanStack Query caching.

Gaps:
- No true backend date-range filtering; backend returns a fixed 30-day series.
- No previous-period endpoint or accurate period comparison.
- No average-order-value KPI card.
- No payment-method, category, or low-stock analytics.
- No CSV export, smart alerts, or recent activity feed.
- No live polling or controlled refresh interval.
- Donut chart includes a visually hidden tabular fallback.

### 3.3 Products

Implemented:
- Server-paginated list with search, category, availability, and low-stock filters.
- Create/edit/delete with Zod validation.
- Multi-image gallery (max 8) with keyboard-accessible upload controls.
- Price, compare-at price, stock, prep time, veg, featured, bestseller, and new-arrival fields.
- Availability controls and soft deletion.
- Bulk stock/availability/category updates and bulk delete.
- Per-row duplicate action that creates an inactive draft with a unique slug and zero stock.

Gaps:
- No archive/activate workflow.
- No image ordering, alt text, or client-side image compression.
- No inline stock adjustment UI, although `PATCH /admin/products/:id/stock` exists.
- No inventory history UI.
- No column sorting.
- Image-upload zones are keyboard-activatable buttons; client-side compression and alt-text editing are still missing.

### 3.4 Categories

Implemented:
- Create, edit, delete modal.
- Name, slug, description, image URL, sort order, active state.
- Product count column.

Gaps:
- No drag-and-drop ordering or reorder endpoint.
- No direct image upload.
- No active/inactive quick toggle in the table.
- No category preview or drill-down to products.
- Category deletion safety depends on backend validation.

### 3.5 Orders

Implemented:
- Server-paginated table.
- Status tabs with counts.
- Payment status, search, and date filters.
- Next-step quick actions for confirmed → preparing → out for delivery → delivered.
- Order detail page with customer, address, items, pricing, progress stepper, status history, valid status transitions, optional status notes, and cancellation with a required reason.
- Backend validates status transitions and restocks/refunds on cancellation.
- Legacy title-case statuses are normalized to canonical statuses in the current working tree.

Gaps:
- No Kanban board, order drawer, or live operations board.
- No automatic polling or WebSocket order notifications.
- No bulk status actions.
- No invoice/receipt print or download.
- No driver assignment, ETA editing, or customer-contact shortcuts.
- Timeline `byUserId` is not resolved to a human-readable administrator name.
- No separate persistent internal admin note field.
- Payment refunds are only reachable through allowed status transitions, not a dedicated refund workflow.

### 3.6 Customers

Implemented:
- Server-paginated customer list.
- Summary cards for total, active, new this month, and lifetime revenue.
- Search, role, status, and sort filters.
- Customer detail page with profile, activity metrics, order history, role change, and suspend/reactivate.
- Backend guards prevent self-demotion and self-suspension.

Gaps:
- No notes, tags, segments, or CRM activity.
- No export.
- No bulk actions.
- No saved-address view.
- No payment/refund context.
- No customer deletion/merge or retention analytics.

### 3.7 Coupons

Implemented:
- List, create, edit, and delete.
- Percentage and fixed discounts.
- Minimum subtotal, maximum discount, first-order-only, active flag, usage limits, per-user limits, starts/expiry.
- Backend validates coupons during pricing/order creation.

Gaps:
- No coupon filters or server-side pagination wiring in the UI.
- No redemption history.
- No usage/revenue analytics.
- `applicableCategoryIds` exists in the schema but has no UI editor.
- No copy-code action or scheduled/expired views.

### 3.8 Reviews

Implemented:
- Paginated list with All/Pending/Approved/Rejected tabs.
- Approve/reject actions.
- Product, rating, author, excerpt, status, and date.

Gaps:
- No replies.
- No report-abuse workflow or moderation reasons.
- No rating/product/date filters.
- No bulk moderation.
- Review statuses use customer badge tone mapping, so semantic colors are incorrect.
- Review model has no reply or report fields.

### 3.9 Settings

Implemented:
- Store name, support email/phone, accepting-orders toggle.
- Delivery fee, free-delivery threshold, tax rate, minimum order.
- Delivery estimate range.
- Serviceable pincodes.
- Zod validation and backend persistence.

Gaps:
- Single long form; no tab navigation.
- No restaurant logo, description, address, or social links.
- No business hours, weekly schedule, timezone, or holiday closures.
- No separate payment settings or notification settings.
- No administrator profile or security/session settings.
- No audit log or activity view.

### 3.10 Admin login

Implemented:
- Email/password login.
- Zod validation, server errors, loading state, intended-route redirect.
- Admin-specific dark theme.

Gaps:
- No show/hide password.
- No admin password reset entry point.
- No 2FA/session management.

---

## 4. API Inventory

### 4.1 Active v1 API

All routes below are under `/api/v1` unless noted.

#### Auth
- `GET /auth/csrf`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me` — auth required
- `POST /auth/logout-all` — auth required
- `PATCH /auth/password` — auth required
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `POST /auth/resend-verification` — auth required

#### Users
- `GET /users/me`
- `PATCH /users/me`
- `GET|POST /users/me/addresses`
- `PATCH|DELETE /users/me/addresses/:id`
- `GET /users/me/wishlist`
- `POST|DELETE /users/me/wishlist/:productId`

#### Cart
- `GET /cart`
- `POST /cart/items`
- `PATCH|DELETE /cart/items/:productId`
- `POST /cart/merge` — auth required
- `POST /cart/coupon`
- `DELETE /cart/coupon`
- `DELETE /cart`

#### Orders
- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/cancel`
- `POST /orders/:id/reorder`

#### Payments
- `POST /payments/checkout`
- `GET /payments/session/:sessionId`
- `POST /payments/webhook` — registered before global JSON middleware

#### Reviews
- `GET /reviews`
- `POST /reviews`
- `PATCH /reviews/:id`
- `DELETE /reviews/:id`

#### Catalog
- `GET /categories`
- `GET /products`
- `GET /products/:slug`
- `GET /products/:slug/related`
- `GET /search`

#### Admin — all require authentication and `admin` role
- `GET /admin/overview`
- `GET|POST /admin/categories`
- `PATCH|DELETE /admin/categories/:id`
- `GET|POST /admin/products`
- `GET|PATCH|DELETE /admin/products/:id`
- `PATCH /admin/products/:id/stock`
- `POST /admin/uploads`
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`
- `POST /admin/orders/:id/cancel`
- `GET /admin/customers`
- `GET /admin/customers/:id`
- `PATCH /admin/customers/:id/role`
- `PATCH /admin/customers/:id/status`
- `GET|POST /admin/coupons`
- `PATCH|DELETE /admin/coupons/:id`
- `GET /admin/reviews`
- `PATCH /admin/reviews/:id`
- `GET|PATCH /admin/settings`

### 4.2 Legacy API still mounted

These routes are outside `/api/v1` and must be treated as a security/compatibility risk:

- `POST /api/user/login`
- `POST /api/user/register`
- `GET /api/user/profile`
- `GET /api/user/admin`
- `GET /api/food/list`
- `POST /api/food/add`
- `POST /api/food/remove`
- `POST /api/cart/addToCart`
- `POST /api/cart/removeFromCart`
- `POST /api/cart/getCart`
- `POST /api/orders/placeOrder`
- `POST /api/orders/verify`
- `POST /api/orders/userOrders`
- `GET /api/orders/listOrders`
- `POST /api/orders/status`

**Critical:** `POST /api/orders/verify` has no authentication middleware and uses a client-supplied `orderId` to mark an order paid or delete it. This is the highest-priority security issue in the repository.

---

## 5. Database Structure

### 5.1 Active models

| Model | Collection | Purpose and important fields |
|---|---|---|
| `User` | `users` | `name`, `email`, `passwordHash`, `phone`, `role` (`user`/`admin`), `status`, `emailVerifiedAt`, `tokenVersion`, `lastLoginAt`, `wishlist`; secrets selected out. |
| `Address` | `addresses` | User address book: recipient, phone, lines, landmark, city, state, pincode, default flag, soft delete. |
| `Cart` | `carts` | Authenticated or guest cart; items, coupon code, guest token; guest carts expire after 30 days. |
| `Category` | `categories` | Name, slug, description, image, `sortOrder`, active flag, soft delete. |
| `Product` | `foods` | Legacy collection name retained. Name, slug, description, category, `pricePaise`, compare-at price, image, gallery, veg, allergens, ingredients, nutrition, prep time, rating, stock, availability/flags, tags, soft delete. |
| `Order` | `orders` | User, item snapshots, pricing in paise, coupon, address snapshot, lifecycle status, payment status, payment metadata, status history, idempotency key, notes, placed/cancelled dates; also retains legacy `amount`, `address`, `date` fields. |
| `Review` | `reviews` | Product/user/order, rating, title, body, moderation status, soft delete; unique one review per user/product/order. |
| `Coupon` | `coupons` | Code, type, percent/amount, max discount, minimum subtotal, first-order flag, usage/per-user limits, category scope, start/expiry, active flag. |
| `Session` | `sessions` | Refresh-token hash, family ID, replacement hash, user agent/IP, last used, expiry, revocation; TTL index. |
| `Setting` | `settings` | Key/value store for storefront settings. |
| `InventoryLog` | `inventoryLogs` | Product, delta, reason (`order`, `restock`, `adjust`, `cancel`), order, actor; no admin/UI exposure. |
| `WebhookEvent` | `webhookevents` | Stripe event ID and type; 30-day TTL for idempotency. |

### 5.2 Legacy models

- `legacyOrder` → collection `orders`; fields `userId` as string, `items`, `amount`, `address`, title-case `status`, `date`, boolean `payment`.
- `foodmodel`, `userModel` remain alongside the new models.
- Because legacy and new orders share the `orders` collection, any status/field migration must preserve legacy rows and title-case statuses such as `Food Processing`, `Out for Delivery`, and `Delivered`.

### 5.3 Index and consistency notes

- Order indexes cover user/date, status/date, idempotency key, payment session, order number, and payment intent.
- Product has category/availability/deleted, price, merchandising flag, and text indexes.
- Inventory stock changes are conditional/atomic during paid order processing, but manual admin stock changes are not logged.
- Orders can contain both new paise fields and legacy rupee fields; mapping code handles both.

---

## 6. Authentication, Authorization, and Security Audit

### 6.1 Implemented security controls

- HttpOnly access and refresh cookies.
- Refresh-token rotation with family revocation and reuse detection.
- `tokenVersion` checks on v1 access tokens.
- Server-side admin authorization via `authenticate` + `requireRole("admin")`.
- Registration schema is strict and ignores client-supplied roles.
- CSRF double-submit protection for `/api/v1`.
- Strict origin allowlist and timing-safe CSRF comparison.
- Helmet, no `x-powered-by`, request IDs, centralized errors, Pino logging.
- Zod validation for v1 request bodies/params/queries.
- Server-side pricing and coupon validation for v1 orders.
- Stripe webhook idempotency using `WebhookEvent`.
- Password hashing with bcrypt cost 12.
- API rate limiting and separate auth/write/upload limiters.

### 6.2 Security findings by severity

| Severity | Finding | Evidence / impact |
|---|---|---|
| **Critical** | Unauthenticated legacy order verification | `POST /api/orders/verify` can mark an order paid or delete it from only `orderId`. |
| **Critical** | Legacy order creation trusts client amount/item prices | `placeOrder` stores client `amount`, `items`, `name`, and `price`; Stripe line items also use client prices. |
| **High** | Legacy JWT middleware does not check `tokenVersion` or user status | Suspended users/password-changed sessions can remain valid until token expiry. |
| **High** | Retired standalone admin app remains and points at a hardcoded external backend | No login integration; can bypass the new auth model if deployed. |
| **High** | Upload validation is MIME-string only | No magic-byte verification or image re-encoding; static `/images` serving. |
| **High** | `/payments/session` can reconcile a paid order without the webhook | Ownership is checked, but it weakens the “webhook is payment truth” invariant. |
| **Medium** | No admin audit log | Role changes, stock changes, settings edits, refunds, and coupon changes are not attributable. |
| **Medium** | CSRF protection applies only to `/api/v1` | Legacy routes are not cookie-auth, but remain a broad attack surface. |
| **Medium** | `sanitizeInput` runs before Multer | Multipart fields are not sanitized by the global sanitizer. |
| **Medium** | In-memory rate-limit store | Limits reset on restart and are not shared across instances. |
| **Medium** | Dev-only reset/verification tokens returned in responses when not production | Safe only if deployment environment is configured correctly. |
| **Medium** | No granular admin roles/permissions | All admins can perform every admin action. |
| **Low** | Legacy `/api/user/admin` lacks authentication middleware | Currently returns 401 rather than bypassing authorization. |

### 6.3 Positive controls

- `backend/.env` is locally present but untracked and ignored; only `.env.example` is tracked.
- v1 order creation recalculates prices and coupons server-side.
- Stock is decremented during paid confirmation with conditional updates and transaction usage.
- Webhook events are recorded for idempotency.
- Admin suspension/demotion has self-protection guards.

---

## 7. Data Integrity and Commerce Risks

1. **Cart clears before payment success.** The v1 order service clears the cart during order creation, before Stripe confirms payment. Abandoned/failed checkouts lose cart contents.
2. **Order creation is not transactional and does not reserve stock.** Overselling is handled later during payment confirmation, not at checkout.
3. **Webhook idempotency is not fully atomic.** The event insert and order processing are not one transaction; current status checks mitigate most duplicates but do not guarantee strict atomicity.
4. **Refund before save in cancellation.** A failure after refund can leave order state inconsistent until retry.
5. **Manual stock adjustments are not written to `InventoryLog`.**
6. **Coupon redemption history is not persisted** beyond the aggregate `usedCount`.
7. **Legacy payment/order paths bypass modern invariants.** They must be removed or isolated before production.
8. **Legacy status values remain in the database** and require normalization in mapping/filter/count/transition code.

---

## 8. Master Prompt Feature Gap Matrix

| Phase / Feature | Current state | Gap |
|---|---|---|
| Premium design system | Existing token-based CSS design system | Needs formal `ADMIN_DESIGN_SYSTEM.md`, audit/refinement against target palette/type/animations |
| Sidebar/topbar shell | Present, responsive | Missing collapse/tooltips, breadcrumbs, notifications, profile menu, quick actions, SPA global search |
| Overview KPIs | Present | Missing pending orders, products, low stock, period comparison, sparklines |
| Revenue/order analytics | Basic 7/30-day toggle | No real date-range API, comparison periods, category/payment analytics, export |
| Recent activity / smart alerts | Absent | Requires backend aggregation/activity source |
| Products CRUD | Present | Missing bulk actions, duplicate/archive, gallery, stock history, filters/sorting depth |
| Categories CRUD | Present | Missing drag order, image upload, preview |
| Orders operations | Present table/detail/status transitions | Missing Kanban, drawer, live polling, bulk actions, invoice, internal notes, driver/ETA |
| Customer CRM | Present list/detail/history/role/status | Missing notes/tags/segments, address view, export, analytics |
| Coupons | Present CRUD | Missing server pagination, filters, redemption history, usage analytics, category editor |
| Reviews | Present approve/reject | Missing replies, reports, filters, bulk moderation, semantic badges |
| Settings | Present core store/delivery/tax settings | Missing tabs, hours, payment/notification/profile/security settings, audit |
| Inventory | Model/log exists for order/restock | No manual adjustment UI/history/report |
| Staff management | Absent | Requires roles/permissions model and admin UI |
| Activity logs | Absent | Requires audit model/service/API/UI |
| Notifications | Absent | Requires backend event source and topbar UI |
| Security/RBAC | Basic admin/user roles | Need least-privilege roles and permission checks |
| Testing | 1 E2E spec; backend unit tests | Missing admin CRUD/RBAC/responsive/regression coverage |

---

## 9. Frontend Quality Findings

### Strengths
- Clear admin route/pages organization.
- TanStack Query is used consistently for server state.
- Zustand is limited to auth/UI state.
- Zod forms with server-error mapping.
- Accessible modals with focus trap, Escape handling, and focus restoration.
- Tables collapse to cards on smaller screens.
- Route-level lazy loading and vendor chunking.
- `prefers-reduced-motion` handling exists.

### Issues
1. Product image upload is a clickable `<div>` without keyboard activation.
2. Icon-only action buttons often use `title` instead of `aria-label`.
3. Order timeline displays raw `byUserId`.
4. Review statuses use customer tone mapping.
5. Coupons table paginates only the loaded first page.
6. Global admin search performs a full document navigation.
7. Product stock "low" threshold is hardcoded in the table.
8. Some parameterized query invalidation is imprecise.
9. Duplicate categories query keys create unnecessary cache entries.
10. Donut chart tabular fallback has been added.
11. Product form/settings lack unsaved-change protection.
12. Dead legacy guards/components/routes remain.

---

## 10. Testing and Verification State

### Current commands

```text
backend:  npm test
backend:  npm start
frontend: npm run dev
frontend: npm run lint
frontend: npm run build
frontend: npm run test:e2e
```

### Current verified state during this audit cycle

- Backend: **12 test files, 66 tests passed**.
- Frontend lint: **0 errors, 4 warnings** in legacy customer code.
- Frontend production build: **passed**.
- Playwright: one existing spec, `frontend/e2e/order-flow.spec.js`, covering customer checkout and admin order status management.

### Coverage gaps
- No dedicated products/categories/settings CRUD tests.
- No product/category/coupon/customer/review/settings CRUD tests.
- No mobile admin regression suite.
- No security tests for legacy API removal.
- No payment failure/abandoned-cart regression test.
- No visual regression baseline.

---

## 11. Documentation and Repository Hygiene

### Documentation contradictions
- `ARCHITECTURE.md` claims multiple phases complete, specific test counts, audit logging, image re-encoding, webhook-only payment truth, and scripts that do not exist (`seedDemo.js`, `migrateV1.js`).
- `DESIGN.md` still says Phase 2 design system is pending.
- `PROJECT_AUDIT.md` describes an older revision and outdated issues.
- No root `README.md`, setup guide, environment guide, deployment guide, API reference, migration runbook, or admin provisioning runbook.

### Repository hygiene issues
- `backend/node_modules` is tracked/modified in Git; many dependency files appear as changes.
- 13 `" - Copy"` files remain.
- The retired `admin/` app remains.
- Legacy backend controllers/models/routes and old customer pages remain.
- Temporary scripts `frontend/_diag-status.mjs` and `frontend/_verify-orders.mjs` are present.
- `frontend/test-results/.last-run.json` exists.
- Generated/legacy code contributes lint noise and makes security review harder.

### Required cleanup policy
Do not delete legacy code blindly. First:
1. Confirm no customer route/import references it.
2. Preserve `orders`/`foods` data compatibility.
3. Remove only after regression tests pass.
4. Quarantine or remove the old `admin/` app and hardcoded external endpoint.
5. Add root `.gitignore` enforcement for `node_modules`, `dist`, test artifacts, uploads, and env files.

---

## 12. Customer-Facing Functionality That Must Be Preserved

Admin changes must not break:
- Catalog response shapes and product slugs.
- Cart guest-token behavior, authenticated cart merge, coupon application.
- Checkout and Stripe session creation.
- Order creation fields, order status values, and paise amounts.
- Customer order list/detail/cancel/reorder.
- Auth cookies, CSRF flow, refresh rotation, and logout.
- Review creation/moderation visibility rules.
- Legacy order/product data compatibility.
- Image URL serving under `/images` and upload response shape.

---

## 13. Recommended Roadmap

### Phase 1 — Audit
- Complete and review this document.
- Confirm legacy API removal strategy.
- Confirm whether the standalone `admin/` app can be deleted in a dedicated cleanup commit.

### Phase 2 — Design system
- Create `ADMIN_DESIGN_SYSTEM.md`.
- Map target palette/typography to existing tokens.
- Define shell, cards, tables, forms, modals, badges, empty/loading/error states, motion rules, and responsive rules.
- Avoid a full rewrite; refine the current component layer.

### Phase 3 — Security and cleanup gate
- Disable/remove unauthenticated legacy order verification first.
- Quarantine or remove `/api/*` legacy routes after compatibility tests.
- Add audit logging and inventory logging for admin mutations.
- Add RBAC roles/permissions before staff management.
- Harden uploads and payment truth.

### Phase 4 — Admin shell and overview
- Collapsible sidebar, breadcrumbs, profile menu, notification center, SPA global search.
- Real analytics date-range API, comparison periods, payment/category analytics, low-stock/product KPIs, export, activity feed, smart alerts.

### Phase 5 — Core operations depth
- Product bulk/gallery/stock history.
- Category drag sorting.
- Orders Kanban/drawer/live polling/invoice/internal notes.
- Customer CRM depth.
- Coupon analytics/redemption history.
- Review replies/reporting.
- Tabbed settings.

### Phase 6 — Advanced modules
- Inventory management UI.
- Staff/roles/permissions.
- Activity logs.
- Notifications.
- Expanded test and responsive coverage.

---

## 14. Immediate Next Step

Proceed to **Phase 2 — Design System** after reviewing this audit.

Before implementing Phase 2:

1. Treat `/api/orders/verify` and the retired `admin/` app as security blockers.
2. Preserve current v1 APIs and customer-facing flows.
3. Use the existing `/admin/*` module as the foundation; do not replace it with a new demo dashboard.
4. Keep all improvements connected to real backend APIs and real MongoDB data.

---

## 15. Re-Audit and Implementation Status (Phase 17 complete)

**Re-audit date:** 2026-11-09  
**Method:** Read-only inspection of the current working tree; no application code was changed while refreshing this document.

### 15.1 Verified quality gates

| Gate | Command | Result |
|---|---|---|
| Backend tests | `backend: npm test` | 21 files, **120 tests passed** |
| Frontend lint | `frontend: npm run lint` | **0 errors**, 0 warnings |
| Frontend build | `frontend: npm run build` | Passed |
| E2E | `frontend: npm run test:e2e` | 18 Playwright specs / **34 tests passed**: the extended checkout/webhook + admin flow (status update, Orders board, detail drawer, internal-notes save, Settings tabs/payment status, Inventory CSV download, Staff, Activity Log, notification panel), an admin modules flow (coupon create, redemption history with CSV download, delete, mobile drawer navigation), an RBAC flow (support staff creation, limited navigation, route guard, API 403, suspension), products/categories/archive, settings tabs, reviews, customers directory, overview dashboard, order cancellation with refund + restock, coupons (edit, date filters, limits, analytics), the inventory ledger (stock correction, filters, summary, CSV), staff permission overrides with a suspension lockout, and the food-card grid (2/4/5 columns, container-query density, no overflow) |
| Live API smoke | Admin session against `localhost:4000` | `/admin/notifications`, `/admin/staff`, `/admin/inventory/logs`, `/admin/audit-logs`, `read-all`, `PATCH /admin/orders/:id/notes`, `PATCH /admin/settings`, `PATCH /auth/profile`, `GET/DELETE /auth/sessions`, `GET /admin/customers/export`, `GET /admin/inventory/export`, `GET /admin/coupons/:id/redemptions`, `PATCH /admin/reviews/:id/report`, `GET /admin/coupons/:id/redemptions/export` (correct headers and filename, invalid date range rejected with 400), and `POST /admin/products/:id/duplicate` (copy created as inactive draft, then deleted) all behave as expected |

### 15.2 Status against the master prompt

| Area | Status | Notes |
|---|---|---|
| Phase 1 Audit | **Done** | This document |
| Phase 2 Design system | **Done** | `ADMIN_DESIGN_SYSTEM.md`, `frontend/src/styles/admin-theme.css` |
| Phase 3 Admin shell | **Done** | Dark collapsible sidebar, mobile drawer, breadcrumb/title, global order search, notification center, profile menu |
| Phase 4 Overview | **Done** | Real KPI/period comparisons, revenue/orders/category/payment charts, date presets + custom range, top products, recent orders/activity, smart alerts, CSV export, **live today/active counts kept out of the analysis range** (fixed 2026-11-16 — see §15.11) |
| Phase 5 Products | **Done** | CRUD, per-row duplicate as inactive draft, multi-image gallery (max 8), stock, filters/sort/pagination, bulk stock/availability/category/delete, **archive workflow** (archived view, `archived=true` list filter, restore endpoint — added 2026-11-16) |
| Phase 6 Categories | **Done** | CRUD, image, active state, product counts, reorder controls **and drag-and-drop reordering** with keyboard parity (added 2026-11-16 — see §15.7) |
| Phase 7 Orders | **Done** | Table + Kanban board, status/payment/date/search filters, validated transitions, confirmation dialogs, detail page, slide-over drawer, timeline, cancel with refund + restock, printable invoice, editable staff-only admin notes, 20s visibility-aware polling; **cancel path verified end-to-end and the timeline now carries its note/at/actor** (2026-11-16 — see §15.12); **not implemented:** driver assignment/ETA |
| Phase 8 Customers | **Done** | List + detail, order history, suspend/role controls, per-customer AOV/first/last order, new vs returning + repeat-rate analytics, favourite-products card, CSV export of filtered customers, **saved-address view** (added 2026-11-16 — see §15.10) |
| Phase 9 Coupons | **Done** | CRUD, usage limits, per-user limits, backend-validated discounts, redeemed-revenue analytics, scheduled/expired/active filters, per-coupon redemption history with filtered CSV export; **filters now match the badge, redeemed money is read from `pricing`, cancelled redemptions release their slot and leave the history** (2026-11-16 — see §15.13) |
| Phase 10 Reviews | **Done** | List, star/status filters, approve/reject, admin reply, reported status with reported-by/at metadata and moderation actions |
| Phase 11 Settings | **Done** | 10 tabs: Store, enforced weekly Business Hours, Delivery & Pricing, Tax & Invoice (branding on printed invoices), Delivery Estimate, Pincodes, read-only Stripe/provider status, notification preferences that gate alerts, Admin Profile, and Security/Sessions (password change, active-session revoke, sign-out-all); **not implemented:** email changes, 2FA |
| Phase 12 Inventory/Staff/Audit/Notifications | **Done** | Inventory logs + summary + filtered CSV export (E2E: §15.14), staff RBAC management with explicit permission overrides, suspension lockout and nav/route gating (E2E: §15.15), audit log, notification center |
| Phase 13 Security | **Mostly done** | HttpOnly cookies, CSRF, refresh rotation, bcrypt, rate limits, Zod validation, backend RBAC (`requirePermission`), frontend permission route guard, audit logging, legacy API **removed** (2026-11-16), safe uploads, session listing/revocation; **no 2FA** |
| Phase 14 State/performance | **Done** | TanStack Query, Zustand, lazy routes, server pagination, hidden-tab polling pause |
| Phase 15 Animations | **Partial** | CSS transitions/keyframes + `prefers-reduced-motion`; no Framer Motion/Motion dependency |
| Phase 16 Responsive | **Done** | Breakpoints at 1199/1023/899/767/639/479px, mobile drawer, table-to-card collapse; full admin UI refresh (see 15.5); every admin page, popup, form and the admin login page are premium-styled and responsive down to 360px; storefront food cards use a fixed 2 / 4 / 5 column grid with container-query density (§15.16) |
| Phase 17 Testing | **Done** | 120 backend unit/integration tests + 18 E2E specs / 34 E2E tests (checkout/admin flow, admin modules coupon CRUD + redemption CSV + mobile nav, RBAC limited nav + route guard + API 403 + suspension, products CRUD + bulk update + delete, categories CRUD + reorder + delete, category drag-and-drop + keyboard reorder, product archive + restore, reviews approve/reply, settings store-info save, settings tabs — hours, delivery & pricing, tax & invoice, delivery estimate, pincodes, notifications, profile, security, **customers directory — search, role/status filters, activity, saved addresses, CSV export, suspend/reactivate, role change and the self-protection guards** (2026-11-16, §15.10), **overview dashboard — KPIs, series table, distribution panels, CSV export, 7/30-day switch and range scoping** (2026-11-16, §15.11), **order cancellation — reason validation, refund badge, restock, inventory log, 409 guards and the customer timeline** (2026-11-16, §15.12), **coupons — create, edit, date-based filters, server-side limits, redemption history and analytics that survive a cancellation** (2026-11-16, §15.13), **inventory ledger - stock correction and adjustment, validation and OUT_OF_STOCK guards, movement table with summary cards, reason filter and CSV export** (2026-11-17, §15.14), **staff administration - explicit permission overrides that replace role defaults, nav and route gating, API 403s, suspension lockout with the inline login error, and reactivation back to role defaults** (2026-11-17, §15.15), **food-card grid - 2 / 4 / 5 columns on mobile / tablet / desktop, container-query card density and no horizontal overflow** (2026-11-17, §15.16) |

### 15.3 Remaining gaps (prioritized)

1. **Products/Categories: resolved (2026-11-16).** The archive workflow (§15.6) and the drag-and-drop category reordering (§15.7) are both done.
2. **Testing: resolved (2026-11-16).** Every settings tab now has E2E coverage — see §15.8. The customers directory and the overview dashboard followed on the next two passes — see §15.10 and §15.11; cancellation, coupons, the inventory ledger and staff permissions are covered in §15.12-§15.15.
3. **Repository hygiene: resolved (2026-11-16).** `backend/node_modules` is no longer tracked (untracked via `git rm --cached`, then purged from all history with `git filter-repo`, so the remote no longer carries dependency blobs); the retired standalone `admin/` app was deleted from the repo and disk (it hardcoded `https://food-del-backend-393c.onrender.com` with no auth and bypassed the new RBAC/CSRF model — see the security blocker in §7); the `" - Copy"` duplicate files were removed and are now blocked by a `*- Copy.*` ignore rule; `.opencode/` (local agent tooling) is ignored.
4. **Customers CRM: partly closed (2026-11-16).** The saved-address view is now on the customer detail page (§15.10). Still open from the §3.6 list: notes, tags, segments, bulk actions and retention analytics.

### 15.4 Recommended continuation

Keep hardening the admin surface with test/a11y passes and fix whatever they uncover (the settings tab pass already found a logout bug — see §15.8). All new work must remain backend-connected, permission-checked, and must not alter customer-facing contracts.

### 15.5 Admin UI premium + responsive refresh

A dedicated pass upgraded the entire admin surface to a consistent premium visual language while keeping the existing warm "foodie" palette (tomato/cream/saffron/ink) and token system. No behavioural change, no new dependency, no customer-facing contract change.

**Shared components** (`frontend/src/components/admin/`)

| File | Change |
| --- | --- |
| `Modal.css` | Premium surface, `--surface-2` header/footer bands, nested `.confirm-footer` / `.form-footer` handling (these render *inside* `.modal-body`), full-width stacked buttons on mobile |
| `DataTable.css` | Elevated surface, uppercase micro-headers, sticky header rule, hover lift; mobile rows are now bordered cards with hover elevation instead of flat rows |
| `StatCard.css` | Radial depth wash, icon scale + glow on hover, tabular-numeral values |
| `Pagination.css` | Raised button surfaces, 44px touch targets on mobile, info line promoted above the pager |
| `OrderItemsPreview.css`, `FoodThumb.css`, `BarChart.css`, `DonutChart.css` | Thumbnail hover lift, chart bar/label polish, donut legend hover, shimmer loading state |
| `styles/admin-buttons.css` (new) | The `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost` / `.btn-sm` / `.btn-lg` / `.btn-full` system. **These classes were referenced by every admin confirm dialog and form modal but had no CSS rule anywhere in the repo, so all admin popup buttons rendered unstyled.** Verified admin-only usage, so the global scope is safe. |

**Admin shell & login**

- `components/layout/AdminLayout.css` — glassmorphism sidebar, refined topbar with scroll-aware elevation, active-nav accent glow; `AdminLayout.jsx` gained a `topbarScrolled` listener and a smoothly fading sidebar overlay.
- `pages/admin/AdminLoginPage.css` — ambient radial depth layer, premium dark card, saffron focus ring, responsive single-column stacking.

**Admin pages** — all rewritten for premium + responsive: `OverviewPage`, `OrdersPage`, `ProductsPage`, `CategoriesPage`, `CouponsPage`, `InventoryPage`, `StaffPage`, `ReviewsPage`, `SettingsPage`, `AuditLogsPage`, `AdminCustomers` (customers list + customer detail), `OrderDetailPage`, `OrderDrawer`, `ProductFormPage`.

**Defects found and fixed during the pass**

1. `.btn` family undefined repo-wide — admin confirm/add/edit popup buttons were unstyled (new `styles/admin-buttons.css`).
2. `.confirm-message`, `.confirm-footer`, `.form-footer` were dropped during a Modal rewrite — restored.
3. `.customer-summary-card-accent`, `.page-header-actions`, `.role-radio`, `.order-drawer-error`, `.order-drawer-skeleton`, `.redemption-summary`, `.overview-chart` were missing rules — restored.
4. Previously unstyled classes now covered: `.bulk-dialog-form`, `.modal-form-input` (+ `.has-error`), `.order-progress-card`, `.detail-skeleton`, `.error-state`, `.form-skeleton`, `.barchart-bars` / `.barchart-bar-group` / `.barchart-label`, `.order-drawer-item-name`, `.text-muted`, `.with-names`.
5. Undefined CSS variables replaced with defined equivalents: `--danger-500` → `--color-danger`, `--color-secondary` → `--color-accent`, `--color-surface-alt` / `--color-surface-muted` → `--color-surface-2`, `--font-heading` → `--font-display`, `--herb-600` → `--herb-700`.

**Verification tooling** — two throwaway Node scripts were used to guarantee no silent regressions: one cross-references every `className` in admin JSX against every CSS rule in `frontend/src`, the other verifies every `var(--token)` used in the rewritten admin CSS is defined somewhere in the project. Both now report clean (only template-literal false positives remain). Every file also honours `prefers-reduced-motion`.

### 15.6 Product archive workflow (2026-11-16)

Deleting a product was already a soft delete (`deletedAt`), but there was no way to see or undo it. The workflow is now complete end to end.

**Backend**

| Change | Detail |
| --- | --- |
| `GET /admin/products?archived=true` | Lists archived products only. The storefront list can never return them — `includeArchived` is opt-in and only the admin controller passes it. |
| `POST /admin/products/:id/restore` | Clears `deletedAt` and sets `isAvailable: true`. Requires `catalog:write`, is rate limited and lands in the audit log through `auditAdminMutations`. |
| `restoreProduct` service | Refuses with `404 Archived product not found` when the product is not archived, so a live product cannot be "restored". |

**Admin UI** (`pages/admin/ProductsPage.jsx`)

- A new **Catalog** filter switches between `Live catalog` and `Archived products`.
- Archived rows show an `Archived` badge and a single **Restore** action; the edit/duplicate/delete actions are hidden because an archived product cannot be opened or edited.
- Selection and bulk actions are disabled in the archived view (there is nothing meaningful to bulk-edit on a soft-deleted product), and the empty state explains that deleted products are kept so they can be brought back.

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 17 files, **98 tests passed** (4 new archive unit tests) |
| `frontend: npm run lint` | 0 errors |
| `frontend: npm run build` | Passed |
| E2E `e2e/product-archive.spec.js` | Archive → hidden from live catalog → listed as archived → restored → back in the live catalog → removed from the archived view |

### 15.7 Category drag-and-drop reordering (2026-11-16)

Categories could only be nudged one position at a time with the up/down buttons, and that endpoint swapped two `sortOrder` values — which is a no-op when two categories share the same order. The menu order is now a first-class, drag-and-drop flow.

**Backend**

| Change | Detail |
| --- | --- |
| `PATCH /admin/categories/reorder` | Persists a full ordering: body `{ order: [categoryId, …] }`. Requires `catalog:write`, is rate limited and is written to the audit log by `auditAdminMutations`. Registered **before** `/categories/:id` so the literal `reorder` segment is not swallowed by the parameterised route. |
| `reorderCategories` service | Rewrites `sortOrder` to `0…n-1` in one `bulkWrite`, so every category gets a unique, deterministic position. Ids that are not sent keep their relative order and are appended after the ones that were — a partial list never drops a category out of the menu. Unknown ids are rejected with `404 Category not found`. |
| `reorderCategory` service | The single-step endpoint now delegates to `reorderCategories`, so both paths share one ordering rule (this also fixes the swap no-op described above). |

**Admin UI** (`pages/admin/CategoriesPage.jsx`)

- Every card carries a **drag handle**. Dragging it over another card shows a drop target, and dropping reorders the grid — the card moves optimistically and the persisted order is re-read from the API.
- The handle is a real control: focusing it and pressing **ArrowUp** / **ArrowDown** moves the category one step, so the flow works without a pointer. A visually hidden hint (`category-reorder-hint`) describes both options to screen readers.
- The up/down buttons stay for touch devices — native drag and drop needs a pointer, so the handle is hidden under `@media (hover: none)` and the buttons take over.
- The drop position decides the insertion point from the pointer offset on the dominant axis (horizontal inside a row, vertical across rows), so the multi-column grid behaves as expected.

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 18 files, **105 tests passed** (7 new reorder unit tests) |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/category-reorder.spec.js` | Drag a card onto another → the persisted order and the DOM order both change; ArrowUp on the focused handle moves a category one step |
| Full E2E suite | 10 specs / 10 tests passed |

### 15.8 Settings tab coverage (2026-11-16)

Only the store information tab had E2E coverage; the other nine tabs were untested. Every remaining tab now has a test that types into the UI, reads the persisted value back from the API and restores the original value afterwards, so the shared configuration is left exactly as it was found.

| Tab | What the test proves |
| --- | --- |
| Business Hours | A day can be reopened and given new open/close times; the saved `businessHours` entry matches. |
| Delivery & Pricing | Delivery fee, free delivery threshold and minimum order are stored in paise (`45.50` → `4550`). |
| Tax & Invoice | Tax rate (`7.5` → `750` bps), tax label, legal name and invoice footer persist. |
| Delivery Estimate | The min/max delivery window persists. |
| Serviceable Pincodes | A multi-line pincode list is parsed into an array of six-digit strings. |
| Notifications | Toggling a preference flips the stored flag. |
| Admin Profile | The profile name is saved, read back through `GET /auth/me`, and the admin stays signed in. |
| Security & Sessions | The active session list renders with the current device marked, and the password form rejects a mismatched confirmation and a too short password before any request is sent. |

**Defect found and fixed**

1. **Saving the admin profile signed the admin out.** `SettingsPage.jsx` read the response as `response.data.user`, but the api client already unwraps the `data` envelope, so the value was `undefined`. `setUser(undefined)` resets the auth store, which flipped the session to `unauthenticated` and bounced the admin to the login screen right after a successful save. The fix reads `response.user` (the same contract the rest of the app uses), and the profile test now asserts that the admin is still signed in after the save.

**Test hygiene**

- `settings.spec.js` renamed the store on every run and never restored it; it now reads the original values first and writes them back in a `finally` block.
- The category drag test removes the categories a failed run may have left behind before it starts.

**Verification**

| Gate | Result |
| --- | --- |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/settings-tabs.spec.js` | 8 tests passed |
| Full E2E suite | 11 specs / **18 tests passed** |

### 15.9 Backend environment variables (2026-11-16)

The backend env schema (`backend/src/config/env.js`) declares seventeen variables, but the local `.env` only held six of them and two implemented variables were missing from the documentation.

**Added to `backend/.env` (local, git-ignored)**

`PORT`, `NODE_ENV`, `CLIENT_URL`, `ADDITIONAL_ORIGINS`, `COOKIE_DOMAIN`, `TRUST_PROXY`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `STORAGE_DRIVER`, `CLOUDINARY_URL`, `LOG_LEVEL` and the `REFRESH_CATEGORY_IMAGES` script flag. Every one of them was previously relying on the schema default, so the effective configuration did not change — they are now explicit and documented.

**`backend/.env.example`**

Every variable now carries a comment that says what it does and when it matters, including the two that are easy to get wrong:

- `TRUST_PROXY` — must be `true` behind a proxy (Render, Heroku, Nginx), otherwise every visitor shares one rate-limit bucket and the client IP is wrong.
- `COOKIE_DOMAIN` — empty in development, the shared domain in production.
- `ADDITIONAL_ORIGINS` — the deployed frontend origin, comma separated.

**Documentation**

| File | Fix |
| --- | --- |
| `ARCHITECTURE.md` §10.1 | Added the missing `ADDITIONAL_ORIGINS` and `TRUST_PROXY` rows and corrected the "required" column against the actual schema. |
| `ARCHITECTURE.md` §10.2 | Removed `VITE_STRIPE_PUBLISHABLE_KEY` and `VITE_APP_NAME` — neither exists in the code (checkout runs through a backend Stripe Checkout session, the brand name is hardcoded). Only `VITE_API_URL` is read. |
| `README.md` | Split the env list into required and optional with the default for each, and corrected the stale backend test count. |

**Verification**

| Gate | Result |
| --- | --- |
| `node -e "import('./src/config/env.js')"` | Parses the new `.env` cleanly, all seventeen values resolved |
| `backend: npm test` | 18 files, **105 tests passed** (`NODE_ENV=test` still selects the test-only database) |
| `frontend: npm run test:e2e` | The E2E helper still reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from the rewritten `.env` |

### 15.10 Customers directory coverage (2026-11-16)

The customers module was the last admin area without an end-to-end test. The pass closed the gap and fixed the two real problems it uncovered.

**New E2E spec** — `frontend/e2e/customers.spec.js` (3 tests)

| Test | What it proves |
| --- | --- |
| Directory and detail | A customer created through the public API (with a paid order, confirmed by a simulated Stripe webhook) is listed with the right order count, appears in the cards view, and its detail page reports the activity, the order history, the favourite dish and the saved address. The CSV export is downloaded and its contents are checked for the account. |
| Suspension | Suspending an account flips the badge, the customer can no longer sign in (`403`) and disappears from the `Active` filter; reactivating restores the login and the `Active` badge. |
| Role and guards | Promoting an account to administrator and demoting it back both work and persist; the admin cannot suspend or demote their own account (`403` from the API, the buttons are not rendered). |

A new helper — `frontend/e2e/helpers/customer.js` — registers a customer, saves an address, fills the cart, places the order and confirms the payment through the public API, so the tests run against real data instead of fixtures. The admin session and the customer session use separate browser contexts, so the two never share a cookie jar.

**Defect found and fixed**

1. **The role radio group did not react to a click.** `CustomerDetailPage.jsx` rendered the radios as `checked={profile.role === 'admin'}`, so the control was bound to the *persisted* role: choosing "Administrator" opened the confirmation dialog but left the radio on "Customer" until the mutation succeeded. A radio that ignores the click reads as broken, and Playwright's `check()` fails on it outright. The radio group now follows the pending choice while the dialog is open and falls back to the persisted role when the dialog is cancelled or the change fails.

**Feature closed**

2. **No saved-address view** (the one §3.6 gap that the admin could not work around). `GET /admin/customers/:id` now returns the customer's own address book and the detail page renders it in a **Saved addresses** card (label, default marker, recipient, phone, street lines and pincode), with an empty state for accounts that have never saved one.

**Backend**

| Change | Detail |
| --- | --- |
| `getCustomerAdmin` service | Returns `addresses` alongside the profile and the orders. |
| `backend/src/tests/customer-admin.test.js` | Five new unit tests: the response shape (profile, orders, addresses), a `404` for an unknown customer, the `tokenVersion` bump that kills the open sessions of a suspended account, the untouched `tokenVersion` on reactivation, and the refusal to suspend an administrator account. |

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 19 files, **110 tests passed** (5 new) |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/customers.spec.js` | 3 tests passed |
| Full E2E suite | 12 specs / **21 tests passed** |
| Overflow probe (320 / 360 / 390 / 768 / 1440 px) | No horizontal overflow on the customer detail page, one `h1`, the address card renders at every width |



### 15.11 Overview dashboard coverage (2026-11-16)

The dashboard was the last admin page with no automated coverage. The pass added two E2E flows and fixed the two defects they exposed.

**New E2E spec** — `frontend/e2e/overview.spec.js` (2 tests)

| Test | What it proves |
| --- | --- |
| A new paid order shows up | A customer pays for an order (public API + simulated Stripe webhook) and the dashboard reflects it: the last-seven-day revenue/orders KPIs, the live header, the revenue series and its accessible table view, the status donut, the best-seller and category panels, the recent-orders table, the activity feed and the revenue CSV export (8 lines: header + seven days). Switching to the 30-day view relabels the range and re-renders the chart. |
| A custom range scopes the analysis only | A `from`/`to` window with no orders zeroes the range KPIs, empties the recent-orders table and the best-seller/category panels, yet the live header keeps showing today's real revenue, order count and active-orders count. Clearing the range restores the seven-day window. |

**Defect 1 — the chart controls escaped the panel (fixed)**

`.chart-actions` was `flex-shrink: 0` with no cap, and `.chart-controls` never wrapped, so below 1366px the control row (date inputs + export + range tabs) overflowed the revenue panel and slid underneath the order-status panel. Because the next grid cell paints on top, the **7/30-day tabs were unreachable** at 1280px and the entire control row sat outside the panel at 1200px and below (no scrollbar, so the previous responsive sweep did not catch it). `.chart-controls` now wraps, and `.chart-actions` is capped at `max-width: 100%` so the row drops to its own line and wraps its children instead of leaving the card. Verified reachable at 1920, 1600, 1440, 1366, 1280, 1200, 1024, 900, 768, 480 and 375px.

**Defect 2 — a date filter blanked the "live operations" header (fixed)**

`todayMatch` was built from the analysis range, so filtering the chart to a past window also zeroed the hero ("₹0 today / 0 orders today / 0 active now") and the "Active orders"/"Awaiting payment" KPI cards, even while those orders existed. The dashboard now separates the two scopes:

| Scope | Data |
| --- | --- |
| Selected range (`from`/`to`) | revenue, orders, AOV, revenue series, status donut, payment mix, best sellers, category revenue, recent orders, CSV export |
| Present tense | `today` (revenue, orders, active count), `activeOrderCount`, `pendingOrderCount`, customer count |

`getAdminOverview` no longer merges the range into `todayMatch`, and a dedicated unscoped status aggregation feeds the live counts (normalised through `normalizeOrderStatus`, so legacy aliases such as `food_processing` still count as active). The hero reads `today.activeOrderCount`, so it and the KPI grid always agree.

**Backend**

| Change | Detail |
| --- | --- |
| `getAdminOverview` service | Range-scoped panels unchanged; `today` and the live order counts are computed without the range. |
| `backend/src/tests/overview.service.test.js` | Three unit tests: live counts survive an empty analysis range, every legacy alias of an active status is counted, and the daily series is filled (and ordered) from `from` to `to`. |

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 20 files, **113 tests passed** (3 new) |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/overview.spec.js` | 2 tests passed |
| Full E2E suite | 13 specs / **23 tests passed** |
| Control-row reachability probe (1920 → 375px) | The date inputs, export button and range tabs are hit-testable inside the panel at every width |

### 15.12 Order cancellation and restock coverage (2026-11-16)

Cancelling a paid order is the only admin action that moves money and stock at the same time: it refunds the Stripe payment, returns every unit to the inventory and writes an `InventoryLog` entry. That path had no test, so it is now covered end-to-end and the pass uncovered two defects.

**Defect 1 - the order timeline lost its note, time and actor (fixed)**

`toOrderResponse` built each history entry with `{ ...entry }`. Spreading a Mongoose subdocument copies the internal document keys (`$__`, `_doc`, …) instead of the field values, so every entry reaching the API contained only `status`. Both timelines - the admin detail page and the customer order page - therefore showed bare status badges: no dates, no "Order placed"/"Payment confirmed" notes and no staff attribution, even though `ARCHITECTURE.md` documents the entry as `{ status, at, byUserId, note }`. The mapper now builds the four fields explicitly (normalising the status and stringifying the actor id), which restores the timestamps, the cancellation reason and the "Updated by" line on both pages.

**Defect 2 - the cancellation reason field had no accessible name (fixed)**

The dialog textarea was labelled only by a placeholder, so screen readers announced it as an unlabelled edit field and the validation error was described by no element. It now has a visible `<label for="cancel-reason">`, `maxLength={300}` to match `cancelOrderSchema`, and `aria-invalid`/`aria-describedby` wired to the error text (`role="alert"`, `id="cancel-reason-error"`).

**E2E `frontend/e2e/order-cancel.spec.js` (1 test)**

1. A fresh customer registers and pays for two units of a fresh product through the real checkout + Stripe webhook, which takes the units out of stock.
2. The admin opens `/admin/orders/:id` and confirms the header (`Confirmed`, `Paid`).
3. "Cancel Order" opens the dialog; submitting with an empty reason shows "Please add a short reason", marks the field `aria-invalid` and links it to the alert; filling the reason clears the alert.
4. Confirming shows the "Order cancelled" toast, closes the dialog, flips the header to `Cancelled`/`Refunded`, renders the reason in the timeline, and removes the cancel group plus every forward status button ("No forward status change is available.").
5. The side effects are asserted through the API: stock is back to its pre-payment level, and `/admin/inventory/logs?productId=&reason=cancel` holds the entry with `delta: 2` and the matching `orderId`.
6. Guards: a second `POST /admin/orders/:id/cancel` and a `PATCH …/status {status:"delivered"}` both return **409 `INVALID_TRANSITION`**.
7. The customer page shows `Cancelled`, the cancellation reason and the payment note with real timestamps, and `GET /api/v1/orders/:id` agrees (`status`, `paymentStatus: refunded`, `cancellationReason`).

**Backend**

| Change | Detail |
| --- | --- |
| `toOrderResponse` | `statusHistory` entries are constructed field by field (`status`, `at`, `byUserId`, `note`). |
| `backend/src/tests/order.mapper.test.js` | New test: a two-entry history keeps the note, timestamp and actor id, normalises legacy status labels and maps a null actor. |

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 20 files, **114 tests passed** (1 new) |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/order-cancel.spec.js` | 1 test passed |
| Full E2E suite | 14 specs / **24 tests passed** |

The suite still leaves E2E orders and customers in the database, as before; keep using a non-production database for the run.

### 15.13 Coupon coverage (2026-11-16)

The coupon page had a create/delete smoke test. This pass covered editing, the status filters, the redemption limits and the analytics, and the tests found four defects: three of them meant the numbers on the card did not describe what the customer experienced.

**Defect 1 - the status filter disagreed with the badge (fixed)**

The badge is date based ("Scheduled" while `startsAt` is in the future, "Expired" once `expiresAt` has passed) but the filter also required `isActive: false`. A coupon created with a future start or a past expiry keeps `isActive: true` by default, so it showed a Scheduled/Expired badge yet did not appear under those filters, and it *did* appear under Active (for the scheduled case). `listCoupons` now filters on the dates only (Active additionally requires `isActive`), matching the badge exactly.

**Defect 2 - "redeemed" money was always 0 (fixed)**

The analytics aggregated `$discountPaise`, but the discount is stored at `pricing.discountPaise`, so every card read "0 uses / ₹0 redeemed". The aggregate now sums the nested field.

**Defect 3 - cancelled redemptions stayed in the numbers (fixed)**

`usedCount` is incremented on payment confirmation and was never decremented, so a cancelled order kept burning a slot of the `usageLimit`; meanwhile the analytics summed every order that ever carried the code, cancelled ones included, and the redemption history/CSV listed them too. Cancelling a paid order now hands the slot back (`usedCount` decremented with a `> 0` guard), and the analytics, history and CSV only count orders that are neither cancelled nor payment-failed. All four surfaces now agree with `usedCount`.

**E2E `frontend/e2e/coupons.spec.js` (2 tests)**

1. *Create, edit and filter* - a percentage coupon with every limit renders its value, badge and terms; the form refuses a 0% value; coupons that start in the future or expired yesterday render as Scheduled/Expired and each filter returns exactly those; a duplicate code answers **409 `COUPON_EXISTS`** and an inverted date window **400 `VALIDATION_ERROR`** on `expiresAt`; editing value/description updates the card; deleting removes it.
2. *Limits and analytics* - three customers share a fixed coupon with `usageLimit: 2` and `perUserLimit: 1`: the first pays (card: "1 uses / ₹10 redeemed"), her second attempt is refused per user, the second customer pays ("2 uses / ₹20 redeemed"), the third is refused by the global limit. Cancelling the second order returns the card to "1 use / ₹10 redeemed" and frees the slot for the third customer. The redemption dialog lists only the live order, the CSV export mirrors it, and the cancelled order is absent from both.

**Backend**

| Change | Detail |
| --- | --- |
| `coupon.service.js` | Date-based list filters; live-redemption analytics reading `pricing.discountPaise`; redemption history/CSV exclude cancelled and failed orders. |
| `order.service.js` | `cancelOrder` releases one `usedCount` unit for a paid order that carried a coupon. |
| `backend/src/tests/coupon.service.test.js` | Six unit tests: the three list filters, the analytics pipeline (status exclusion + nested discount field), and cancellation releasing (or not touching) the coupon slot. |
| `frontend/e2e/helpers/customer.js` | `placePaidOrder` accepts `couponCode` and `minPricePaise`; new `addFirstProductToCart` / `applyCouponToCart` helpers. |
| `frontend/e2e/helpers/admin.js` | `adminAttempt` returns the raw response for expected 4xx assertions (also used by the cancellation spec). |

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 21 files, **120 tests passed** (6 new) |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/coupons.spec.js` | 2 tests passed |
| Full E2E suite | 15 specs / **26 tests passed** |

### 15.14 Inventory ledger covered by E2E (`frontend/e2e/inventory.spec.js`)

**What the spec proves**

- A product is created through `POST /admin/products` (with a real `categoryId` from `GET /admin/categories`), then `PATCH /admin/products/:id/stock` is driven three ways: `{ delta: 5 }` (restock), `{ stock: 12 }` (manual adjustment), and `{ stock: 12 }` again, which is a no-op and must not write a ledger entry.
- Validation is enforced server-side: `stock: -5` and a body containing both `stock` and `delta` return `400 VALIDATION_ERROR`, and `delta: -50` against 12 units returns `409 OUT_OF_STOCK`.
- `/admin/inventory` is scoped with the product search, and the movement table shows exactly the two expected entries (`+5` Restock, `-3` Adjustment) while the summary cards read `Stock in +5`, `Stock out -3`, `Net change +2` and `Movements 2`.
- The reason filter (`#inventory-reason`) narrows the table, and `reason=cancel` produces the `No stock movements yet` empty state for this product.
- `Export CSV` downloads `inventory-YYYY-MM-DD.csv` whose header is `"Date","Product","Change","Reason","Order ID","Actor"` and whose rows carry the product name for both movements; the toast confirms `Inventory report exported`.

**Outcome**: the inventory module passed on the first run, so this pass found no defects - it locks the behaviour in place instead.

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 21 files, **120 tests passed** (unchanged) |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/inventory.spec.js` | 1 test passed |
| Full E2E suite | 16 specs / **27 tests passed** |
### 15.15 Staff permission overrides and suspension covered by E2E (`frontend/e2e/staff.spec.js`)

**What the spec proves**

- A support account is created with an explicit `permissions` override (`overview:read` + `coupons:read`) through the staff form; the card immediately reports `Support`, `Custom permissions` and both keys, and confirms the role default `orders:read`/`coupons:write` are **not** granted.
- Signing in as that account shows the short sidebar: Coupons is visible while Orders, Customers, Products and Staff are hidden. `/admin/coupons` loads and `GET /admin/coupons` returns 200, but `POST /admin/coupons` returns `403 FORBIDDEN`, and `/admin/orders` renders the `Access restricted` route guard.
- Suspending the account from the edit dialog (`status: "suspended"`) makes the next sign-in fail: the admin login page keeps the typed credentials and renders the inline `role="alert"` message "This account has been suspended".
- Reactivating it, switching the role to `manager` and clearing the override flips the card back to `Manager` + `Role default` (no `Custom permissions`).
- A wrong password on the same page shows `Invalid email or password` inline, keeps the email value and stays on `/admin/login`.

**Defect fixed: the admin login form was unmounted on every failed submit**

`AdminLoginGuard` rendered a skeleton whenever `status === "loading"`, and `useAuth.login` sets that status while the request is in flight. The guard therefore unmounted `AdminLoginPage`, so when a suspended (or wrong-password) sign-in failed the page remounted with empty state - the typed credentials were gone and the `.admin-login-error` alert (fed by `getErrorMessage(result)`) never appeared. The 403 did reach the browser (as a toast), but the page told the user nothing. The store now records `bootstrapped` once the initial `useAuth.bootstrap` settles, and the guard suppresses the form only before that first check - a submit keeps the page mounted, so the inline server message and the form values survive.

**Files**

| File | Change |
| --- | --- |
| `frontend/e2e/staff.spec.js` | New spec: permission override, nav/route/API gating, suspension lockout, wrong-password inline error, reactivation. |
| `frontend/src/stores/auth.store.js` | `bootstrapped` flag with `setBootstrapped`. |
| `frontend/src/hooks/useAuth.js` | `bootstrap` marks `bootstrapped` in a `finally` block. |
| `frontend/src/components/layout/AdminRoute.jsx` | `AdminLoginGuard` shows its skeleton only while the initial session check runs. |

**Verification**

| Gate | Result |
| --- | --- |
| `backend: npm test` | 21 files, **120 tests passed** (unchanged) |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/staff.spec.js` + `e2e/rbac.spec.js` | 2 tests passed |
| Full E2E suite | 17 specs / **28 tests passed** |
### 15.16 Food card grid: 2 / 4 / 5 columns

**What changed**

The storefront previously used a fluid column plan (1 column under 400px, 2 at 400px, 3 at 768px, 4 at 1200px) with a separate dense variant for the menu (3 / 4 / 5). That left phone cards full-width and desktop cards uneven between the menu, search and the home rails. Cards are now on one fixed plan across the whole storefront:

| Viewport | Cards across | Where |
| --- | --- | --- |
| mobile (`< 768px`, including 360-430px phones) | 2 | menu, search, home rails |
| tablet (`768px` - `1199px`) | 4 | menu, search, home rails |
| desktop (`>= 1200px`) | 5 | menu, search, home rails |

`ProductGrid.module.css` owns the plan and the `dense` menu variant only tightens the gutters (`--space-2` -> `--space-4`); `ProductRail.module.css` uses the same numbers for the home rails and their skeletons, so the two never drift. Loading skeletons reuse the same classes and therefore the same columns, so nothing reflows when data lands.

**Card density is now a container query, not a guess**

A 2-up phone card is ~150px wide while a 4-up tablet card is ~170px and a 5-up desktop card ~220px, so a single padding scheme cannot look right everywhere. `.card` declares `container-type: inline-size`, and `@container (max-width: 250px)` applies the compact composition:

- the footer stacks (price above a full-width action) instead of wrapping unpredictably;
- the optional description and the redundant view arrow are dropped;
- the category/time meta wraps, and the discount, diet, rating and bestseller overlays shrink and pull in to 8px so they never collide;
- the add/stepper controls keep their 44px minimum touch target.

No JS measuring, no resize listeners, and no duplicate DOM per breakpoint. The viewport `@media (max-width: 639px)` block that used to emulate this is gone - the container query is the single source of truth.

**Verification**

| Gate | Result |
| --- | --- |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed |
| E2E `e2e/product-grid.spec.js` | 6 tests passed (2 / 4 / 5 columns at 390, 430, 768, 1280 and 1600px, home rails, card width floor, no horizontal overflow) |
| `frontend: npm run test:responsive` | 4 specs passed (overflow sweep and tap targets across the breakpoint matrix) |
| Full E2E suite | 18 specs / **34 tests passed** |

**Files**

| File | Change |
| --- | --- |
| `frontend/src/components/product/ProductGrid.module.css` | Column plan 2 / 4 / 5, dense gutters only. |
| `frontend/src/components/home/ProductRail.module.css` | Home rail + skeleton grids follow the same plan. |
| `frontend/src/components/product/ProductCard.module.css` | `container-type` + `@container (max-width: 250px)` compact composition. |
| `frontend/e2e/product-grid.spec.js` | New spec pinning the plan and guarding overflow. |
