# PROJECT AUDIT — Food Delivery Platform

**Date:** 2026-11-01
**Repository:** `rahulrp17/Ecomerce-Food-Delivery`
**Audited revision:** `2d3ffcf` (`origin/master`)
**Audit type:** Phase 1 — read-only analysis. No application code was changed.
**Auditor:** Senior MERN architect / security / UI-UX review

---

## 1. Executive Summary

The project is a working **learning-stage MERN food ordering app** (customer site + separate admin app + Express/MongoDB API). It is not yet a production platform.

The customer app can list food, filter by category, register/login, keep a server-side cart, create a Stripe Checkout session, and show the user's orders. The admin app can add/remove food and change order status.

However, the current system has **critical security defects that must be fixed before any public deployment**:

| # | Severity | Finding |
|---|---|---|
| 1 | **Critical** | Live MongoDB credentials are hardcoded in source (`backend/config/db.js`) and a connection string is left in a comment (`backend/server.js`). |
| 2 | **Critical** | `backend/.env` (JWT secret + Stripe secret) is committed to Git and exists in history. |
| 3 | **Critical** | Any visitor can register as `admin` because `role` is accepted from the request body (`backend/controllers/userController.js`). |
| 4 | **Critical** | Admin authorization trusts a client-supplied `req.body.role` (`backend/middleware/auth.js`). |
| 5 | **Critical** | Food create/delete, order listing, and order status update are **completely unauthenticated** (`backend/routes/foodRoutes.js`, `backend/routes/orderRoutes.js`). |
| 6 | **Critical** | Payment verification trusts a client query parameter (`success=true`), so an order can be marked paid without paying (`backend/controllers/orderController.js`). |
| 7 | **High** | Order amount, item list, and prices are accepted from the client instead of recalculated from the database. |
| 8 | **High** | Login returns the full user document, including the bcrypt password hash. |
| 9 | **High** | Hardcoded admin account (`admin@gmail.com` / known password) is auto-created on startup. |
| 10 | **High** | JWTs are stored in `localStorage`; no refresh-token rotation, no cookies, no CSRF strategy, no rate limiting. |

**Recommendation:** Do not deploy the current backend publicly. Rotate the leaked MongoDB, JWT, and Stripe secrets immediately, then execute the security-first rebuild described in the phased plan (Section 12).

The visual layer is an early "Tomato"-style template: placeholder copy, fixed orange hero, no design tokens, no mobile navigation, no product details, no search, no wishlist, no offers, no customer dashboard, and no real admin dashboard. It needs a full design-system-led redesign, not a skin.

---

## 2. Scope & Method

### Inspected

- Repository structure, Git history, tracked/untracked files, ignore rules.
- All `package.json` files and lockfiles.
- Backend: server, config, routes, controllers, models, middleware, utils, uploads.
- Customer frontend: entry points, routing, context, components, pages, CSS, assets.
- Admin frontend: entry points, routing, components, pages, CSS, assets.
- Build, lint, syntax, dependency-audit, and asset-size baselines.

### Not inspected / not executed

- The backend server was **not started**, because starting it connects to the live MongoDB instance and auto-creates the hardcoded admin user. Starting it before secret rotation would cause side effects.
- No browser-based visual regression or Lighthouse run (no browser automation installed).
- No screenshot was attached to the request; the written visual direction was used instead.

### Commands used for the baseline

```text
frontend: npm ci ; npm run build ; npm run lint ; npm audit --omit=dev
admin:    npm ci ; npm run build ; npm run lint ; npm audit --omit=dev
backend:  node --check (all files) ; npm ls --depth=0 ; npm audit --omit=dev
```

---

## 3. Stack Inventory

| Layer | Current stack | Notes |
|---|---|---|
| Customer frontend | React 19, Vite 6, React Router 7, Axios, react-toastify | JavaScript only (no TypeScript) |
| Admin frontend | React 19, Vite 6, React Router 7, Axios, react-toastify | Separate app, no auth layer |
| Backend | Node.js, Express 5, Mongoose 8, JWT, bcrypt, Multer, Stripe, validator | ESM (`"type": "module"`) |
| Database | MongoDB Atlas | URI hardcoded in source |
| Payments | Stripe Checkout (redirect mode) | No webhook, no server-side price authority |
| Styling | Plain CSS + hardcoded values | Tailwind is installed but **not configured or used** |
| State | React Context (`StoreContext`) | No Zustand, no TanStack Query |
| Animation | None | No Framer Motion / Motion / GSAP |
| Testing | None | No unit, integration, or E2E tests |
| CI/CD | None | No workflows, Docker, or deployment config |
| Docs | Default Vite READMEs | No root README, no `.env.example` |

### Missing target dependencies

Frontend: `zustand`, `@tanstack/react-query`, `framer-motion` / `motion`, `lucide-react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `tailwindcss` wiring, `clsx`/`tailwind-merge` (optional).

Backend: `helmet`, `express-rate-limit`, `express-mongo-sanitize` or equivalent, `cookie-parser`, `zod` or `express-validator`, `compression`, a logger, `stripe` webhook support, `cloudinary` (if moving off local uploads), test runner (`vitest`/`supertest`), `playwright`.

---

## 4. Repository Map

```text
Food Delivery/
├── backend/
│   ├── .env                      # TRACKED SECRETS — must be removed/rotated
│   ├── server.js                 # Express entry, open CORS, no security middleware
│   ├── config/db.js              # hardcoded Atlas URI + admin bootstrap
│   ├── controllers/              # user, food, cart, order
│   ├── middleware/auth.js        # JWT + broken role check
│   ├── models/                   # user, food, order
│   ├── routes/                   # /api/user, /api/food, /api/cart, /api/orders
│   ├── utils/createAdmin.js      # hardcoded admin credentials
│   ├── uploads/                  # 30 local product images (~5.2 MB)
│   └── node_modules/             # COMMITTED (~2,950 files)
├── frontend/
│   ├── public/header_img.png     # 1.8 MB duplicate of src asset
│   ├── src/
│   │   ├── App.jsx, main.jsx
│   │   ├── context/StoreContext.jsx
│   │   ├── component/            # Navbar, Header, ExploreMenu, FoodDisplay, FoodItem,
│   │   │                         # LoginPopUp, Footer, AppDownload, Loader,
│   │   │                         # AdminNavbar/Sidebar (unused), 13 "- Copy" leftovers
│   │   ├── pages/                # Home, Cart, PlaceOrder, Verify, MyOrders
│   │   │                         # add/List/orders (unused copies of admin pages)
│   │   └── assets/               # 32 food PNGs, icons, logo, hero
│   └── ...
├── admin/
│   └── src/
│       ├── App.jsx, main.jsx     # no auth, no login route
│       ├── component/            # navbar, sidebar
│       └── pages/                # add, List, orders (+ "- Copy" leftovers)
└── PROJECT_AUDIT.md              # this report
```

### Repository hygiene issues

- `backend/node_modules/` is committed (massive repo bloat, non-reproducible).
- `backend/.env` is tracked; no `backend/.gitignore`, no root `.gitignore`.
- 13 untracked `*- Copy.*` files in `frontend/src` and `admin/src`.
- Duplicate/dead pages: `frontend/src/pages/{add,List,orders}` and `frontend/src/component/{Navbar/AdminNavbar,Sidebar}` are leftovers from the admin app.
- `frontend/src/ScrollTop.jsx` is an untracked duplicate of the tracked `ScrollToTop.jsx`.
- Stray Git ref `.git/refs/remotes/origin/master - Copy` causes `git log --all` to fail with `fatal: bad object`.
- No root `README.md`, no `.env.example`, no CI, no tests.

---

## 5. Current Functionality (What Works Today)

| Capability | Status | Notes |
|---|---|---|
| List food | Works | `GET /api/food/list`, no pagination/search/filter server-side |
| Filter by category | Works client-side | Categories are hardcoded in `frontend/src/assets/assets.js`, not from backend |
| Register / login | Works | Email + password, bcrypt, JWT (7 days) |
| Persistent cart | Works | Cart stored as an object on the user document |
| Guest cart | Partial | Client-side only; merges on login only after reload |
| Stripe Checkout redirect | Works mechanically | But price/amount is client-controlled and verification is insecure |
| My Orders | Works | List only; no details, tracking timeline, payment status, or date |
| Admin add food | Works | Unauthenticated; image upload with no validation |
| Admin list/remove food | Works | Unauthenticated; removal deletes file best-effort |
| Admin view orders | Works | Unauthenticated; leaks all customer data |
| Admin change status | Works | Unauthenticated; any status string accepted |
| Static images | Works | `/images/<file>` from local `uploads/` |
| Mobile navigation | Missing | Menu is hidden below 750 px with no drawer |
| Search / wishlist / offers / product details / profile / addresses | Missing | No routes, APIs, or models |

### Verified baseline results

| Check | Result |
|---|---|
| Frontend `npm run build` | **Pass** — 183 modules, JS 289.58 kB (101.16 kB gzip), CSS 12.02 kB (3.06 kB gzip), dist ≈ 11 MB |
| Admin `npm run build` | **Pass** — 110 modules, JS 303.52 kB (103.75 kB gzip), CSS 17.27 kB (3.63 kB gzip) |
| Backend `node --check` | **Pass** — all source files parse |
| Frontend `npm run lint` | **Fail** — 2 errors, 4 warnings (`App.jsx:27` unused `role`, `Verify.jsx:10` unused `setSearchParams`, hook deps) |
| Admin `npm run lint` | **Pass with warning** — 1 hook-deps warning |
| Backend `npm ls` | Extraneous package `ry@0.1.0`; `nodemon` and `body-parser` in production dependencies |
| Frontend `npm audit --omit=dev` | **12 advisories** (2 critical, 9 high, 1 moderate) — includes `axios`, `form-data`, `react-router`, `vite`, `rollup` |
| Backend `npm audit --omit=dev` | **11 advisories** (1 critical, 9 high, 1 moderate) — includes `validator`, `qs`, `mongoose`, `picomatch` |

---

## 6. API Inventory (Current Contract)

| Method | Path | Auth | Purpose | Problems |
|---|---|---|---|---|
| POST | `/api/user/register` | None | Register | Accepts client `role`; weak password policy; enumeration |
| POST | `/api/user/login` | None | Login | Returns password hash; enumeration; no rate limit |
| GET | `/api/user/profile` | JWT | Profile | Crashes: `req.user` is never set |
| GET | `/api/user/admin` | JWT + role | Admin check | Role comes from request body; `req.user` undefined |
| GET | `/api/food/list` | None | List food | No pagination, search, filter, cache |
| POST | `/api/food/add` | **None** | Create food | Public destructive endpoint; no validation; upload abuse |
| POST | `/api/food/remove` | **None** | Delete food | Public destructive endpoint |
| POST | `/api/cart/addToCart` | JWT | Increment item | No product/stock validation |
| POST | `/api/cart/removeFromCart` | JWT | Decrement item | No ownership/stock validation |
| POST | `/api/cart/getCart` | JWT | Read cart | Returns raw object |
| POST | `/api/orders/placeOrder` | JWT | Create order + Stripe session | Trusts client `amount` and `items`; no stock/transactions; no idempotency |
| POST | `/api/orders/verify` | **None** | Mark paid / delete order | Trusts client `success`; no Stripe webhook |
| POST | `/api/orders/userOrders` | JWT | User orders | OK ownership-wise; no pagination |
| GET | `/api/orders/listOrders` | **None** | All orders | Leaks every customer's PII |
| POST | `/api/orders/status` | **None** | Update status | Public; arbitrary status string |

### Contract problems to fix in the rebuild

- Inconsistent response envelope (`{ success, message, data }` vs ad-hoc fields).
- Mixed use of body/query/params for IDs.
- No validation schema, no typed errors, no HTTP status discipline.
- No pagination metadata.
- No idempotency keys.
- No API versioning.

---

## 7. Data Model Inventory

### `userModel` (`backend/models/userModel.js`)

```js
{ name, email (unique), password, cartData: Object, role: "user" | "admin" }
```

Missing: timestamps, email verification, reset tokens, addresses, wishlist, phone, avatar, last login, status, indexes beyond email. Cart is embedded in the user document and unvalidated.

### `foodModel` (`backend/models/foodmodel.js`)

```js
{ name, description, price, image, category }
```

Missing: slug, ingredients, rating, review count, prep time, veg/non-veg, stock, availability, featured/bestseller/trending/new flags, discount, images gallery, timestamps, category reference, indexes.

### `orderModel` (`backend/models/orderModel.js`)

```js
{ userId, items: Array, amount, address: Object, status, date, payment }
```

Problems:
- `date: { default: Date.now() }` evaluates at module load, so every order gets essentially the same timestamp. Must be `default: Date.now` (function reference).
- `items` is an untyped array of client data (no product reference, no price snapshot, no quantity validation).
- `amount` is client-supplied.
- No subtotal/discount/tax/delivery breakdown, no currency, no payment intent/session ID, no status history, no cancellation reason, no idempotency key.
- No indexes on `userId`, `status`, `date`.

### Missing models

Category, Coupon/Promotion, Address, Wishlist, Review, Inventory/StockMovement, RefreshToken/Session, AuditLog, NewsletterSubscriber, ContactMessage.

---

## 8. Security Audit

### 8.1 Critical (P0 — block deployment)

1. **Hardcoded database credentials** — `backend/config/db.js:6`, and a commented URI in `backend/server.js:42`. Rotate the Atlas user immediately.
2. **Committed secrets** — `backend/.env` is tracked (`JWT_SECRET`, `STRIPE_SECRET_KEY`). Rotate both. Purge from history and add `.env` to ignore rules.
3. **Privilege escalation on registration** — `backend/controllers/userController.js:40` destructures `role` from the body and saves it. Any client can become admin.
4. **Broken admin authorization** — `backend/middleware/auth.js:22-29` checks `req.body.role`, which the client controls. `req.user` is never populated, so `/api/user/profile` and `/api/user/admin` also crash.
5. **Unauthenticated destructive/admin APIs** — `POST /api/food/add`, `POST /api/food/remove`, `GET /api/orders/listOrders`, `POST /api/orders/status`.
6. **Payment bypass** — `backend/controllers/orderController.js:41-56` marks an order paid when the client sends `success=true`. No Stripe webhook or session retrieval.
7. **Hardcoded admin bootstrap** — `backend/utils/createAdmin.js:6-25` creates `admin@gmail.com` with a known password on every startup.

### 8.2 High (P1)

- **Client-controlled pricing** — `placeOrder` trusts `req.body.amount` and `req.body.items`; Stripe line items use client prices.
- **Password hash leakage** — login returns the full `user` document including `password`.
- **Account enumeration** — distinct "User Not Found" vs "Invalid Password" responses.
- **Weak password policy** — only `length >= 8`; no complexity/breach checks.
- **No rate limiting** on login/register/order/payment.
- **JWT in localStorage** — XSS-exfiltratable; 7-day lifetime; no refresh rotation; no revocation.
- **CORS wide open** — `app.use(cors())` allows every origin (`backend/server.js:20`).
- **No Helmet / security headers**.
- **No request validation or sanitization** — NoSQL injection surface, especially with `req.body` used directly in queries.
- **Multer upload abuse** — no MIME filter, no size limit, original filename used in stored name (`backend/routes/foodRoutes.js:8-14`).
- **No centralized error handler**; raw `error.message` returned to clients.
- **Token logged to console** — `backend/middleware/auth.js:8`.
- **No CSRF strategy** (relevant once cookies are introduced).
- **No transactions/atomic stock operations**; no inventory at all.
- **Duplicate orders/payments possible** — no idempotency, order is created before payment and cart is cleared immediately.
- **Hardcoded frontend URL** in the Stripe redirect (`orderController.js:13`).

### 8.3 Medium (P2)

- No DB indexes for common queries (`userId`, `status`, `category`, `date`).
- No logging/audit trail.
- No secure production config (no `NODE_ENV` handling, no trust proxy, no graceful shutdown).
- `nodemon` and `body-parser` in production dependencies; `body-parser` unused.
- Uploads served without cache/security headers.
- No ownership checks on some future resources (addresses/wishlist) because they do not exist yet.

### 8.4 Secrets exposure summary

| Secret | Location | Action |
|---|---|---|
| MongoDB URI/user/password | `backend/config/db.js:6`, `backend/server.js:42` | Rotate DB user; move to env; remove comment |
| `JWT_SECRET` | `backend/.env` (tracked) | Rotate; purge history; env only |
| `STRIPE_SECRET_KEY` | `backend/.env` (tracked) | Rotate in Stripe dashboard; env only |
| Hardcoded admin password | `backend/utils/createAdmin.js:13` | Remove bootstrap; use env-driven one-time seed |

---

## 9. Functional Gaps vs Target Product

### Customer site

| Target | Current |
|---|---|
| Premium sticky navbar with search, wishlist, cart count, account | Basic navbar; search icon inert; no wishlist; dot only; no mobile drawer |
| Cinematic hero with real copy, parallax, layered imagery | Fixed orange hero, Lorem ipsum, 1.8 MB background |
| Backend-driven categories | Hardcoded client array |
| Popular / featured / bestseller / trending / new arrivals | Single flat list |
| Product cards with rating, prep time, veg flag, stock, wishlist | Name/description/price only |
| Product details page | Missing |
| Search with debounce/suggestions/recent | Missing |
| Offers/coupons validated server-side | Promo input with no handler |
| Cart with tax/discount/delivery/total | Subtotal + flat $2; no tax/discount; no empty state |
| Checkout with address validation, coupon, payment selection | Basic form; client totals; no validation; Stripe only |
| Auth: verification, reset, change password, profile, sessions | Register/login/logout only; localStorage JWT |
| Customer dashboard: profile, orders, details, addresses, wishlist, settings | Only a basic My Orders list |
| Order tracking with meaningful statuses | 3 statuses, admin-only update, no timeline |
| Scroll storytelling sections | Missing (no philosophy, ingredients, testimonials, how-it-works, newsletter) |
| Premium footer | Placeholder links and Lorem ipsum |

### Admin site

| Target | Current |
|---|---|
| Secure admin login + RBAC | No login at all |
| Overview with revenue/orders/customers/charts | Missing |
| Product CRUD + edit + stock + availability + gallery | Add, list, delete only |
| Categories management | Missing (hardcoded list) |
| Orders accept/status/cancel + customer info | View + status select only; unprotected |
| Customers, coupons, promotions, inventory, reviews, settings | Missing |
| Mobile admin experience | Desktop table only |

---

## 10. UI/UX Audit

### Visual system

- No design tokens. Colors are hardcoded (`tomato`, `#f05454`, `#f0f0f0`) across CSS files.
- Typography uses Outfit/Playfair/Poppins; target is Manrope/Plus Jakarta Sans + Inter.
- Inconsistent spacing, radii, shadows, and button treatments.
- Duplicate global `.navbar` rule with `width: 120%` (`frontend/src/index.css:30`) risks horizontal overflow.
- Navbar is both `position: sticky` (global CSS) and `position: fixed` (component CSS) — conflicting.
- Hero uses `background-size: contain` with a 1.8 MB PNG; text contrast depends on the image.
- Placeholder Lorem ipsum in Header, ExploreMenu, Footer.
- No empty, loading, error, or skeleton states beyond a spinner.
- No dark sections, editorial layouts, or premium product photography treatment.
- Food images are PNG (no WebP/AVIF), many ~200 KB, hero 1.8 MB, logo 1.24 MB.

### Navigation & interaction

- Search icon has no handler.
- Cart badge is a dot, not a live count.
- Profile menu is hover-only (`:hover`), not keyboard accessible.
- Mobile menu disappears below 750 px with no replacement.
- Category scroller hides scrollbar and relies on mouse/touch; no accessible controls.
- Active nav state is local component state, not route-aware.
- No focus-visible styles, skip link, or landmarks.
- Clickable `div`/`img` elements without keyboard semantics.

### Responsive

- Breakpoints exist for 1050/900/750/600 px but layouts are mostly shrunk desktop.
- Header hides the description on mobile instead of redesigning the hero.
- Admin tables are not designed for small screens.
- No tested 375/390/430 px layouts.

### Motion

- Only a CSS `fadeIn` on the hero and a spinner.
- No scroll reveals, parallax, staggered cards, counters, horizontal storytelling, or reduced-motion handling.

---

## 11. Performance, Accessibility, SEO, Testing

### Performance

- Frontend dist ≈ **11 MB**, dominated by unoptimized PNGs.
- All 32 food images are imported through `assets.js`, so they are bundled and can be requested eagerly.
- Hero/logo are 1.8 MB / 1.24 MB.
- No route-level code splitting or `React.lazy`.
- No image lazy loading, `srcset`, or modern formats.
- No TanStack Query cache; food list is fetched once into context and re-rendered through context consumers.
- No server pagination or DB indexes.
- No compression or cache headers on the API.
- Committed `node_modules` makes clones slow and diffs noisy.

### Accessibility

- Missing alt text (most images use `alt=""`).
- Icon-only controls have no accessible names.
- No labels on checkout inputs (placeholders only).
- No visible focus states.
- Hover-only profile menu.
- No `prefers-reduced-motion`.
- No semantic `nav`/`main`/`section` structure.
- Color contrast not verified; orange-on-white and white-on-image need checking.

### SEO

- Title is `Food Delivery`; no description, Open Graph, Twitter card, canonical, or structured data.
- Favicon is Vite's default.
- No `robots.txt`, `sitemap.xml`, or per-page metadata.
- Client-only rendering with no prerender/SSR strategy documented.

### Testing & quality

- No unit, component, integration, or E2E tests.
- No test scripts in any `package.json`.
- No CI workflow.
- Frontend lint currently fails with 2 errors.
- No error boundary, no global error UI, no logging.
- No API contract documentation.

---

## 12. Design & Motion Skill Availability

Requested skill sources were verified over the network:

| Source | Availability | Notes |
|---|---|---|
| `nextlevelbuilder/ui-ux-pro-max-skill` | Public, exists | Provides a design-system generator (`uipro` CLI, Python search script), 79 styles, 192 product rules, palettes, font pairings. Requires Node/npm and Python 3. |
| `anthropics/skills` | Public, exists | Agent Skills examples (creative/design, technical, docs). Installable as a Claude Code plugin marketplace. |
| `JustineBijuPaul/frontend-ai-skills` | Public, exists | 70 modular `SKILL.md` files, including React architecture, UI/UX, design systems, Framer Motion, GSAP, ScrollTrigger, scroll storytelling, performance, a11y, security, image optimization, API integration, state management. Has an OpenCode installer. |

**Local status:** **No design skills are installed** in this environment. There is no `.opencode/skills`, `~/.config/opencode/skills`, `.claude/skills`, or `~/.claude/skills`. Only the built-in `customize-opencode` skill is available.

**Plan:** Before Phase 2, install the relevant `frontend-ai-skills` set into the project (`.opencode/skills`) and run the UI UX Pro Max design-system workflow to produce the design tokens. If installation is not desired, the written design direction in the brief will be used as the source of truth. This decision is listed in Section 14.

---

## 13. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Leaked DB/JWT/Stripe secrets are already public | Full data compromise, payment abuse | **Certain** (in Git) | Rotate all secrets now; purge history; enforce env-only |
| Client can self-register as admin | Full admin takeover | **Certain** | Server-owned roles; remove `role` from registration |
| Unauthenticated destructive endpoints | Data loss, defacement, PII leak | **Certain** | Add auth + RBAC to every mutating/admin route |
| Payment bypass | Revenue loss | **Certain** | Stripe webhook + server-side session verification |
| Client-controlled prices | Revenue loss / fraud | **Certain** | Recalculate totals from DB; ignore client amounts |
| Duplicate orders/payments | Double charges | High | Idempotency keys + atomic order/payment state machine |
| Local upload abuse | Disk exhaustion / malicious files | High | MIME/size limits, random names, Cloudinary or validated local storage |
| Full redesign breaks existing flows | Regression | Medium | Keep API contracts during migration; add tests before refactor |
| Large image payloads | Poor LCP/CWV | Certain | Convert to WebP/AVIF, responsive sizes, lazy loading, CDN |
| No tests | Silent regressions | High | Add Vitest/Supertest + Playwright in Phase 4/5 |

---

## 14. Decisions Needed Before Phase 2/3

1. **Secret rotation:** Confirm the MongoDB, JWT, and Stripe secrets have been rotated (or authorize a rotation checklist). The audit cannot make external dashboards safe by itself.
2. **Skill installation:** Install `frontend-ai-skills` and UI UX Pro Max into the project, or proceed with the written design brief only?
3. **Auth transport:** Recommended target is short-lived access token + rotating refresh token in `HttpOnly` cookies (with CSRF protection), replacing `localStorage`. Confirm this direction.
4. **Admin architecture:** Keep a separate Vite admin app (recommended for deployment isolation) or merge admin into the customer app behind RBAC?
5. **Image storage:** Keep local `uploads/` for development, or move to Cloudinary (the brief allows either)?
6. **Payment scope:** Keep Stripe Checkout as the only payment method, or add cash-on-delivery? If Stripe, a webhook endpoint and `STRIPE_WEBHOOK_SECRET` are required.
7. **Currency:** Standardize on INR (current Stripe code) or USD (current UI). The mismatch must be resolved in the data model and UI.
8. **Screenshot:** The referenced screenshot was not attached. Provide it if the visual direction must match a specific reference.

---

## 15. Proposed Target Architecture (For Approval — Not Yet Implemented)

### Backend

```text
backend/src/
├── app.js                 # Express app (helmet, cors allowlist, json limits, sanitize)
├── server.js              # bootstrap + graceful shutdown
├── config/                # env validation, db, constants
├── models/                # User, Food, Category, Order, Coupon, Address,
│                          # Wishlist, Review, RefreshToken, InventoryLog
├── routes/                # auth, users, foods, categories, cart, orders,
│                          # coupons, reviews, admin, payments, uploads
├── controllers/           # thin HTTP layer
├── services/              # pricing, orders, payments, inventory, auth
├── middleware/            # auth, requireRole, validate(zod), rateLimit,
│                          # errorHandler, notFound, upload
├── validators/            # zod schemas
├── utils/                 # tokens, cookies, logger, apiError, slug
└── tests/                 # unit + integration (vitest + supertest)
```

Key rules:

- All prices/totals/discounts recalculated server-side.
- Order + inventory mutations use MongoDB transactions.
- Stripe webhook is the only source of payment truth; `verify` is a read-only status check.
- Roles and ownership enforced server-side on every sensitive route.
- Secrets only via validated env; `.env.example` with placeholders.

### Frontend (customer)

```text
frontend/src/
├── app/                   # router, providers, error boundary
├── api/                   # axios client + query functions
├── stores/                # zustand: cart UI, wishlist, UI state
├── hooks/                 # queries, mutations, debounce, media query
├── components/ui/         # Button, Input, Card, Badge, Modal, Drawer, Skeleton
├── components/layout/     # Navbar, MobileDrawer, Footer
├── components/home/       # Hero, Categories, ProductRail, StorySections, Offers
├── components/product/    # ProductCard, ProductGrid, QuantityStepper
├── pages/                 # Home, Menu, Product, Search, Cart, Checkout,
│                          # Orders, OrderDetail, Account, Wishlist, Auth
├── lib/                   # formatters, validators, motion presets
└── styles/                # tokens.css, globals.css
```

State split:

- **Zustand:** cart UI state, wishlist IDs, mobile drawer, search history.
- **TanStack Query:** products, categories, search, cart server sync, orders, profile, admin data.
- No server data duplicated in Zustand.

### Admin

Separate Vite app with its own auth guard, layout, and pages: Overview, Products, Categories, Orders, Customers, Coupons, Promotions, Inventory, Reviews, Settings.

---

## 16. Phased Implementation Plan

| Phase | Deliverable | Verification gate |
|---|---|---|
| 1 | `PROJECT_AUDIT.md` (this document) | Review + decisions in Section 14 |
| 2 | `DESIGN.md` + design tokens + global styles | Token audit, contrast check, responsive type scale |
| 3 | `ARCHITECTURE.md` (API contracts, schemas, auth, state, security) | Contract review before code |
| 4.1 | Backend hardening: env validation, secrets removal, helmet, CORS, rate limit, validation, error handler | Unit tests + manual API checks |
| 4.2 | Auth rebuild: roles, cookies/refresh, verification, reset, profile | Auth/authorization tests |
| 4.3 | Catalog: categories, products, search, pagination, details, reviews | API tests + query indexes |
| 4.4 | Cart/pricing/orders: server totals, coupons, stock, transactions, idempotency | Pricing + concurrency tests |
| 4.5 | Payments: Stripe webhook, status machine, duplicate protection | Webhook simulation tests |
| 4.6 | Customer UI: navbar, hero, categories, product grid, details, search, cart, checkout, account | Build + lint + Playwright flows |
| 4.7 | Admin UI: auth, overview, product/category/order/coupon/customer management | Role tests + E2E |
| 4.8 | Motion: Framer Motion reveals, parallax, horizontal showcase, counters, reduced motion | Performance + reduced-motion checks |
| 4.9 | Security hardening pass: headers, CSP, upload validation, audit logging | Security checklist |
| 4.10 | Performance: image pipeline, lazy routes, caching, indexes, CWV | Lighthouse + bundle budget |
| 4.11 | Testing: unit, integration, E2E desktop/mobile | CI green |
| 5 | Full verification: run all apps, build, lint, APIs, auth, mobile widths, animations | Final report |

**Priority order:** security/correctness → working functionality → premium UI/UX → motion → performance → maintainability → responsiveness.

---

## 17. Immediate P0 Actions (Before Any Feature Work)

These are external/operational and should happen now:

1. Rotate the MongoDB Atlas user/password referenced in `backend/config/db.js`.
2. Rotate `JWT_SECRET` and `STRIPE_SECRET_KEY` in their dashboards.
3. Remove `backend/.env` from Git tracking and purge it from history (e.g., `git filter-repo`), then add `.env` to `.gitignore` and create `.env.example`.
4. Remove the hardcoded DB URI comment in `backend/server.js`.
5. Delete the hardcoded admin bootstrap and known credentials.
6. Stop using `localStorage` for the role; treat it only as a UI hint, never as authorization.

---

## 18. Audit Conclusion

The codebase is a small, understandable MVP with a clear foundation (Express + Mongoose + React/Vite + Stripe). It is salvageable and does **not** need a ground-up rewrite. The correct strategy is:

1. **Freeze deployment** until P0 security issues are resolved.
2. **Harden the backend and auth first**, because the current API cannot safely support any of the premium features.
3. **Introduce the design system and state/data architecture** before building new screens.
4. **Rebuild the customer experience and admin dashboard** against real APIs, with tests and performance budgets.

No application code was modified during this audit. Phase 2 (`DESIGN.md` + design system) and Phase 3 (`ARCHITECTURE.md`) should begin only after the decisions in Section 14 are confirmed.

---

## 19. Confirmed Decisions (2026-11-01)

| Decision | Choice |
|---|---|
| Leaked secrets | **Rotate now, then purge Git history** before feature work |
| Design skills | **Install both** `frontend-ai-skills` and UI UX Pro Max |
| Auth transport | **HttpOnly cookies + rotating refresh tokens**, with CSRF protection |
| Admin architecture | **Merge admin into the customer Vite app** behind `/admin` RBAC routes |
| Currency | **INR** across UI, API, database, and Stripe |

### Consequences for the plan

- Phase 4.1 starts with secret rotation + history purge + env validation, not with features.
- Phase 2 must install skills and run the UI UX Pro Max design-system workflow first.
- Phase 3 auth contract: access token (short-lived) + refresh token (rotating, `HttpOnly`, `Secure`, `SameSite`), CSRF token for cookie-authenticated mutations, server-side role checks only.
- Phase 4.7 builds the admin dashboard inside `frontend/src/pages/admin/*` with a backend-enforced `admin` role. The standalone `admin/` app can remain temporarily as a reference, then be retired.
- All money is stored as integer paise (INR) and formatted as `₹` in the UI. Stripe `currency: "inr"`.

### Immediate security checklist (must complete before Phase 2)

1. **Rotate MongoDB Atlas credentials** (Database Access → edit user → new password), then update the local `.env` only.
2. **Rotate `JWT_SECRET`** (generate 64 random bytes, e.g. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`).
3. **Roll the Stripe secret key** in the Stripe dashboard; update `.env`. Add `STRIPE_WEBHOOK_SECRET` when the webhook is built.
4. **Stop tracking `backend/.env`**: `git rm --cached backend/.env`, add `.env` to `.gitignore`, create `.env.example` with placeholders only.
5. **Remove hardcoded secrets from source**: `backend/config/db.js` must read `process.env.MONGO_URI`; delete the URI comment in `backend/server.js`; delete the hardcoded admin bootstrap.
6. **Purge history** with `git filter-repo --path backend/.env --invert-paths` (or BFG), then force-push all branches/tags. Warn collaborators to re-clone.
7. **Verify** no secret remains: `git log --all --full-history -- backend/.env` should be empty, and run a secret scanner (`gitleaks`/`trufflehog`) over the repo.
8. **Treat the old credentials as compromised** even after rotation (check Atlas logs, Stripe dashboard, and any unexpected usage).

No feature implementation should begin until steps 1–7 are confirmed.
