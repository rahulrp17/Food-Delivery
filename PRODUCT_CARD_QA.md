# Product Card QA

**Date:** 2026-11-18
**Scope:** the storefront food card and its grid — menu, search, home rails, related rail on the product page, and the shared loading skeleton.
**Implementation record:** `ADMIN_PROJECT_AUDIT.md` §15.18, `ARCHITECTURE.md` §8.7.

## Column plan

| Viewport | Menu / search | Home + related rails | Measured card width |
| --- | --- | --- | --- |
| 320px | 1 | 1 | ~288px |
| 360px | 2 | 2 | ~150px |
| 390px | 2 | 2 | ~173px |
| 430px | 2 | 2 | ~190px |
| 600px | 2 | 2 | ~275px |
| 768px | 3 | 3 | ~229px |
| 1024px | 4 | 4 | ~225px |
| 1280px | 4 | 4 | ~281px |
| 1440px | 5 | 4 (capped) | ~253px |
| 1920px | 5 | 4 (capped) | ~245px |

Rails are capped at four because a four-dish rail would leave a hole in a five-up row.

## States verified

Verified with Playwright screenshots against the running backend (no mocked markup; the discount chip was verified by intercepting the products response because the seed has no compare-at prices).

| State | Result |
| --- | --- |
| Default card (no rating, no discount) | Photo, prep pill, diet + category, 2-line title, description, price, Add |
| Rated card (`ratingCount > 0`) | Star + average + count row between description and footer; omitted when there are no reviews |
| Discount + Bestseller | Both chips top-left with tag icon; price + compare-at strike |
| New + discount | New chip replaces Bestseller (priority), discount beside it |
| Sold out | Sold-out chip, desaturated photo, disabled Add, no discount chip |
| In cart (quantity 1 and 2+) | Add becomes a stepper; decrement at 1 removes the line (trash icon) |
| Wishlist saved (signed-in) | Heart fills, `aria-pressed="true"`, survives reload, list persists server-side |
| Wishlist guest | Heart click routes to `/login`, `aria-pressed` stays `false` |
| Hover (pointer devices) | 4px lift, subtle image zoom, CTA shine; disabled under `prefers-reduced-motion` |
| Loading | `ProductCardSkeleton` on menu grid and home rail; no reflow when data lands |
| Compact tier (< 220px card) | Stacked footer, hidden description, full-width 44px Add/stepper |
| Roomy tier | Inline footer, visible description, 40px Add |

## Touch and accessibility

- Add/stepper: 44px on the compact tier and on coarse pointers; 40px on mouse devices.
- Wishlist heart: 44×44 on coarse pointers (38px on mouse, 34px visual in the compact tier before the pointer rule). Verified by `e2e/product-grid.spec.js` with `hasTouch: true` at 390px.
- Stepper buttons: 44×44 inside a 48px group on coarse pointers.
- The responsive sweep (4 specs) reports no control below the WCAG 2.5.8 AA 24px minimum; the 34–40px controls it lists on its synthetic (non-touch) contexts are advisory and are lifted to 44px on real touch hardware.
- Heart: real `<button type="button">`, `aria-pressed`, dynamic label ("Save …" / "Remove …"), busy state while the mutation runs.
- Rating: `role="img"` with a spoken label ("Rated 4.7 out of 5 from 128 reviews").
- Diet mark: colour square plus a visually hidden "Vegetarian"/"Non-vegetarian" label.
- Sold-out action is disabled, not hidden; focus rings are visible on every control.

## Decisions

- **Palette kept.** The existing tomato `--color-primary` already matched the brief; no global restyle.
- **Display face kept** (Playfair Display SC); the interface face moved from Karla to **Manrope** (400–800) as requested.
- **No "Popular" badge** — the model has no popularity flag; only real `isBestseller`, `isNew`, availability/stock and `compareAtPricePaise` drive badges.
- **Wishlist requires auth** (the backend endpoint is user-scoped); guests are routed to sign in instead of seeing a fake local toggle.
- **One wishlist source of truth:** `useWishlist` wraps the existing API; the account page's wishlist view is unchanged.
- **Rails stay at four columns** at every width.
- **Compact threshold 219px** (container query), so cards at 320px (single column) still show the description.
- **Motion** uses `motion/react` for press/hover and the existing CSS for the rest; all transform motion is removed under `prefers-reduced-motion`.

## Gates

| Gate | Result |
| --- | --- |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | Passed (index 429.44 kB / 136.61 kB gzip) |
| `npx playwright test e2e/product-grid.spec.js` | 14 tests passed |
| Full E2E (`npx playwright test`) | 17 spec files / 42 tests passed |
| `frontend: npm run test:responsive` | 4 specs passed |
| Backend | Unchanged (21 files / 120 tests) |

## Known issues / notes

- Seed and E2E fixtures still create categories named `E2E Category …` and an `E2E Product A …` dish; they appear in the storefront menu. Test data, not a UI defect.
- Several dishes have `ratingCount: 0`, so their cards intentionally omit the rating row.
- The seed has no compare-at prices, so the discount chip is not visible with default data; it was verified with an intercepted response and is driven by `compareAtPricePaise`.
- Cards in a row stretch to the tallest card; in the compact tier the footer is pinned to the bottom, which can leave whitespace under the title when a neighbour has a rating row. This keeps rows aligned and is intentional.
- The wishlist heart is 44px on touch devices, which is deliberately larger than the 34px desktop-scale chip inside the same 173px card.
