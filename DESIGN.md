# DESIGN.md — Food Delivery Platform

**Status:** Phase 2 design system, pending review before Phase 3 architecture.
**Source of truth:** This document. `PROJECT_AUDIT.md` remains the audit and decision log.
**Working brand name:** Food Delivery (placeholder until a final name/logo is supplied).
**Currency:** INR, stored as integer paise, displayed as `₹`.
**Target:** A premium, warm, editorial food-ordering experience for urban India — fast to use, calm to look at, and trustworthy at checkout.

---

## 1. Design Intent

### 1.1 The feeling

A modern Indian kitchen brand, not a generic delivery marketplace. Cream paper, charcoal ink, tomato and saffron accents, real food photography, generous type, and quiet motion. The customer should feel hungry first, then confident that ordering is simple, transparent, and fast.

### 1.2 Principles

1. **Appetite first.** Food photography and warm color do the selling. Chrome stays quiet.
2. **Calm premium.** No loud gradients, no glassmorphism everywhere, no carousel noise. Whitespace and hierarchy create value.
3. **Editorial + functional.** Storytelling sections coexist with clear product discovery and a frictionless checkout.
4. **Fast by default.** Skeletons, optimistic cart updates, lazy images, and route-level code splitting make the product feel instant.
5. **Accessible and inclusive.** WCAG 2.2 AA contrast, keyboard access, 44px touch targets, and reduced-motion support are non-negotiable.
6. **One system.** Every color, space, radius, shadow, and motion value comes from a token. No hardcoded visual values in components.
7. **Mobile-first.** Design at 375px first; scale up to 1440px+. The thumb is the primary input.
8. **Trust at the edge.** Prices, taxes, delivery fees, allergens, order status, and payment state are always explicit.

### 1.3 What to avoid

- Generic “Tomato” orange, emoji icons, placeholder Lorem ipsum, and stock SaaS gradients.
- Full-screen autoplay video, heavy parallax, and motion that blocks reading.
- More than two font families for core UI.
- Tiny text, low-contrast gray-on-gray, and hover-only interactions.
- Decorative complexity that slows the path from craving to checkout.

---

## 2. Brand & Audience

| Item | Direction |
|---|---|
| Personality | Warm, confident, hospitable, modern, quietly premium |
| Audience | Urban 22–40, time-poor, quality-conscious, mobile-first, India |
| Promise | “Good food, without the wait.” |
| Voice | Direct, sensory, human. Short sentences. No hype. |
| Differentiators | Curated kitchens, transparent pricing, live order tracking, premium packaging |
| Brand markers | Cream paper texture, charcoal type, tomato/saffron accents, herb green for fresh/veg |
| Logo | Wordmark + simple bowl/spark mark. Placeholder: text wordmark until supplied. |

### 2.1 Voice examples

| Context | Use | Avoid |
|---|---|---|
| Hero | “Dinner, handled.” | “Welcome to our amazing food delivery website!” |
| Empty cart | “Your cart is waiting.” | “No items found.” |
| Error | “That didn’t go through. Try again.” | “An unexpected error occurred.” |
| Sold out | “Back soon.” | “Out of stock.” |
| CTA | “Add to cart” / “Checkout” | “Submit” / “Click here” |
| Delivery | “Arriving in 28–34 min” | “Delivery time may vary.” |

---

## 3. Visual Direction

**Name:** Warm Editorial Kitchen.

- **Canvas:** warm cream, not pure white. Cards are white with a fine warm border.
- **Ink:** near-black brown-charcoal for text; warm gray for secondary copy.
- **Accent:** brick tomato for primary actions; saffron/amber for highlights, ratings, and focus; herb green for veg, success, and fresh cues.
- **Photography:** real food, overhead and 45° shots, natural light, deep shadows, no text baked into images.
- **Layout:** asymmetric editorial hero, 12-column desktop grid, generous 48–96px section rhythm, dark storytelling band for contrast.
- **Texture:** very subtle paper grain on large cream sections only; never over text.
- **Shape:** 12–24px radii on cards, 999px pills for filters/badges, 8–12px on inputs/buttons. Avoid everything being a pill.
- **Elevation:** soft, warm shadows. No hard black drop shadows.

### 3.1 Generator input and overrides

UI UX Pro Max was run with:

```text
"food delivery restaurant ordering marketplace premium fast casual"
--design-system -p "Food Delivery" --variance 6 --motion 7 --density 5
```

It recommended **Vibrant & Block-based**, a red/gold palette, and **Playfair Display SC / Karla**. We keep the appetite-driven red/gold logic and the funnel pattern, but override:

- Typography to the brief’s **Plus Jakarta Sans + Inter** for a cleaner, more product-like premium feel.
- Saturation down: brick tomato instead of bright red; saffron as an accent, not a second primary.
- Layout to a warmer editorial grid instead of a blocky conversion funnel.
- Motion to restrained reveal/stagger, not decorative block animation.

---

## 4. Design Tokens

Tokens are defined as CSS custom properties in `frontend/src/styles/tokens.css`. Components must consume semantic tokens, never raw hex values.

### 4.1 Color primitives

```css
:root {
  /* Ink — warm charcoal */
  --ink-950: #120d0a;
  --ink-900: #1c1511;
  --ink-800: #2a211b;
  --ink-700: #3d3028;
  --ink-600: #5a4a3f;
  --ink-500: #7a6759;
  --ink-400: #a08c7b;
  --ink-300: #c7b6a6;
  --ink-200: #e4d8cb;
  --ink-100: #f3ece4;
  --ink-50:  #fbf7f2;

  /* Cream — canvas */
  --cream-50:  #fdf9f3;
  --cream-100: #faf3e8;
  --cream-200: #f4e8d7;

  /* Tomato — appetite / primary */
  --tomato-700: #9f3222;
  --tomato-600: #c2412d;
  --tomato-500: #d9533b;
  --tomato-400: #e8735b;
  --tomato-100: #fbe4de;

  /* Saffron — warmth / accent */
  --saffron-700: #92400e;
  --saffron-600: #b45309;
  --saffron-500: #d97706;
  --saffron-400: #f59e0b;
  --saffron-100: #fef3c7;

  /* Herb — fresh / success */
  --herb-700: #2f6b4f;
  --herb-500: #3f8a63;
  --herb-100: #e3f3ea;

  /* Utility */
  --white: #ffffff;
  --black: #000000;
  --danger-700: #991b1b;
  --danger-600: #b91c1c;
  --danger-100: #fee2e2;
  --info-600: #2563eb;
  --info-100: #dbeafe;
}
```

### 4.2 Semantic tokens

```css
:root {
  --color-bg: var(--cream-50);
  --color-surface: var(--white);
  --color-surface-2: var(--cream-100);
  --color-surface-3: var(--ink-50);

  --color-text: var(--ink-900);
  --color-text-muted: var(--ink-600);
  --color-text-subtle: var(--ink-500);
  --color-text-inverse: var(--cream-50);

  --color-primary: var(--tomato-600);
  --color-primary-hover: var(--tomato-700);
  --color-primary-active: var(--tomato-700);
  --color-primary-soft: var(--tomato-100);
  --color-on-primary: var(--white);

  --color-accent: var(--saffron-500);
  --color-accent-strong: var(--saffron-600);
  --color-accent-soft: var(--saffron-100);
  --color-on-accent: var(--ink-950);

  --color-success: var(--herb-700);
  --color-success-soft: var(--herb-100);
  --color-warning: var(--saffron-600);
  --color-warning-soft: var(--saffron-100);
  --color-danger: var(--danger-600);
  --color-danger-soft: var(--danger-100);
  --color-info: var(--info-600);
  --color-info-soft: var(--info-100);

  --color-border: var(--ink-200);
  --color-border-strong: var(--ink-300);
  --color-border-subtle: var(--ink-100);
  --color-focus: var(--saffron-500);
  --color-overlay: rgb(18 13 10 / 0.56);

  /* Dark editorial bands, not a full dark theme */
  --color-dark-bg: var(--ink-950);
  --color-dark-surface: var(--ink-900);
  --color-dark-text: var(--cream-50);
  --color-dark-muted: var(--ink-300);
  --color-dark-border: rgb(255 255 255 / 0.12);
}
```

**Contrast checks (WCAG):**

| Pair | Ratio | Use |
|---|---:|---|
| Ink 900 on cream 50 | 17.19:1 | Body text |
| Ink 600 on cream 50 | 8.05:1 | Secondary text |
| White on tomato 600 | 5.14:1 | Primary button |
| Ink 950 on saffron 400 | 8.99:1 | Accent badge |
| White on danger 600 | 6.47:1 | Destructive button |
| Cream 50 on ink 950 | 18.41:1 | Dark band text |
| Herb 700 on herb 100 | 5.48:1 | Success badge |
| Saffron 600 on saffron 100 | 4.51:1 | Warning badge |
| Tomato 600 on cream 50 | 4.90:1 | Primary text link |
| Tomato 500 on white | 4.00:1 | Large text/hover only, not body |

Use `--color-primary` (600) for text links and white-on-primary surfaces. `--color-primary-hover` (700) is for hover/active fills. Do not use tomato 500 for small text on white.

### 4.3 Typography

**Families:**

```css
:root {
  --font-display: "Plus Jakarta Sans", "Manrope", system-ui, sans-serif;
  --font-body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  --font-feature-body: "cv02", "cv03", "cv04", "cv11";
  --font-feature-price: "tnum";
}
```

Load only weights 400/500/600/700 for Plus Jakarta Sans and 400/500/600 for Inter. Use `font-display: swap`. Self-host or preconnect to Google Fonts; do not block first paint.

**Scale:**

| Token | Size | Line height | Tracking | Weight | Use |
|---|---|---|---|---:|---|
| `--text-display-xl` | `clamp(3.5rem, 7vw, 6rem)` | 0.95 | -0.04em | 700 | Hero headline |
| `--text-display-l` | `clamp(2.75rem, 5vw, 4.5rem)` | 1.0 | -0.03em | 700 | Section hero |
| `--text-h1` | `clamp(2.25rem, 4vw, 3.5rem)` | 1.05 | -0.02em | 700 | Page title |
| `--text-h2` | `clamp(1.75rem, 3vw, 2.5rem)` | 1.1 | -0.02em | 700 | Section title |
| `--text-h3` | `1.375rem` | 1.2 | -0.01em | 600 | Card/section subhead |
| `--text-h4` | `1.125rem` | 1.3 | 0 | 600 | Component title |
| `--text-body-l` | `1.125rem` | 1.65 | 0 | 400 | Lead paragraph |
| `--text-body` | `1rem` | 1.6 | 0 | 400 | Default body |
| `--text-body-s` | `0.875rem` | 1.5 | 0 | 400 | Secondary UI |
| `--text-caption` | `0.75rem` | 1.4 | 0.02em | 500 | Captions/meta |
| `--text-overline` | `0.75rem` | 1.2 | 0.12em | 700 | Labels, uppercase |
| `--text-price` | `1.25rem` | 1.2 | -0.01em | 700 | Prices, tabular |

Rules:

- Body copy never below 14px; primary reading text 16px+.
- Display headlines use `text-wrap: balance`; body uses `text-wrap: pretty`.
- Prices and totals use `font-variant-numeric: tabular-nums`.
- Do not use uppercase for long headings; reserve it for overlines and badges.
- Editorial pull quotes may use Plus Jakarta Sans 600 italic; no third serif family for MVP.

### 4.4 Spacing, radii, shadows, layout

```css
:root {
  /* 4px base, 8px rhythm */
  --space-0: 0;
  --space-1: 0.25rem;  /* 4 */
  --space-2: 0.5rem;   /* 8 */
  --space-3: 0.75rem;  /* 12 */
  --space-4: 1rem;     /* 16 */
  --space-5: 1.25rem;  /* 20 */
  --space-6: 1.5rem;   /* 24 */
  --space-8: 2rem;     /* 32 */
  --space-10: 2.5rem;  /* 40 */
  --space-12: 3rem;    /* 48 */
  --space-16: 4rem;    /* 64 */
  --space-20: 5rem;    /* 80 */
  --space-24: 6rem;    /* 96 */

  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 999px;

  --shadow-xs: 0 1px 2px rgb(18 13 10 / 0.05);
  --shadow-sm: 0 2px 8px rgb(18 13 10 / 0.06);
  --shadow-md: 0 8px 24px rgb(18 13 10 / 0.08);
  --shadow-lg: 0 16px 40px rgb(18 13 10 / 0.12);
  --shadow-xl: 0 24px 64px rgb(18 13 10 / 0.16);
  --shadow-focus: 0 0 0 3px rgb(217 119 6 / 0.35);

  --container-max: 1280px;
  --container-wide: 1440px;
  --container-narrow: 760px;
  --gutter: 1rem;
  --section-y: clamp(3rem, 7vw, 6rem);

  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-drawer: 1200;
  --z-modal: 1300;
  --z-toast: 1400;
  --z-tooltip: 1500;
}

@media (min-width: 640px) { :root { --gutter: 1.5rem; } }
@media (min-width: 1024px) { :root { --gutter: 2rem; } }
@media (min-width: 1440px) { :root { --gutter: 3rem; } }
```

**Breakpoints:** 375, 480, 640, 768, 1024, 1280, 1440, 1600.
**Grid:** 4 columns <640; 8 columns 640–1023; 12 columns ≥1024. Gutter 16/24/32px. Max content 1280px; admin content 1440px.

### 4.5 Motion tokens

```css
:root {
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-moderate: 300ms;
  --duration-slow: 450ms;
  --duration-slower: 600ms;

  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Motion rules:

- Hover/press: 150–200ms. Entrances: 300–450ms. Page transitions: 200ms.
- Animate `transform` and `opacity` only. Never animate `width`, `height`, `top`, or `left` for layout.
- Use `IntersectionObserver` for scroll reveals; no scroll-jank libraries for MVP.
- Respect `prefers-reduced-motion: reduce`: remove parallax, stagger, and non-essential movement; show final state immediately.
- No autoplay video with sound. No infinite looping animation near reading content.

---

## 5. Components

### 5.1 Button

| Variant | Background | Text | Border | Hover | Active |
|---|---|---|---|---|---|
| Primary | `--color-primary` | white | none | `--color-primary-hover` | darker + 1px inset |
| Secondary | `--color-surface` | `--color-text` | `--color-border-strong` | `--color-surface-2` | `--color-surface-3` |
| Ghost | transparent | `--color-text` | none | `--color-surface-2` | `--color-surface-3` |
| Accent | `--color-accent` | `--color-on-accent` | none | `--color-accent-strong` | darker |
| Danger | `--color-danger` | white | none | `--danger-700` | darker |
| Link | transparent | `--color-primary` | none | underline | underline |

- Sizes: `sm` 36px, `md` 44px, `lg` 52px. Icon-only buttons are 44×44px.
- Radius: `--radius-sm` for md/lg, `--radius-xs` for sm.
- Focus: `outline: 2px solid var(--color-focus); outline-offset: 2px;` plus `--shadow-focus`.
- Loading: spinner replaces leading icon; label stays; `aria-busy="true"`; disabled.
- Disabled: 45% opacity, `cursor: not-allowed`, no hover transform.
- Full-width on mobile checkout/auth CTAs.

### 5.2 Inputs and forms

- Height: 44px (sm 40px, lg 52px). Radius `--radius-sm`. Border `--color-border-strong`.
- Label always visible above the field; placeholder is an example, never the label.
- Helper text below in `--text-body-s`; error text in `--color-danger` with `aria-describedby`.
- Focus: 2px saffron ring + border color change. Error: danger border + 3px soft ring.
- Search input: leading search icon, clear button, `type="search"`, 44px min.
- Select: native on mobile; custom menu on desktop with keyboard support.
- Checkbox/radio: 20px, 44px touch target, visible focus, label clickable.
- Switch: 44×24px track, 20px thumb, `role="switch"`, `aria-checked`.
- Validation: inline on blur, summary on submit, focus moves to first error.

### 5.3 Product card

- Image: 4:3, `object-fit: cover`, radius top `--radius-lg`, lazy-loaded, blur placeholder.
- Badges top-left: veg/non-veg dot, bestseller, new, sold out. Max 2 visible; overflow “+1”.
- Wishlist button top-right: 44px, heart icon, `aria-pressed`.
- Content: title (2 lines max), description (2 lines), rating + count, prep time, price.
- Footer: price (tabular) + add button. Add button becomes quantity stepper when in cart.
- Hover: translateY(-2px), shadow-md, image scale 1.02, 200ms.
- Sold out: image 60% opacity, “Back soon” badge, add disabled.
- Card is a link to product details; the add button stops propagation.

### 5.4 Badges and status

| Badge | Background | Text | Use |
|---|---|---|---|
| Veg | `--herb-100` | `--herb-700` | Veg marker |
| Non-veg | `--tomato-100` | `--tomato-700` | Non-veg marker |
| Bestseller | `--saffron-100` | `--saffron-700` | Popular |
| New | `--ink-900` | `--cream-50` | New arrival |
| Sold out | `--ink-200` | `--ink-700` | Unavailable |
| Success | `--herb-100` | `--herb-700` | Paid/delivered |
| Warning | `--saffron-100` | `--saffron-700` | Pending |
| Danger | `--danger-100` | `--danger-700` | Failed/cancelled |

Order status colors are paired with text and icons; never color alone.

### 5.5 Navigation

- **Desktop navbar:** 72px, sticky, cream 50 with 80% opacity + 12px backdrop blur, bottom border. Logo left, primary links center, search/wishlist/cart/account right.
- **Active state:** route-aware underline 2px saffron, text ink 900.
- **Cart:** icon + live count badge; count is `aria-live="polite"`; pulse once on add.
- **Account:** click menu, not hover-only. Keyboard accessible, focus trap, Escape closes.
- **Mobile:** logo + cart + menu button. Drawer from right, 320px, full-height, focus trap, body scroll lock, close on route change/Escape. Primary CTA “Order now” at bottom.
- **Skip link:** first focusable element, jumps to `#main`.
- **Announcement bar:** optional, 36px, dismissible, not sticky on mobile.

### 5.6 Footer

- Dark band (`--color-dark-bg`) with cream text.
- Columns: brand + short promise, Shop, Company, Support, Contact.
- Newsletter: email input + button; success/error inline.
- Payment icons (Visa, Mastercard, UPI, Stripe) as SVG, not images.
- Legal: Privacy, Terms, Refunds, FSSAI/licence placeholder, copyright.
- Mobile: accordion columns, 44px tap targets.

### 5.7 Feedback and states

- **Skeleton:** warm shimmer using `--color-surface-2` and `--color-surface-3`; match final layout; no spinner-only pages.
- **Empty:** illustration/icon + one sentence + primary action. Example: “Your cart is waiting. Add something delicious.”
- **Error:** plain-language message + retry. Preserve user input.
- **Toast:** bottom-right desktop, top-center mobile; 4s; `role="status"`; dismissible; max 3 stacked.
- **Modal:** overlay, 560px max, focus trap, Escape/overlay close, `aria-modal`, return focus.
- **Drawer:** 400px desktop / full-width mobile, same focus rules.
- **Pagination:** numbered pages on desktop; “Load more” on mobile.
- **Tabs:** underline active, arrow-key navigation, `role="tablist"`.
- **Accordion:** plus/minus, `aria-expanded`, smooth height with reduced-motion fallback.
- **Quantity stepper:** 44px buttons, inline value, min 1, max stock, optimistic update.
- **Coupon input:** apply/remove, inline validation, server-validated discount.
- **Order timeline:** placed → confirmed → preparing → out for delivery → delivered; cancelled/failed states; timestamps.

### 5.8 Admin components

- Sidebar 240px, dark ink, cream text, active saffron indicator.
- Topbar 64px: page title, search, notifications, account.
- Data table: sticky header, zebra-free, row hover, sortable columns, bulk select, pagination, empty/loading/error.
- Filters: inline bar, chips for active filters, “Clear all”.
- Forms: two-column desktop, single-column mobile; sticky save bar on long forms.
- Stat card: label, value, delta, sparkline; no color-only meaning.
- Charts: accessible palette, direct labels, tooltips, legend, table fallback.
- Mobile admin: tables become stacked cards at <1024px; primary actions remain visible.

---

## 6. Page Blueprints

### 6.1 Home

1. Announcement bar (optional).
2. Sticky navbar.
3. **Hero:** asymmetric 7/5 grid. Left: overline “Fresh from the kitchen”, display headline, one-sentence promise, search/location input, primary CTA, trust row (delivery time, live tracking, secure payment). Right: layered food photography with a subtle parallax card and rating badge. Dark/cream contrast, no text over busy areas.
4. **Category rail:** backend-driven, 8–12 categories, horizontal scroll on mobile with arrow controls on desktop.
5. **Featured rail:** “Tonight’s picks” with 4–8 product cards, horizontal scroll mobile.
6. **Offer band:** saffron/ink split, one strong offer, coupon code, CTA.
7. **How it works:** 3 steps with icons, short copy, no lorem.
8. **Dark story band:** kitchen philosophy, ingredient sourcing, 2-column editorial image + text.
9. **Bestsellers grid:** 8 products, “View full menu”.
10. **Testimonials:** 3 quotes, name, area, rating; no fake company logos.
11. **Newsletter:** email capture, privacy note.
12. **Footer.**

### 6.2 Menu / Category

- Page header: title, result count, sort control.
- Filter bar: category chips, veg toggle, price range, sort; mobile opens bottom sheet.
- Product grid: 1 col <480, 2 cols 480–767, 3 cols 768–1199, 4 cols ≥1200.
- Empty state with clear filters.
- Pagination or “Load more”; preserve scroll position.

### 6.3 Product detail

- Breadcrumb.
- 2-column: gallery (main + thumbnails) and purchase panel.
- Panel: title, rating, prep time, price, tax note, quantity, add to cart, wishlist, delivery estimate, allergens.
- Tabs/accordion: description, ingredients, nutrition, reviews.
- Related products rail.
- Sticky mobile add-to-cart bar.

### 6.4 Search

- Large search input with recent searches and suggestions.
- Results grid with the same filters as menu.
- “No results” with spelling suggestions and popular categories.
- Debounce 250ms; cancel stale requests; URL reflects query.

### 6.5 Cart

- Line items with image, name, options, quantity stepper, remove.
- Coupon input with applied state.
- Summary: subtotal, discount, delivery, tax, total; all server-calculated.
- Empty state.
- Sticky checkout CTA on mobile.

### 6.6 Checkout

- 2-column: form left, order summary right; single column mobile.
- Address: saved addresses, add new, validation, landmark optional.
- Delivery slot: ASAP or scheduled, availability from server.
- Payment: Stripe card/UPI; no client-side price trust.
- Place order: disabled until valid; loading state; redirect to Stripe; return to order status.
- Error handling: payment failed, session expired, out-of-stock, address unavailable.

### 6.7 Orders and order detail

- List: status chip, date, total, item count, reorder.
- Detail: timeline, items, totals, address, payment status, support link.
- Real-time status via polling or websocket later; MVP polls.

### 6.8 Account

- Profile, addresses, wishlist, order history, security, logout.
- Sessions list later; password change and email verification in Phase 4.2.

### 6.9 Auth

- Split layout: form left, food photography/brand panel right; full-width form on mobile.
- Login, register, verify email, forgot/reset password.
- Clear inline validation; no password length guessing; show/hide password.
- Post-login redirect to intended route.

### 6.10 Admin

- Login (separate route, same app, RBAC).
- Overview: revenue, orders, customers, AOV, charts, recent orders.
- Products: list, create/edit, images, stock, availability, category.
- Categories: CRUD, order, visibility.
- Orders: filters, detail, accept, status transitions, cancel, customer info.
- Customers: list, detail, order history, role.
- Coupons: create, limits, expiry, usage.
- Reviews: moderation.
- Settings: store info, delivery fees, tax, hours.

---

## 7. Motion System

| Preset | Use | Spec |
|---|---|---|
| `fade-up` | Section entrances | opacity 0→1, y 16→0, 300–450ms, ease-enter |
| `stagger` | Product grids | 60ms each, max 8 items, fade-up |
| `scale-in` | Modals/popovers | opacity 0→1, scale 0.96→1, 200ms |
| `slide-over` | Drawers | translateX 100%→0, 300ms, ease-enter |
| `page-fade` | Route change | opacity 0→1, 200ms |
| `cart-pulse` | Add to cart | scale 1→1.08→1, 300ms, spring |
| `counter` | Stats | 600ms, requestAnimationFrame, reduced-motion final state |
| `parallax` | Hero image | 0.08–0.15 rate, desktop only, disabled on reduced motion |
| `marquee` | Logo/testimonial strip | only if content is non-essential; pause on hover/focus |

- Stagger max 8 items; do not animate every card on long lists.
- Use `will-change` only during animation; remove after.
- No motion on form errors beyond a subtle fade; never shake.
- All motion must have a reduced-motion fallback.

---

## 8. Accessibility

Target: **WCAG 2.2 AA**.

- **Contrast:** body 4.5:1, large text 3:1, UI components 3:1. Use the verified token pairs above.
- **Keyboard:** every interactive element reachable; visible focus ring; logical tab order; no keyboard traps; Escape closes overlays.
- **Semantics:** `header`, `nav`, `main`, `section`, `footer`; one `h1` per page; heading order.
- **Skip link:** “Skip to content” as first focusable element.
- **Images:** meaningful `alt`; decorative `alt=""`; no text baked into images.
- **Forms:** visible labels, `aria-describedby` for helper/error, error summary, focus first error.
- **Touch:** 44×44px minimum; 8px spacing between targets.
- **Motion:** `prefers-reduced-motion`; no autoplay; pause controls for any marquee.
- **Color:** never the only signal; pair with icon/text.
- **Live regions:** cart count, toast, order status use `aria-live="polite"`.
- **Overlays:** focus trap, return focus, `aria-modal`, scroll lock.
- **Testing:** axe/Lighthouse, keyboard-only pass, screen reader spot check (NVDA/VoiceOver), 200% zoom, 320px width.

---

## 9. Content & Microcopy

- Use sentence case for UI labels and headings.
- Prices: `₹249`, `₹1,299`; no `.00` unless needed. Totals use tabular numerals.
- Dates: `1 Nov 2026`, `Today, 8:30 PM`.
- Delivery: “28–34 min” with an en dash; never a single false-precise number.
- Errors: say what happened and what to do next. No codes in the primary message.
- Empty states: one warm sentence + action. No jokes that obscure the next step.
- Buttons: verb + object (“Add to cart”, “Place order”, “Save address”).
- Avoid “Submit”, “Click here”, “Oops!”, “Lorem ipsum”, and exclamation marks in errors.
- Allergen and veg/non-veg labels must be explicit and consistent.

---

## 10. Imagery & Iconography

- **Food photography:** real dishes, natural light, warm neutrals, shallow depth of field, no text overlays.
- **Aspect ratios:** hero 16:9 or 3:2; product 4:3; category 1:1; avatar 1:1.
- **Formats:** AVIF/WebP with JPEG fallback; `srcset` at 320/640/960/1280/1600; lazy-load below fold; blur/solid placeholder; explicit width/height to prevent CLS.
- **Budget:** hero ≤ 250KB, product ≤ 120KB, category ≤ 80KB, logo ≤ 20KB SVG.
- **Icons:** Lucide or Heroicons, 1.5px stroke, 20/24px; no emoji as icons; decorative icons `aria-hidden`.
- **Illustrations:** only for empty/error states; warm line art, not generic corporate blobs.

---

## 11. Implementation Notes

### 11.1 File structure (Phase 2/4 target)

```text
frontend/src/
├── styles/
│   ├── tokens.css        # primitives + semantic tokens
│   ├── globals.css       # reset, base, typography, utilities
│   └── motion.css        # keyframes + reduced-motion rules
├── components/ui/        # Button, Input, Card, Badge, Modal, Drawer, Skeleton, Toast
├── components/layout/    # Navbar, MobileDrawer, Footer, SkipLink
├── components/home/      # Hero, CategoryRail, ProductRail, StoryBand, Newsletter
├── components/product/   # ProductCard, ProductGrid, QuantityStepper
├── pages/                # Home, Menu, Product, Search, Cart, Checkout, Orders, Account, Auth
├── pages/admin/          # AdminLayout, Overview, Products, Orders, Customers, Coupons, Settings
└── lib/                  # formatCurrency, cn, motion presets, validators
```

### 11.2 Rules

- Import `tokens.css` once in `main.jsx`; no component-level hex values.
- Use semantic tokens in components; primitives only in `tokens.css`.
- Build UI primitives before page sections.
- Use CSS Modules or a consistent utility layer; do not mix ad-hoc global classes.
- All money formatting goes through one `formatINR(paise)` helper.
- All images go through one responsive image component.
- All async states use the shared `Skeleton`/`EmptyState`/`ErrorState` components.
- Dark editorial bands use `.section--dark` and dark tokens; they are not a full theme.
- Admin reuses tokens but uses denser spacing (`--space-2`/`--space-3`) and data-table patterns.

### 11.3 Phase 2 acceptance checklist

- [ ] `tokens.css` exists with primitives, semantic tokens, type scale, spacing, radii, shadows, motion.
- [ ] `globals.css` resets, sets base typography, focus-visible, selection, scrollbar, reduced motion.
- [ ] Fonts loaded with `display: swap`; no layout shift.
- [ ] All token contrast pairs pass AA where used for text/UI.
- [ ] Type scale is responsive and tested at 375/768/1024/1440.
- [ ] Buttons, inputs, cards, badges, navbar, drawer, footer, skeletons, empty/error states specified.
- [ ] Motion presets documented and reduced-motion fallbacks defined.
- [ ] No raw hex values in component specs.
- [ ] DESIGN.md reviewed before ARCHITECTURE.md and implementation.

---

## 12. Open Questions

1. Final brand name, wordmark, and logo mark.
2. Food photography source: licensed shoot, existing assets, or stock.
3. Full dark mode: not in MVP; dark editorial bands only. Confirm.
4. Payment methods: Stripe card/UPI only, or add COD/wallet later?
5. Tax/GST rules and delivery-fee logic by area.
6. Delivery-radius and serviceability rules.
7. Real-time order tracking: polling for MVP, websocket later?
8. Admin roles: single `admin` role or `admin`/`manager`/`support`?
9. Refund/cancellation policy copy and flow.
10. Whether to keep the standalone `admin/` app as a reference or retire it immediately after the merge.

---

## 13. Design Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Visual direction | Warm Editorial Kitchen | Premium, appetite-driven, distinct from generic delivery templates |
| Primary | Brick tomato `#C2412D` | Appetizing, accessible on white, less generic than bright orange |
| Accent | Saffron `#D97706` | Warmth, ratings, focus; works on cream and ink |
| Success/veg | Herb green `#2F6B4F` | Clear semantic meaning without neon |
| Canvas | Cream `#FDF9F3` | Warmer and more editorial than pure white |
| Display font | Plus Jakarta Sans | Matches brief; modern, geometric, premium |
| Body font | Inter | Readability, UI density, tabular numbers |
| Serif | None for MVP | Performance and brief alignment; Playfair considered but deferred |
| Radii | 8–24px | Soft but not toy-like |
| Motion | Restrained reveal/stagger | Premium feel without blocking speed |
| Admin | Same tokens, denser layout | Consistency without a second design language |
| Currency | INR/paise | Confirmed product decision |
