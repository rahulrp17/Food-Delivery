# Foodie Admin Pro — Design System

## 1. Design Direction

Foodie Admin Pro is a premium restaurant operations SaaS dashboard: warm, editorial, calm, and operational. It should feel like a high-end restaurant group's internal command center, not a generic analytics template.

Principles:

1. **Operational clarity first** — status, urgency, and next actions are unmistakable.
2. **Warm hospitality** — cream surfaces, food photography, generous spacing, and restrained color.
3. **Quiet confidence** — strong typography, precise alignment, no gratuitous gradients or glassmorphism.
4. **Dense without clutter** — tables and filters are compact; page rhythm remains spacious.
5. **Real data only** — empty, loading, and error states are first-class; no invented metrics.
6. **Accessible by default** — keyboard, focus, contrast, reduced motion, and touch targets are non-negotiable.

Authoritative brand inputs:

| Role | Value |
| --- | --- |
| Sidebar | `#17120F` |
| Sidebar secondary | `#241D18` |
| Page background | `#FAF7F2` |
| Card surface | `#FFFFFF` |
| Primary accent | `#E4482E` |
| Secondary accent | `#F59E0B` |
| Primary text | `#201A17` |
| Secondary text | `#827A73` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Danger | `#DC2626` |
| Border | `#EAE3DA` |
| Headings | Manrope |
| Body | Inter |

## 2. Token Architecture

Three layers:

1. **Primitive tokens** — raw palette and scale values. Never referenced directly by page CSS.
2. **Semantic tokens** — intent-based roles such as `--color-surface`, `--color-primary`, `--color-danger`.
3. **Component tokens** — local aliases for repeated component decisions (card padding, table row height, sidebar width).

Admin tokens are scoped under `.admin-shell`, `.admin-login-page` via `frontend/src/styles/admin-theme.css`, so customer-facing branding remains untouched.

### Color roles

| Semantic token | Value | Usage |
| --- | --- | --- |
| `--color-bg` | `#FAF7F2` | Page canvas |
| `--color-surface` | `#FFFFFF` | Cards, tables, modals |
| `--color-surface-2` | `#F4EDE5` | Inputs, secondary buttons, hover surfaces |
| `--color-surface-3` | `#EDE4DA` | Pressed states, subtle wells |
| `--color-text` | `#201A17` | Primary text |
| `--color-text-muted` | `#827A73` | Secondary text, metadata |
| `--color-text-subtle` | `#A69C93` | Placeholders, tertiary |
| `--color-primary` | `#E4482E` | Primary action, active nav, focus emphasis |
| `--color-primary-hover` | `#CC3B24` | Hover |
| `--color-primary-soft` | `#FBE6E0` | Selected rows, soft badges |
| `--color-accent` | `#F59E0B` | Ratings, highlights, warnings-adjacent emphasis |
| `--color-accent-soft` | `#FEF3C7` | Badges, soft highlights |
| `--color-success` | `#16A34A` | Delivered, paid, active |
| `--color-success-soft` | `#DCFCE7` | Success badges |
| `--color-warning` | `#D97706` | Pending, low stock |
| `--color-warning-soft` | `#FEF3C7` | Warning badges |
| `--color-danger` | `#DC2626` | Cancelled, failed, destructive |
| `--color-danger-soft` | `#FEE2E2` | Danger badges |
| `--color-border` | `#EAE3DA` | Default borders |
| `--color-border-strong` | `#D8CCC0` | Inputs, emphasized dividers |
| `--color-focus` | `#F59E0B` | Focus ring |
| `--admin-sidebar-bg` | `#17120F` | Sidebar |
| `--admin-sidebar-raised` | `#241D18` | Sidebar hover/active surface |

### Typography

- Display / headings: Manrope, weights 600–800, letter-spacing `-0.02em`.
- Body / UI: Inter, weights 400–600.
- Numeric data: Inter with `font-variant-numeric: tabular-nums`.
- Scale:
  - `--text-caption`: 0.75rem / 1.4
  - `--text-body-s`: 0.8125rem / 1.5
  - `--text-body`: 0.9375rem / 1.6
  - `--text-h3`: 1.125rem / 1.3
  - `--text-h2`: 1.5rem / 1.2
  - `--text-h1`: 2rem / 1.1
  - `--text-display`: 2.75rem / 1.05

### Spacing, radius, elevation

- Space scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.
- Radii: 6px controls, 10px inputs, 14px cards, 20px feature panels, full for pills/avatars.
- Elevation:
  - `sm`: `0 1px 2px rgb(32 26 23 / 0.06)`
  - `md`: `0 8px 24px rgb(32 26 23 / 0.08)`
  - `lg`: `0 20px 48px rgb(32 26 23 / 0.14)`
  - Avoid shadows on flat table rows; use borders and surface contrast.

## 3. Layout

- Sidebar: 248px expanded, 80px icon-collapsed on desktop; off-canvas below 1024px.
- Topbar: 68px sticky, surface background, one bottom border, no heavy shadow.
- Content max-width: 1440px, 24px horizontal padding desktop, 16px mobile.
- Page header pattern: eyebrow (optional), title, description, primary action on the right.
- Content grid: 12 columns, 24px gap; cards can span 3/4/6/8/12.
- Mobile: single column; horizontal filter strips become wrappable chip rows; tables become stacked cards below 768px or use deliberate horizontal scroll with a visible affordance.

## 4. Core Components

### Buttons

- Primary: filled `--color-primary`, white text, 40px default height, 10px radius.
- Secondary: white/transparent surface, 1px border, text color.
- Ghost: transparent, text/muted text until hover.
- Destructive: danger text or filled danger for irreversible confirmation.
- Sizes: sm 32px, md 40px, lg 48px. Icon-only is 40×40 minimum.
- Disabled: 45% opacity, no hover elevation.
- Loading: spinner replaces leading icon, label remains, width is stable.

### Inputs and forms

- Height 40px default; labels always visible above fields.
- Border `--color-border-strong`; focus ring 2px `--color-focus` with 2px offset.
- Errors: danger border plus text/icon message below, `aria-describedby` wired.
- Helper text is muted and never used in place of a label.
- Validation occurs on blur/submit, not on every keystroke.

### Cards

- White surface, 1px border, 14px radius, 20–24px padding.
- Header: 16px semibold title, optional muted subtitle, actions right-aligned.
- No nested card borders unless representing a distinct object.

### Tables

- Header: 11px uppercase/tracking, muted text, 44px row.
- Body rows: 52–60px, 1px bottom divider, hover `--color-surface-2` at 50%.
- Numeric columns right-aligned with tabular numerals.
- Bulk selection header appears only when rows are selectable.
- Empty state occupies table body with icon, explanation, and one next action.

### Status and badges

- Pill shape, 11px semibold uppercase, 6px × 10px padding.
- Status mapping:
  - Pending / `PENDING_PAYMENT`: warning
  - Confirmed / Preparing / Out for delivery: accent
  - Delivered / Paid: success
  - Cancelled / Failed: danger
  - Refunded: neutral
- Always pair color with text; never color-only meaning.

### Modals and drawers

- Modal max-width 520px, 20px radius, 24px padding, focus trapped, Escape closes.
- Order detail uses a right-side drawer on desktop where appropriate; full-screen sheet on mobile.
- Confirm destructive actions with explicit object name and consequence.

### Navigation

- Sidebar groups: Overview, Operations, Catalog, Customers, Growth, System.
- Active item: sidebar raised surface, primary left indicator, light text.
- Notifications use a badge count capped at `99+`.
- Topbar profile menu contains role, account, and sign out.
- Keyboard: skip link first, visible focus at every stop.

### Charts

- Use semantic series colors: primary, accent, success, muted border.
- No 3D, no heavy gradients, no pie charts with more than 5 segments.
- Always show axis labels, units, date range, and an accessible text summary.
- Loading uses chart-shaped skeletons; empty state explains the selected period.

## 5. Motion

- Duration: 120ms micro, 180ms standard, 280ms overlay, 420ms page entrance.
- Easing: standard `cubic-bezier(0.2, 0, 0, 1)`, entrance `cubic-bezier(0.16, 1, 0.3, 1)`.
- Animate opacity and transform only; never animate layout properties for interaction feedback.
- Page sections may stagger at 40–60ms, capped at 8 items.
- Live data updates must not re-trigger full entrance animations.
- `prefers-reduced-motion: reduce` removes transforms and shortens durations to near-zero.

## 6. Accessibility

- Minimum contrast: 4.5:1 body text, 3:1 large text and UI boundaries.
- All icon-only controls require accessible names.
- Focus ring visible on cream and dark surfaces.
- Touch targets minimum 44×44px on mobile.
- Dialogs trap focus and restore it to the trigger.
- Status changes announced via polite live regions.
- Forms identify required fields and map errors to inputs.
- Charts/tables provide text alternatives.

## 7. Content and Copy

- Sentence case for labels, headings, and buttons.
- Verbs in actions: “Update status”, “Add product”, “Resend receipt”.
- Errors state what happened and what to do next.
- Currency, dates, and counts use locale formatting from the app; no hardcoded sample numbers.
- Empty states are specific and action-oriented.

## 8. Implementation Rules

- Use semantic tokens; no raw hex values inside page/component CSS.
- Reuse existing `Button`, `Badge`, `Input`, `Modal`, `EmptyState`, `Pagination`, `StatCard` primitives before creating new ones.
- Every interactive control must have a real handler and backend or local state effect.
- Do not invent analytics; derive all metrics from API responses.
- Keep customer-facing styles isolated from admin theme overrides.
- Verify with keyboard navigation, mobile viewport, reduced motion, lint, build, and Playwright.
