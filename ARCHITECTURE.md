# ARCHITECTURE.md - Food Delivery Platform

**Status:** Phases 4.1-4.11 complete - backend `npm test` 61/61 green, frontend `npm run lint` 0 errors (7 pre-existing warnings) and `npm run build` green, admin UI verified at 1440px and 390px, motion pass verified with `prefers-reduced-motion` emulation. Phase 4.10: routes code-split with lazy/Suspense (initial JS 545 kB → 401 kB across cacheable vendor chunks), auth bootstrap no longer blocks first paint, CLS on /menu 0.36 → 0.01. Phase 4.11: axe-core WCAG 2.2 AA automated audit clean on all routes (desktop 1440px + mobile 390px).
**Inputs:** `PROJECT_AUDIT.md` (findings + confirmed decisions, Section 19), `DESIGN.md` (design system + page blueprints).
**Scope:** Backend API, data models, auth/session design, pricing/payment invariants, frontend architecture, admin architecture, security baseline, testing, and migration from the current MVP.
**Non-goals for MVP:** full dark theme, websocket live tracking (polling first), multi-vendor, COD/wallet, mobile apps, SSR.

---

## 1. Architecture Decisions (Locked)

| # | Decision | Choice | Consequence |
|---|---|---|---|
| A1 | Auth transport | Access JWT (15 min) + rotating refresh token (30 days), both `HttpOnly` cookies | No tokens in `localStorage`; `/auth/me` bootstraps session |
| A2 | CSRF | Double-submit cookie + `Origin` check + `SameSite` | Mutations require `X-CSRF-Token` |
| A3 | Roles | `user`, `admin` (server-owned) | `role` is never accepted from public input |
| A4 | Admin app | Merge into customer Vite app at `/admin/*` | One deploy, route-level RBAC guard; standalone `admin/` retired |
| A5 | Currency | INR, integer paise everywhere | All money fields end in `Paise`; one `formatINR` helper |
| A6 | Payment truth | Stripe webhook only | Client redirect cannot mark an order paid |
| A7 | Pricing truth | Server recomputes from DB | Client sends product IDs + quantities only |
| A8 | Cart storage | Server cart for authenticated users; guest cart in `localStorage` | Merge on login, idempotent |
| A9 | API style | REST, JSON, `/api/v1`, envelope `{ data }` / `{ error }` | Predictable client errors |
| A10 | Data access | Mongoose models + service layer | Controllers stay thin and testable |
| A11 | Validation | Zod schemas at every boundary | One schema shared conceptually by client and server |
| A12 | Uploads | Local `uploads/` in dev, Cloudinary adapter in prod | Storage behind one interface |
| A13 | API version | `/api/v1` | Legacy `/api/*` removed — retired paths answer `410 LEGACY_API_REMOVED` |

### 1.1 Topology

```text
Browser
  https://app.example.com
        |
        |  /api/v1/*  (same-origin via reverse proxy/CDN)
        v
  Express API (Node 20+)
        |            \
        |             \--> Stripe (Checkout + webhook)
        v
  MongoDB Atlas
        |
        +--> Upload storage (local dev / Cloudinary prod)
```

- Single origin in production (`https://app.example.com`) so `HttpOnly` cookies are first-party and CSRF rules are simple.
- In development: Vite `5173` proxies `/api` and `/images` to Express `4000`.
- `trust proxy` enabled in production for correct client IPs and secure cookies.

---

## 2. Target Repository Structure

```text
backend/
  src/
    app.js                     # express app assembly (no listen)
    server.js                  # http server + graceful shutdown
    config/
      env.js                   # zod-validated env, fail fast
      db.js
      constants.js             # status enums, limits, cookie names
    models/
      user.model.js
      address.model.js
      product.model.js
      category.model.js
      cart.model.js
      order.model.js
      coupon.model.js
      review.model.js
      session.model.js         # refresh-token sessions
      inventoryLog.model.js
      setting.model.js
    routes/
      auth.routes.js
      user.routes.js
      catalog.routes.js
      cart.routes.js
      order.routes.js
      payment.routes.js
      review.routes.js
      admin.routes.js
      index.js
    controllers/
      auth.controller.js
      user.controller.js
      catalog.controller.js
      cart.controller.js
      order.controller.js
      payment.controller.js
      review.controller.js
      admin/*.controller.js
    services/
      auth.service.js
      token.service.js
      pricing.service.js
      cart.service.js
      order.service.js
      payment.service.js
      inventory.service.js
      catalog.service.js
      coupon.service.js
      upload.service.js
      audit.service.js
    middleware/
      authenticate.js
      requireRole.js
      validate.js
      csrf.js
      rateLimit.js
      errorHandler.js
      notFound.js
      requestId.js
      upload.js
    validators/
      auth.schema.js
      product.schema.js
      order.schema.js
      ...
    utils/
      apiError.js
      asyncHandler.js
      money.js
      slug.js
      logger.js
      cookies.js
    tests/
      unit/
      integration/
  uploads/
  scripts/
    seedAdmin.js
    seedDemo.js
    migrateV1.js
```

```text
frontend/src/
  app/
    router.jsx
    providers.jsx
    App.jsx
  api/
    client.js                  # axios: cookies, CSRF, refresh retry
    auth.api.js
    catalog.api.js
    cart.api.js
    orders.api.js
    payments.api.js
    admin.api.js
    queryKeys.js
  stores/
    auth.store.js              # session user (memory) + status
    cartUi.store.js            # guest cart, drawer, optimistic qty
    ui.store.js                # toasts, modals
  hooks/
    useAuth.js
    useCart.js
    useProducts.js
    useDebouncedValue.js
    useMediaQuery.js
  components/
    ui/                        # Button, Input, Card, Badge, Modal, Drawer, Toast, Skeleton, EmptyState, ErrorState
    layout/                    # Navbar, MobileDrawer, Footer, SkipLink, AdminLayout
    home/
    product/
    cart/
    checkout/
    admin/
  pages/
    Home, Menu, Product, Search, Cart, Checkout, Verify,
    Orders, OrderDetail, Account, Wishlist, Auth/*, NotFound, Error
    admin/Login, Overview, Products, Categories, Orders, Customers, Coupons, Reviews, Settings
  lib/
    formatINR.js
    formatDate.js
    motion.js
    cn.js
  styles/
    tokens.css
    globals.css
    motion.css
```

**Rule:** no page imports `axios` directly; only `src/api/*` talks to the network.

---

## 3. Data Model

### 3.1 Conventions

- `_id` is Mongo `ObjectId`; public API exposes `id` as a string.
- Every schema has `createdAt` / `updatedAt` (`timestamps: true`).
- Soft delete (`deletedAt`) for `Product`, `Address`, `Review`, `Coupon`; hard delete only for `Session` and `CartItem` removal.
- All money is `Number` (integer paise). Names always end in `Paise`.
- All user-facing text is trimmed; emails lowercased.
- Enums are constants in `config/constants.js` and validated by Zod + Mongoose.
- All schemas use `toJSON` transform: `_id` → `id`, remove `__v`, `passwordHash`, `deletedAt`.

### 3.2 User

```js
{
  name: String,                 // 2..80
  email: String,                // unique, lowercase, indexed
  passwordHash: String,         // select: false, bcrypt cost 12
  phone: String,                // optional, E.164-ish
  role: { type: String, enum: ["user","admin"], default: "user" },
  status: { type: String, enum: ["active","suspended"], default: "active" },
  emailVerifiedAt: Date,
  tokenVersion: Number,         // bumped on password change / logout-all
  lastLoginAt: Date,
  wishlist: [ObjectId],         // ref Product (bounded, ~200)
}
```

Indexes: `{ email: 1 }` unique; `{ role: 1 }`.
**Never** store the cart on the user document.

### 3.3 Address

```js
{
  userId: ObjectId,             // indexed
  label: String,                // "Home", "Work"
  recipientName: String,
  phone: String,
  line1: String,
  line2: String,
  landmark: String,
  city: String,
  state: String,
  pincode: String,              // 6-digit India
  geo: { type: "Point", coordinates: [lng, lat] },  // optional, 2dsphere
  isDefault: Boolean,
  deletedAt: Date,
}
```

Indexes: `{ userId: 1, isDefault: -1 }`; `{ geo: "2dsphere" }` optional.

### 3.4 Category

```js
{
  name: String,                 // unique
  slug: String,                 // unique, indexed
  description: String,
  imageUrl: String,
  sortOrder: Number,
  isActive: Boolean,            // default true
  deletedAt: Date,
}
```

### 3.5 Product (collection: `foods` to preserve existing data)

```js
{
  name: String,
  slug: String,                 // unique, indexed
  description: String,
  shortDescription: String,     // max 160
  categoryId: ObjectId,         // ref Category, indexed
  pricePaise: Number,           // integer > 0
  compareAtPricePaise: Number,  // nullable, must be > pricePaise
  image: { url, publicId, width, height, blurDataUrl },
  gallery: [{ url, publicId, width, height }],
  isVeg: Boolean,
  allergens: [String],
  ingredients: [String],
  nutrition: { calories, proteinG, carbsG, fatG },   // optional
  prepTimeMinutes: Number,      // default 25
  ratingAvg: Number,            // 0..5, denormalized
  ratingCount: Number,          // denormalized
  stock: Number,                // integer >= 0
  isAvailable: Boolean,         // manual toggle
  isFeatured: Boolean,
  isBestseller: Boolean,
  isNew: Boolean,
  tags: [String],
  deletedAt: Date,
}
```

Indexes: `{ slug: 1 }` unique; `{ categoryId: 1, isAvailable: 1, deletedAt: 1 }`; `{ pricePaise: 1 }`; text index on `{ name: "text", description: "text", tags: "text" }`.
Derived rule: `isOrderable = isAvailable && stock > 0 && !deletedAt`.

### 3.6 Cart

One document per owner, either `userId` **or** `guestToken` (never both).

```js
{
  userId: ObjectId,             // sparse unique
  guestToken: String,           // sparse unique, random 32 bytes
  items: [{ productId: ObjectId, quantity: Number, addedAt: Date }],
  couponCode: String,
  updatedAt: Date,
}
```

Indexes: `{ userId: 1 }` unique sparse; `{ guestToken: 1 }` unique sparse; `{ updatedAt: 1 }` TTL 30 days for guest carts.
Cart is **not** pricing authority; totals are computed at read time from current product prices.

### 3.7 Order

Immutable snapshots — later product edits must not change history.

```js
{
  orderNumber: String,          // "FD-20261101-8F3K2", unique sparse
  userId: ObjectId,             // indexed
  items: [{
    productId: ObjectId,
    name: String,
    imageUrl: String,
    unitPricePaise: Number,
    quantity: Number,
    lineTotalPaise: Number,
  }],
  pricing: {
    subtotalPaise: Number,
    discountPaise: Number,
    deliveryFeePaise: Number,
    taxPaise: Number,
    totalPaise: Number,
    currency: "INR",
    taxRateBps: Number,         // e.g. 500 = 5%
  },
  couponCode: String,
  addressSnapshot: { ...Address fields... },
  status: String,               // see state machine
  paymentStatus: String,        // unpaid | paid | failed | refunded
  payment: {
    provider: "stripe",
    sessionId: String,
    paymentIntentId: String,
    method: String,
    paidAt: Date,
  },
  statusHistory: [{ status, at, byUserId, note }],
  idempotencyKey: String,
  placedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
}
```

Indexes: `{ userId: 1, createdAt: -1 }`; `{ status: 1, createdAt: -1 }`; `{ userId: 1, idempotencyKey: 1 }` unique partial on string keys; `{ "payment.sessionId": 1 }` unique sparse; `{ orderNumber: 1 }` unique.

### 3.8 Coupon

```js
{
  code: String,                 // uppercase, unique
  description: String,
  type: { type: String, enum: ["percent","fixed"] },
  percentBps: Number,           // 1000 = 10% (percent type)
  amountPaise: Number,          // fixed type
  maxDiscountPaise: Number,     // cap for percent type
  minSubtotalPaise: Number,
  firstOrderOnly: Boolean,
  usageLimit: Number,           // total, null = unlimited
  usedCount: Number,
  perUserLimit: Number,
  applicableCategoryIds: [ObjectId],
  startsAt: Date,
  expiresAt: Date,
  isActive: Boolean,
  deletedAt: Date,
}
```

`usedCount` counts live redemptions: it is incremented when a payment is
confirmed and decremented when a paid order is cancelled, so a cancelled
order hands its usage slot back. The admin status filter is date based
(`scheduled` = `startsAt` in the future, `expired` = `expiresAt` in the past,
`active` = enabled plus started and not expired) to match the badge the page
renders, and the redeemed-revenue analytics sum `pricing.discountPaise` over
orders that are neither cancelled nor payment-failed.

### 3.9 Review

```js
{
  productId: ObjectId,
  userId: ObjectId,
  orderId: ObjectId,            // verified-purchase link
  rating: Number,               // 1..5
  title: String,
  body: String,
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  deletedAt: Date,
}
```

Unique: `{ productId: 1, userId: 1, orderId: 1 }`. Denormalized rating is recalculated from approved reviews.

### 3.10 Session (refresh token)

```js
{
  userId: ObjectId,
  tokenHash: String,            // sha256 of refresh token, never raw
  familyId: String,             // rotation family
  replacedByTokenHash: String,
  userAgent: String,
  ip: String,
  expiresAt: Date,              // TTL index
  revokedAt: Date,
}
```

Indexes: `{ tokenHash: 1 }` unique; `{ userId: 1, revokedAt: 1 }`; TTL on `expiresAt`.

### 3.11 InventoryLog

```js
{ productId, delta, reason /* order|restock|adjust|cancel */, orderId, actorUserId, createdAt }
```

Only used for audit and debugging; current stock is `Product.stock`.

### 3.12 Setting (single document, key-based)

```js
{ key: "store", value: {
  name, supportEmail, supportPhone,
  deliveryFeePaise, freeDeliveryThresholdPaise,
  taxRateBps, minOrderPaise,
  deliveryEstimateMinutes: { min: 28, max: 34 },
  serviceablePincodes: [String],
  isAcceptingOrders: Boolean,
}}
```

---

## 4. Auth & Session Architecture

### 4.1 Tokens

| Token | Lifetime | Storage | Cookie flags |
|---|---|---|---|
| Access | 15 min | `HttpOnly` cookie `fd_at` | `Secure` (prod), `SameSite=Lax`, `Path=/` |
| Refresh | 30 days | `HttpOnly` cookie `fd_rt` | `Secure`, `SameSite=Strict`, `Path=/api/v1/auth` |
| CSRF | session | readable cookie `fd_csrf` | `Secure`, `SameSite=Lax`, `Path=/` |
| Guest cart | 30 days | `localStorage` | n/a |

**Access claims:** `{ sub, role, ver, jti, iat, exp }`. `ver` must equal `User.tokenVersion`.
**Refresh payload:** random 32-byte opaque string; only its SHA-256 hash is stored.
**Rotation:** every refresh invalidates the old session row and issues a new refresh token in the same `familyId`. Reuse of an already-rotated token revokes the whole family (theft detection) and forces re-login.

### 4.2 Flows

```text
Register/Login
  -> validate (zod)
  -> verify credentials (bcrypt, dummy hash on missing user to avoid timing leak)
  -> create Session(refreshHash, familyId)
  -> set fd_at, fd_rt, fd_csrf
  -> { data: { user } }

Bootstrap
  GET /auth/me -> authenticate -> { data: { user } } | 401

Refresh
  POST /auth/refresh (cookie only)
  -> find session by hash, check expiry/revoked
  -> if rotated previously: revoke family, 401
  -> rotate session, re-issue both cookies
  -> { data: { user } }
```

### 4.3 Authorization

- `authenticate` verifies the access cookie, loads the user, rejects `status != active`, and attaches `req.user`.
- `requireRole("admin")` reads `req.user.role` only. `req.body.role` is never consulted anywhere.
- Ownership is enforced in services (`order.userId === req.user.id`), not inferred from request body.
- Registration ignores any `role` field (Zod `.strict()` rejects it with 400).

### 4.4 CSRF

For every non-GET request using cookies:

1. `Origin`/`Referer` must match `CLIENT_URL` (allowlist in dev).
2. `fd_csrf` cookie must equal `X-CSRF-Token` header (double submit, constant-time compare).
3. `SameSite` cookies are the second layer.

The API client fetches `GET /auth/csrf` when it is missing and retries once on `INVALID_CSRF`.

### 4.5 Logout and revocation

- `POST /auth/logout`: revoke current session, clear all three cookies.
- `POST /auth/logout-all`: revoke all sessions and bump `tokenVersion`, invalidating live access tokens.
- Password change/reset: bump `tokenVersion` and revoke all sessions except the current one.

### 4.6 Password rules

- 8–72 chars (bcrypt limit), at least one letter and one number, reject a small common-password list.
- bcrypt cost 12.
- Login error is always `INVALID_CREDENTIALS` regardless of whether the email exists.
- Email verification and password reset tokens are 32 bytes, hashed at rest, single-use, 30 min / 24 h expiry.

---

### 4.7 Admin permissions and suspension

- Role defaults live in `backend/src/config/permissions.js` (`ROLE_PERMISSIONS`); `GET /admin/staff/roles` exposes the catalogue so the UI and the API never drift.
- A staff account may carry an explicit `permissions[]` override. `resolvePermissions(user)` **replaces** the role defaults entirely (it does not merge), so a support account granted `overview:read` + `coupons:read` loses `orders:read` until it is granted back. The frontend mirrors this: `PermissionRoute` gates routes and the sidebar hides nav items the session cannot use.
- `POST /admin/staff` and `PATCH /admin/staff/:id` accept `staffRole`, `permissions` and `status`; `status: "suspended"` is enforced in `auth.service.js` (`403 FORBIDDEN`, "This account has been suspended") on every sign-in, so suspension is a real lockout rather than a UI-only flag.
- The customer app bootstraps the session once (`useAuth.bootstrap`) and records `bootstrapped` in `auth.store.js`. `AdminLoginGuard` only replaces the form with a skeleton **before** that first check settles: the guard used to unmount `AdminLoginPage` whenever `status` became `loading`, which also happened during a submit, wiping the typed credentials and the inline server error (a suspended account saw an empty form instead of the 403 message).

## 5. API Contract

### 5.1 Conventions

| Concern | Contract |
|---|---|
| Base path | `/api/v1` |
| Content type | `application/json` (except webhook raw body, multipart upload) |
| Auth | `fd_at` cookie; admin routes additionally require `role=admin` |
| CSRF | `X-CSRF-Token` on every mutation |
| Idempotency | `Idempotency-Key` header on `POST /orders` and `POST /payments/checkout` |
| Success | `{ "data": ..., "meta": { ... } }` |
| Error | `{ "error": { "code", "message", "details", "requestId" } }` |
| Pagination | `?page=1&limit=20` (max 100) → `meta: { page, limit, total, totalPages }` |
| Sorting | `?sort=-createdAt` or `?sort=pricePaise` |
| Filtering | Explicit allowlisted query params per endpoint |
| Validation | 400 `VALIDATION_ERROR` with `details: [{ field, message }]` |
| Not found | 404 `NOT_FOUND` |
| Auth failure | 401 `UNAUTHENTICATED` / `SESSION_EXPIRED` |
| Forbidden | 403 `FORBIDDEN` |
| Conflict | 409 `CONFLICT` (stock, coupon, duplicate) |
| Rate limit | 429 `RATE_LIMITED` + `Retry-After` |
| Server error | 500 `INTERNAL_ERROR` with `requestId`, no stack in body |

**Error codes (fixed vocabulary):** `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CSRF`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `OUT_OF_STOCK`, `PRODUCT_UNAVAILABLE`, `COUPON_INVALID`, `COUPON_EXPIRED`, `PAYMENT_REQUIRED`, `PAYMENT_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

### 5.2 Auth endpoints

| Method | Path | Access | Request | Response |
|---|---|---|---|---|
| POST | `/auth/register` | public | `{ name, email, password }` | `201 { user }` + cookies |
| POST | `/auth/login` | public | `{ email, password }` | `200 { user }` + cookies |
| POST | `/auth/logout` | auth | — | `204` |
| POST | `/auth/logout-all` | auth | — | `204` |
| POST | `/auth/refresh` | refresh cookie | — | `200 { user }` |
| GET | `/auth/me` | auth | — | `200 { user }` |
| GET | `/auth/csrf` | public | — | `200 { csrfToken }` + cookie |
| POST | `/auth/verify-email` | public | `{ token }` | `200` |
| POST | `/auth/resend-verification` | auth | — | `202` |
| POST | `/auth/forgot-password` | public | `{ email }` | `202` always |
| POST | `/auth/reset-password` | public | `{ token, password }` | `200` + cookies |
| PATCH | `/auth/password` | auth | `{ currentPassword, newPassword }` | `200` + cookies |

`user` shape: `{ id, name, email, phone, role, emailVerified, createdAt }` — never `passwordHash`.

### 5.3 User endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| PATCH | `/users/me` | auth | `{ name?, phone? }` |
| GET | `/users/me/addresses` | auth | own only |
| POST | `/users/me/addresses` | auth | max 10 |
| PATCH | `/users/me/addresses/:id` | auth | ownership |
| DELETE | `/users/me/addresses/:id` | auth | soft delete |
| GET | `/users/me/wishlist` | auth | hydrated products |
| POST | `/users/me/wishlist/:productId` | auth | idempotent add |
| DELETE | `/users/me/wishlist/:productId` | auth | idempotent remove |

### 5.4 Catalog endpoints

| Method | Path | Access | Query / body |
|---|---|---|---|
| GET | `/categories` | public | `?active=true` |
| GET | `/products` | public | `?category=slug&q=&veg=&minPricePaise=&maxPricePaise=&sort=&page=&limit=&featured=&bestseller=&new=` |
| GET | `/products/:slug` | public | returns product + category + related |
| GET | `/products/:id/related` | public | `?limit=8` |
| GET | `/search` | public | `?q=&page=&limit=` (same filters) |
| GET | `/reviews` | public | `?productId=&page=&limit=` approved only |
| POST | `/reviews` | auth | `{ productId, orderId, rating, title, body }` verified purchase |
| PATCH | `/reviews/:id` | auth | own review, re-enters moderation |
| DELETE | `/reviews/:id` | auth | own review |

Product list item shape:

```json
{
  "id": "...",
  "name": "Paneer Tikka Bowl",
  "slug": "paneer-tikka-bowl",
  "shortDescription": "Charred paneer, saffron rice, mint.",
  "image": { "url": "...", "width": 800, "height": 600, "blurDataUrl": "..." },
  "pricePaise": 24900,
  "compareAtPricePaise": 29900,
  "category": { "id": "...", "name": "Bowls", "slug": "bowls" },
  "isVeg": true,
  "ratingAvg": 4.6,
  "ratingCount": 128,
  "prepTimeMinutes": 25,
  "stock": 12,
  "isAvailable": true,
  "isBestseller": true
}
```

### 5.5 Cart endpoints

| Method | Path | Access | Body | Notes |
|---|---|---|---|---|
| GET | `/cart` | optional auth | — | Returns computed cart; guest via `X-Guest-Token` or cookie |
| POST | `/cart/items` | optional auth | `{ productId, quantity }` | `quantity` default 1; adds |
| PATCH | `/cart/items/:productId` | optional auth | `{ quantity }` | `0` removes |
| DELETE | `/cart/items/:productId` | optional auth | — | |
| DELETE | `/cart` | optional auth | — | clears items + coupon |
| POST | `/cart/merge` | auth | `{ guestToken }` | sums quantities, clamps to stock |
| POST | `/cart/coupon` | optional auth | `{ code }` | validates, stores code |
| DELETE | `/cart/coupon` | optional auth | — | |

Cart response is the single source of display totals:

```json
{
  "items": [
    {
      "productId": "...",
      "name": "...",
      "imageUrl": "...",
      "unitPricePaise": 24900,
      "quantity": 2,
      "lineTotalPaise": 49800,
      "stock": 12,
      "isAvailable": true,
      "maxQuantity": 10
    }
  ],
  "pricing": {
    "subtotalPaise": 49800,
    "discountPaise": 5000,
    "deliveryFeePaise": 3900,
    "taxPaise": 2240,
    "totalPaise": 50940,
    "currency": "INR",
    "freeDeliveryThresholdPaise": 49900
  },
  "coupon": { "code": "WELCOME10", "description": "10% off", "discountPaise": 5000 },
  "updatedAt": "..."
}
```

Guest carts are identified by a `fd_guest` `HttpOnly` cookie so totals are still computed server-side.

### 5.6 Order and payment endpoints

| Method | Path | Access | Body / query |
|---|---|---|---|
| POST | `/orders` | auth | `{ addressId, couponCode?, idempotencyKey, notes? }` |
| GET | `/orders` | auth | `?status=&page=&limit=` own only |
| GET | `/orders/:id` | auth | own or admin |
| POST | `/orders/:id/cancel` | auth | `{ reason }` only before `preparing` |
| POST | `/orders/:id/reorder` | auth | adds available items back to cart |
| POST | `/payments/checkout` | auth | `{ orderId }` → `{ sessionUrl }` |
| GET | `/payments/session/:sessionId` | auth | read-only status lookup |
| POST | `/payments/webhook` | Stripe signature | raw body; no auth cookie |

`POST /orders` **does not** accept items or prices. It builds the snapshot from the server cart, validates stock, applies the coupon, calculates totals, and stores `status = "pending_payment"`, `paymentStatus = "unpaid"`.
`POST /payments/checkout` sets `payment.sessionId` and returns the Stripe URL; totals come from the stored order, never the client.
`GET /payments/session/:id` is used by `/verify` only to render a provisional UI; the webhook is the authority.

### 5.7 Admin endpoints

All `/admin/*` require `authenticate` + `requireRole("admin")` + CSRF, and write an audit entry for mutations.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/overview` | KPIs: revenue, orders, AOV, customers, recent orders, 7/30-day series; `from`/`to` scope the analysis panels, while `today`/`activeOrderCount`/`pendingOrderCount` stay present-tense |
| GET | `/admin/products` | `?q=&category=&isAvailable=&stock=low&archived=true&page=` — `archived=true` lists soft-deleted products only |
| POST | `/admin/products` | create |
| PATCH | `/admin/products/:id` | update |
| DELETE | `/admin/products/:id` | soft delete (archive) |
| POST | `/admin/products/:id/restore` | restore an archived product to the live catalog |
| PATCH | `/admin/products/:id/stock` | `{ delta }` or `{ stock }` with reason |
| GET | `/admin/categories` / POST / PATCH / DELETE | CRUD + single-step reorder (`PATCH /admin/categories/:id/reorder`) |
| PATCH | `/admin/categories/reorder` | `{ order: [categoryId, …] }` — persists the full menu order (drag-and-drop); ids that are omitted keep their relative order at the end |
| GET | `/admin/orders` | `?status=&q=&from=&to=&page=` |
| GET | `/admin/orders/:id` | full detail + customer + history |
| PATCH | `/admin/orders/:id/status` | `{ status }` valid transition only |
| POST | `/admin/orders/:id/cancel` | `{ reason }` + restock |
| GET | `/admin/customers` | `?q=&role=&status=&sort=&page=` |
| GET | `/admin/customers/:id` | profile + orders + saved addresses |
| PATCH | `/admin/customers/:id/role` | promote/demote (cannot self-demote) |
| GET | `/admin/customers/export` | CSV of the filtered customer list |
| GET/POST/PATCH/DELETE | `/admin/coupons` | CRUD + usage stats |
| GET | `/admin/reviews` | `?status=` |
| PATCH | `/admin/reviews/:id` | approve/reject |
| GET/PATCH | `/admin/settings` | store config |
| POST | `/admin/uploads` | multipart image, validated, returns `{ url, publicId, width, height }` |

Every list endpoint returns `meta` pagination. Admin CSV export exists for the
customer directory, the coupon redemptions and the inventory log
(`/admin/customers/export`, `/admin/coupons/:id/redemptions/export`,
`/admin/inventory/export`).

### 5.8 Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | liveness `{ status: "ok" }` |
| GET | `/readyz` | DB ping + config readiness |

---

## 6. Pricing Engine

`services/pricing.service.js` is the only place totals are produced.

### 6.1 Rules

1. Subtotal = Σ (`product.pricePaise` × quantity), using current DB prices at order creation, frozen into the order.
2. Coupon discount:
   - `percent`: `floor(subtotal × percentBps / 10000)`, capped by `maxDiscountPaise`.
   - `fixed`: `min(amountPaise, subtotal)`.
   - Never exceeds subtotal.
3. Taxable base = `subtotal − discount`.
4. Tax = `round(taxableBase × taxRateBps / 10000)` (half-up).
5. Delivery fee = `0` if `taxableBase >= freeDeliveryThresholdPaise`, else configured `deliveryFeePaise`.
6. Total = `taxableBase + tax + deliveryFee`.
7. All intermediates are integers; no floats cross the API boundary.
8. Coupon validity is re-checked at order creation, not only at apply time.
9. Minimum order is checked against `taxableBase`.
10. Stock is validated for every line before creating the order and re-decremented atomically in the payment transaction.

### 6.2 Worked example

| Line | Value |
|---|---|
| Subtotal | 49800 |
| Coupon 10%, cap 5000 | −4980 |
| Taxable base | 44820 |
| Tax 5% | 2241 |
| Delivery (threshold 49900) | 3900 |
| **Total** | **50961 paise** = INR 509.61 |

### 6.3 Money helpers

```js
formatINR(50940)        // "INR 509.40"  (symbol applied in UI copy)
formatINRCompact(50940) // "INR 509"
percentOf(paise, bps)   // integer
```

No component does `price / 100` inline.

---

## 7. Order & Payment State Machines

### 7.1 Order status

```text
pending_payment ──paid──> confirmed ──> preparing ──> out_for_delivery ──> delivered
       │                      │               │
       │ expired              │ cancel        │ cancel (admin, with reason)
       v                      v               v
   payment_failed         cancelled       cancelled
                                      delivered ──> refunded (admin, post-delivery)
```

Allowed transitions (enforced in `order.service.js`):

| From | To | Actor |
|---|---|---|
| `pending_payment` | `confirmed`, `payment_failed` | webhook |
| `confirmed` | `preparing`, `cancelled` | admin / user (cancel window) |
| `preparing` | `out_for_delivery`, `cancelled` | admin |
| `out_for_delivery` | `delivered`, `cancelled` (exception) | admin |
| `delivered` | `refunded` | admin |

Illegal transitions return `409 CONFLICT`. Every transition appends `{ status, at, byUserId, note }` to `statusHistory`.

### 7.2 Payment status

`unpaid → paid | failed → refunded`.

- `stripe.checkout.session.completed` → `paid`, order `confirmed`, stock decremented, cart cleared, `inventoryLog` written.
- `stripe.checkout.session.expired` / `async_payment_failed` → `failed`; order stays `pending_payment` briefly then `payment_failed`; stock untouched.
- `charge.refunded` → `refunded` + restock.
- Webhook handler is idempotent: it stores processed event IDs for 30 days and returns `200` for duplicates.
- Webhook route uses `express.raw({ type: "application/json" })`, verifies `stripe.webhooks.constructEvent`, and is excluded from CSRF/auth middleware.
- Orders whose payment never completes are swept by a scheduled job after 24 h to `payment_failed`.

### 7.3 Transactions

Order creation and payment confirmation use MongoDB transactions:

```text
payment webhook:
  session.withTransaction(async () => {
    claim event id (unique insert)         // idempotency
    load order, assert pending_payment
    for each item: conditional $inc stock by -qty
    write inventory logs
    set paymentStatus=paid, status=confirmed, payment.*
    delete cart items
  })
```

Conditional update: `updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })`; any zero-match aborts with `OUT_OF_STOCK` and triggers a refund path.

---

## 8. Frontend Architecture

### 8.1 Routes

| Path | Page | Access |
|---|---|---|
| `/` | Home | public |
| `/menu` | Menu | public |
| `/menu/:categorySlug` | Menu (filtered) | public |
| `/product/:slug` | Product detail | public |
| `/search` | Search | public |
| `/cart` | Cart | public (guest allowed) |
| `/checkout` | Checkout | auth |
| `/verify` | Payment return | auth |
| `/orders` | Orders | auth |
| `/orders/:id` | Order detail | auth |
| `/account` | Account overview | auth |
| `/account/profile`, `/account/addresses`, `/account/wishlist`, `/account/security` | Account tabs | auth |
| `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Auth | public (redirect if signed in) |
| `/admin/login` | Admin login | public |
| `/admin` | Overview | admin |
| `/admin/products`, `/products/new`, `/products/:id` | Products | admin |
| `/admin/categories`, `/admin/orders`, `/admin/orders/:id`, `/admin/customers`, `/admin/coupons`, `/admin/reviews`, `/admin/settings` | Admin | admin |
| `*` | NotFound | public |

All pages except Home/Login are `React.lazy` route-split. `ProtectedRoute` checks `authStatus === "authenticated"` and `user.role` from `/auth/me` — never `localStorage`.

### 8.2 State ownership

| State | Owner | Persistence |
|---|---|---|
| Session user | `auth.store` (Zustand) | memory; hydrated by `GET /auth/me` |
| Cart (server) | TanStack Query `["cart"]` | server |
| Guest cart | `cartUi.store` | `localStorage`, merged on login |
| Wishlist | TanStack Query `["wishlist"]` | server |
| Products/categories/search | TanStack Query | server cache, staleTime 60s (catalog), 5 min (categories) |
| Orders | TanStack Query | server, `refetchInterval` 30s while active |
| UI (drawer, modals, toasts) | `ui.store` | memory |
| Filters/sort/page | URL search params | URL |
| Form state | react-hook-form + zod | memory |

Rule: **no server data is copied into Zustand.** Zustand holds UI intent only.

### 8.3 API client

`src/api/client.js`:

- `axios.create({ baseURL: import.meta.env.VITE_API_URL + "/api/v1", withCredentials: true })`
- Request interceptor: attach `X-CSRF-Token` from `fd_csrf` for non-GET; verify `Origin` implicitly via same-origin.
- Response interceptor:
  - `401 SESSION_EXPIRED` → single-flight `POST /auth/refresh`, replay the original request once.
  - Second failure → clear auth store, redirect to `/login?next=<path>`.
  - Normalize `error.error` into `ApiError { code, message, details, requestId }`.
- No token reading or writing in JS. No `localStorage` auth.

### 8.4 Query conventions

```js
queryKeys = {
  auth: ["auth", "me"],
  cart: ["cart"],
  categories: ["categories"],
  products: (filters) => ["products", filters],
  product: (slug) => ["product", slug],
  orders: (filters) => ["orders", filters],
  order: (id) => ["order", id],
  admin: { overview: ["admin","overview"], products: (f) => ["admin","products",f], ... },
}
```

- Optimistic cart updates with rollback on `OUT_OF_STOCK`/`PRODUCT_UNAVAILABLE`.
- Invalidate `["cart"]` after add/update/remove/coupon, and after login/logout.
- Checkout success invalidates `["cart"]`, `["orders"]`, `["order", id]`.
- Search is debounced 250 ms and uses TanStack Query `signal` to cancel stale requests.

### 8.5 Providers

```text
<QueryClientProvider>
  <RouterProvider>
    <AuthProvider>        // /auth/me on mount, refresh handling, redirect logic
      <ToastProvider>
        <UiProvider>      // drawer + modal portal root
```

Error boundary wraps the router; a global `ErrorState` renders on render crashes with `requestId` when available.

### 8.6 Admin in-app

- `/admin/*` shares tokens and UI primitives, uses `AdminLayout` (240px sidebar, 64px topbar) and denser spacing (`--space-2`/`--space-3`).
- Admin guard waits for `/auth/me`; non-admins get a 403 page, unauthenticated users go to `/admin/login`.
- Data tables use TanStack Query with server pagination/sorting; no client-side full-table loads.
- Sticky save bar for long forms; destructive actions require a typed confirmation or modal.

### 8.7 Food card grid

- Storefront grids use a fixed column plan instead of fluid `auto-fit`: **2 cards on mobile (< 768px), 4 on tablet (768-1199px), 5 on desktop (>= 1200px)**. `ProductGrid.module.css` owns the plan; `ProductRail.module.css` uses the same numbers for the home rails and their skeletons; the `dense` menu variant only tightens the gutters.
- Cards adapt to their track with a CSS container query rather than JS measuring: `.card` declares `container-type: inline-size`, and `@container (max-width: 250px)` stacks the footer, hides the optional description and the redundant view arrow, and shrinks the overlay chips so a 160px phone card stays legible. Tap targets keep their 44px minimum. On roomy cards (>= 251px) the photo rating pill is swapped for an inline rating and the delivery pill moves into the body.
- Cards carry a premium surface: warm gradient scrim over the photo with glass corner chips — a saffron discount ribbon with tag icon top‑right, a glass rating pill bottom‑left, a dark-glass delivery pill bottom‑right; photo zooms 1.07 on hover; the veg/non‑veg square is inline in the meta row; a tomato gradient Add CTA has a shine sweep on hover and press scale, and in‑cart state becomes a compact stepper, all while 44px touch targets are preserved.
- Loading skeletons share the grid classes, so the layout does not reflow when data lands.
- `frontend/e2e/product-grid.spec.js` pins the plan at 390/430/768/1280/1600px and asserts there is no horizontal overflow.
---

## 9. Security Baseline

### 9.1 Backend

- `helmet` with a strict CSP: `default-src 'self'`; images allow the asset host; `script-src 'self'`; `connect-src 'self'` + Stripe; `frame-ancestors 'none'`.
- `cors` allowlist from `CLIENT_URL` only; credentials enabled; no `*` with credentials.
- `express.json({ limit: "100kb" })`; webhook uses raw body before JSON parsing.
- `express-mongo-sanitize` (or Zod strict schemas + `isPlainObject` guards) to block operators in input.
- `express-rate-limit`: global 300/min/IP, auth 10/15min/IP+email, checkout 20/min/user, uploads 10/min/admin.
- Zod validation on body, query, and params; unknown keys rejected (`.strict()`).
- Centralized `errorHandler`: maps `ApiError`; logs stack + `requestId`; never leaks internals.
- `requestId` (UUID) on every request, echoed in errors and logs.
- Logging via `pino`: no passwords, tokens, cookies, or full request bodies for auth routes.
- Admin mutation audit log (`AuditLog` model or structured log): actor, action, target, before/after diff summary.
- Uploads: 5 MB max, MIME allowlist `image/jpeg|png|webp|avif`, magic-byte check, random UUID filename, images re-encoded (sharp) to strip metadata.
- Static `/images` served with long cache headers and `Content-Disposition: inline`; never executes.
- Cookies: `Secure` in production, `HttpOnly` for `fd_at`/`fd_rt`, no `Domain` attribute (host-only).
- `trust proxy` set only when `NODE_ENV=production`.
- Graceful shutdown: stop accepting, close server, close DB.
- Secrets only from validated env; `config/env.js` fails startup if any required key is missing.

### 9.2 Frontend

- No secrets in the bundle; only `VITE_*` public values.
- No `dangerouslySetInnerHTML` on user content.
- All prices/summaries rendered from server responses.
- Link previews only via server-controlled metadata.
- `rel="noopener noreferrer"` on external links.
- Dependency audit in CI (`npm audit --omit=dev` fails on high/critical).

### 9.3 Rate-limit and abuse notes

- Guest cart creation is rate-limited per IP to prevent cart flooding.
- Login throttling counts only failures.
- Coupon application returns generic `COUPON_INVALID` to prevent code enumeration.

---

## 10. Configuration

### 10.1 Backend env

| Key | Required | Notes |
|---|---|---|
| `NODE_ENV` | no | `development` (default) / `test` / `production` |
| `PORT` | no | default 4000 |
| `MONGO_URI` | yes | env only, never source. Defaults to a local test database when `NODE_ENV=test` |
| `JWT_SECRET` | yes | >= 32 characters. Defaults to a test-only value when `NODE_ENV=test` |
| `ACCESS_TOKEN_TTL` | no | default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | no | default `30` |
| `CLIENT_URL` | no | default `http://localhost:5173`. CORS + CSRF origin check + Stripe redirect base |
| `ADDITIONAL_ORIGINS` | no | extra CORS/CSRF origins, comma separated (e.g. the deployed frontend) |
| `COOKIE_DOMAIN` | no | empty in dev; the shared domain in production so the cookie reaches every host |
| `TRUST_PROXY` | no | default `false`; set to `true` behind a proxy so rate limits see the real client IP |
| `STRIPE_SECRET_KEY` | production | payments |
| `STRIPE_WEBHOOK_SECRET` | production | webhook signature check |
| `STORAGE_DRIVER` | no | `local` (default) / `cloudinary` |
| `CLOUDINARY_URL` | no | required when driver is cloudinary |
| `LOG_LEVEL` | no | default `info` (`silent` in tests) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | no | only used by `npm run seed:admin`, never on boot |

### 10.2 Frontend env

| Key | Required | Notes |
|---|---|---|
| `VITE_API_URL` | no | default `/api/v1`; absolute URL in production |

Only `VITE_API_URL` is read by the app (`frontend/src/api/client.js`). There is
no `VITE_STRIPE_PUBLISHABLE_KEY` — checkout runs through a backend Stripe
Checkout session — and no `VITE_APP_NAME` — the brand name is hardcoded.

---

## 11. Testing Strategy

| Layer | Tool | Coverage gate |
|---|---|---|
| Unit (pricing, coupons, state machines, money) | Vitest | 90% for `services/pricing`, `coupon`, `money` |
| Backend integration (routes + DB memory/replica set) | Vitest + Supertest | auth, catalog, cart, orders, payments, admin RBAC |
| Frontend components | Vitest + Testing Library | primitives, cart, checkout form, product card |
| E2E | Playwright | browse → add → checkout → verify; admin login → status change; guest cart merge |
| Accessibility | axe in component tests + manual keyboard pass | no serious/critical |
| Visual | Playwright screenshots | 375 / 768 / 1440 for Home, Menu, Cart, Admin |

Required negative tests:
- Registration with `role: "admin"` is rejected.
- `POST /orders` with client prices is rejected/ignored.
- Payment without webhook does not mark the order paid.
- Replayed idempotency key returns the same order.
- Rotated refresh token reuse revokes the family.
- Admin endpoints return 403 for `user`.
- Stock oversell returns 409 and no partial deduction.

CI order: `lint` → `typecheck` (if TS adopted) → unit → integration → build → Playwright (headless).

---

## 12. Migration Plan (Current MVP to Target)

### 12.1 Endpoint mapping

The legacy endpoints below were deleted on 2026-11-16; `/api/user`, `/api/food`,
`/api/cart` and `/api/orders` now answer `410 LEGACY_API_REMOVED`. The mapping
is kept as the migration reference for any external client that still calls them.

| Legacy | Target |
|---|---|
| `POST /api/user/register` | `POST /api/v1/auth/register` |
| `POST /api/user/login` | `POST /api/v1/auth/login` |
| `GET /api/user/profile` | `GET /api/v1/auth/me` |
| `GET /api/user/admin` | removed (role in `/auth/me`) |
| `GET /api/food/list` | `GET /api/v1/products` |
| `POST /api/food/add` | `POST /api/v1/admin/products` |
| `POST /api/food/remove` | `DELETE /api/v1/admin/products/:id` |
| `POST /api/cart/*` | `/api/v1/cart` + `/cart/items` |
| `POST /api/orders/placeOrder` | `POST /api/v1/orders` + `POST /api/v1/payments/checkout` |
| `POST /api/orders/verify` | `GET /api/v1/payments/session/:id` |
| `POST /api/orders/userOrders` | `GET /api/v1/orders` |
| `GET /api/orders/listOrders` | `GET /api/v1/admin/orders` |
| `POST /api/orders/status` | `PATCH /api/v1/admin/orders/:id/status` |

### 12.2 Data migration script (`scripts/migrateV1.js`)

1. Users: keep `email`, `password` → `passwordHash`, set `tokenVersion = 0`, default `role` stays, set `emailVerifiedAt = null`.
2. Products: `price` (whole INR) → `pricePaise = price * 100`; generate `slug`; default `stock = 100`, `isAvailable = true`, `prepTimeMinutes = 25`; `category` string → `Category` document + `categoryId`.
3. Carts: `user.cartData` object → `Cart` documents with `items`.
4. Orders: `amount` → `pricing.totalPaise = amount * 100`; `items[]` → snapshots with `unitPricePaise`; `date` → `placedAt` + timestamps; `status` map (`Food Processing` → `confirmed`); `payment` → `paymentStatus`.
5. Drop embedded `cartData` after cart migration.

### 12.3 Rollout order

1. Add env validation + remove secrets (already partially done) and legacy cleanup.
2. Ship new models + auth + catalog behind `/api/v1` while the old routes still run.
3. Migrate data with `migrateV1.js` on a staging copy; verify counts and totals.
4. Move the frontend to the new API module by module (catalog → cart → auth → orders → checkout).
5. ~~Delete legacy routes and the standalone `admin/` app.~~ **Done 2026-11-16:**
   the pre-v1 routes, controllers, legacy models and JWT middleware are removed,
   the standalone `admin/` app is deleted, and the retired paths answer `410`.
6. Run the full verification gate.

---

## 13. Phase 4 Sequencing and Gates

| Sub-phase | Work | Gate |
|---|---|---|
| 4.1 | Env validation, helmet/CORS/rate limits, error handler, logging, request IDs, remove dead code | `npm run lint`, unit tests green, manual 401/403/429 checks |
| 4.2 | Models, auth, sessions, CSRF, roles, profile, addresses | Auth + RBAC integration tests; token rotation tests |
| 4.3 | Categories, products, search, reviews, uploads | Catalog integration tests; indexes verified with `explain` |
| 4.4 | Cart, pricing, coupons, stock, transactions, idempotency | Pricing + concurrency tests; no client-price acceptance |
| 4.5 | Stripe checkout + webhook + state machines | Webhook simulation tests; replay/idempotency tests |
| 4.6 | Design tokens, UI primitives, layout, Home/Menu/Product/Search | Build + lint + a11y + visual snapshots |
| 4.7 | Cart/Checkout/Orders/Account/Auth pages | Playwright purchase flow passes |
| 4.8 | Admin UI (overview, products, categories, orders, customers, coupons, reviews, settings) | Admin E2E + role tests |
| 4.9 | Motion pass (reveals, stagger, parallax, reduced motion) | Reduced-motion + performance checks |
| 4.10 | Performance: images, route splitting, query caching, DB indexes | Lighthouse budgets: LCP < 2.5s, CLS < 0.1, TBT < 200ms on mobile |
| 4.11 | Full security + accessibility audit | No high/critical findings; WCAG 2.2 AA spot checks |

**Status:** Phases 4.1–4.8 complete — backend `npm test` 61/61 green, frontend `npm run lint` 0 errors and `npm run build` green, admin routes verified at 1440px and 390px.

**Definition of done for Phase 4:** all P0/P1 audit findings closed, backend and frontend lint/build green, integration + E2E green, secrets out of history, and the customer + admin flows verified at 375 / 768 / 1440.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Stripe webhook not reachable in local dev | Use `stripe listen --forward-to localhost:4000/api/v1/payments/webhook`; integration test uses signed fixture events |
| Cookie auth breaks cross-site dev | Use Vite proxy so `/api` is same-origin; keep `CLIENT_URL` allowlist exact |
| Existing data has inconsistent prices | Migration doubles all money and runs a reconciliation report before cutover |
| Transactions require a replica set | Atlas provides it; local tests use `mongodb-memory-server` replica set mode |
| Admin merge inflates customer bundle | Lazy-load `/admin/*`; verify bundle budget in CI |
| Cart merge duplicates quantities | Merge is idempotent, clamps to stock, and returns the final cart |
| Coupon abuse | Per-user limits, usage counters updated inside the order transaction |
| Image storage migration | Storage adapter interface keeps `local` and `cloudinary` swappable |

---

## 15. Open Items

1. Brand name/logo (still placeholder).
2. Final GST rate and whether it is included in displayed prices or added at checkout.
3. Delivery-fee tiers and serviceable pincodes (config-driven; values needed from product).
4. Email provider for verification/reset (Resend/SES/SMTP) and template copy.
5. Stripe account mode (test vs live) and webhook endpoint registration.
6. Whether reviews are open to all users or verified purchases only (current design: verified purchase on create, edits re-enter moderation).
7. TypeScript adoption for the frontend during Phase 4 (recommended, not assumed).
