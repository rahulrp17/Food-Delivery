# Food Delivery — MERN

Customer storefront + admin dashboard + REST API for a food ordering platform.

| Piece | Stack | Location |
| --- | --- | --- |
| API | Node 20, Express 5, Mongoose 8, Zod, Stripe, Vitest | `backend/` |
| Web app | React 19, Vite 6, React Router 7, TanStack Query, Zustand, Tailwind 4, Playwright | `frontend/` |

The admin dashboard is **not** a separate app: it lives under `/admin/*` in the
same React app, guarded by role/permission checks on both the route and the API.

---

## 1. Prerequisites

- Node.js **>= 20**
- npm 10+
- A MongoDB database (local `mongod` or an Atlas cluster)

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Required in `.env`:

| Variable | Notes |
| --- | --- |
| `MONGO_URI` | Connection string. Required outside tests. |
| `JWT_SECRET` | At least 32 characters. Required outside tests. |
| `CLIENT_URL` | Allowed CORS origin, e.g. `http://localhost:5173`. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Required when `NODE_ENV=production`. |

Then:

```bash
npm run dev        # http://localhost:4000
```

Health probes: `GET /healthz` (liveness) and `GET /readyz` (Mongo connected).

### Database scripts

```bash
npm run migrate      # migrate:catalog + migrate:chicken + fix:catalog
npm run seed:admin   # create the ADMIN_EMAIL / ADMIN_PASSWORD admin account
```

### Backend tests

```bash
cd backend && npm test      # 16 files, 94 tests
```

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env      # optional — defaults are fine locally
npm run dev               # http://localhost:5173
```

`VITE_API_URL` defaults to `/api/v1`; the dev server proxies `/api` and
`/images` to `http://localhost:4000`. For production set an absolute API URL
and proxy `/images` to the backend as well.

Other scripts:

```bash
npm run lint              # eslint
npm run build             # production build
npm run test:e2e          # Playwright flows (backend + frontend must be running)
npm run test:responsive   # responsive sweep across breakpoints
```

## 4. Project layout

```
backend/
  src/
    config/       env parsing (Zod), DB, permissions
    controllers/  HTTP handlers
    services/     business logic
    models/       Mongoose schemas
    routes/v1/    versioned API routes
    middleware/   auth, RBAC, CSRF, rate limits, validation, uploads
    validators/   Zod request schemas
    tests/        Vitest suites
frontend/
  src/
    api/          axios client + per-domain API modules
    components/   ui/ admin/ layout/ product/ auth/ loading/
    hooks/        data + interaction hooks
    lib/          formatting, invoice, validation helpers
    pages/        storefront, auth, account, admin
    stores/       Zustand stores
    styles/       design tokens + global styles
  e2e/            Playwright specs
```

## 5. Documentation

| Document | Contents |
| --- | --- |
| `ARCHITECTURE.md` | System design, API contract, decisions, open items |
| `DESIGN.md` | Design principles and the customer storefront spec |
| `ADMIN_DESIGN_SYSTEM.md` | Admin UI tokens, components and layout rules |
| `ADMIN_PROJECT_AUDIT.md` | Admin phase-by-phase status, gaps and next steps |
| `PROJECT_AUDIT.md` | Original full-project security/architecture audit |
| `UI_QA_REPORT.md`, `UI_UX_AUDIT.md` | UI QA and UX findings |

## 6. Security model

- Access token in an **HttpOnly** cookie, 30-day refresh token with rotation
- Double-submit **CSRF** token on every mutating request
- **RBAC** on the API (`requirePermission`) and on the frontend routes
- Zod validation on all bodies, `helmet`, CORS allow-list, rate limits
- Uploads validated and stored outside the web root; `pino` structured logs
- Audit log for every privileged mutation
- Deprecated `/api/*` routes were removed; they answer `410 LEGACY_API_REMOVED`
