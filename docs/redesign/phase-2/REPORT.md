# Phase 2: design system

All components live in `components/ui/` (barrel: `components/ui/index.js`) and are shown at **/styleguide** (noindex, not in the sitemap) in English and Arabic side by side.

| Component | Notes |
|---|---|
| `Button` | primary / accent (the "Get a quote" CTA) / secondary / ghost / danger / inverse (on navy); sm 36 px, md 44 px, lg 48 px; `loading` (spinner, keeps width, `aria-busy`); `icon` / `iconEnd` (mirrored with `iconFlip`); `href` renders a Next link; icon-only buttons require `label` |
| `Field` + `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `ChoiceGroup` | label, hint, error wired with `aria-describedby` / `aria-invalid`; 16 px text (no iOS zoom), 44 px tall; required `*` / "(optional)"; select chevron sits at the inline end; pass `autoComplete` as usual |
| `Card` | one resting elevation, `interactive` hover |
| `Badge`, `StatusBadge`, `StockBadge` | one palette from `lib/design/tokens.js` (`tones` + `statusTone`) for orders, quotes and stock, all ≥ 4.5:1 |
| `Price` | `lib/format.js` `formatPrice` (the only formatter now; `lib/constants` re-exports it): EN `2,498.405 DT`, FR `2 498,405 DT`, AR `‏2.498,405 د.ت.‏`; `from` prefix; isolated with `<bdi>` |
| `Stars`, `RatingSummary`, `StarInput` | fractional fill follows reading direction; picker is a radiogroup, arrow keys mirror in Arabic (old `components/reviews/Stars` re-exports these) |
| `Dialog`, `Drawer` | native `<dialog>` (page inert, focus can't escape), Escape + backdrop close, focus returns to the opener (verified), `aria-labelledby/-describedby`, only the body scrolls, page scroll locked, drawer comes from the inline end (left in Arabic), reduced motion respected |
| `Tabs`, `Segmented` | roving tabindex, arrow keys follow reading direction, Home/End |
| `Breadcrumb` | `<nav>` + `<ol>`, `aria-current="page"`, mirrored separators |
| `LoadMore`, `Pagination` | "Showing 24 of 60" live text; numbered pages with ellipsis, mirrored arrows |
| `ToastProvider` / `useToast` | in `_app`; polite region (errors assertive), pause on hover/focus, optional action |
| `EmptyState`, `Skeleton` | |
| `QuantityStepper` | 44 px − / + with labels, typed input, clamped |
| `ProductCard` | one card for category, search, featured, related: image, brand, 2-line title (whole card is the link), rating, "from X DT" when options differ, stock badge when not in stock, quick add (or "Choose options" for multi-option products) |
| Icons | `lucide-react` via `components/ui/icons.js` (`Icon`, decorative by default, `flip` mirrors in RTL) |

Also: `LocaleScope` (render a subtree in another language/direction), `hooks/useFormat`, UI strings `ui.*`, `stock.*`, `nav.quote`, `nav.shop` in EN/FR/AR.

## Checks
- axe on /styleguide (EN, AR, 1440 and 390): no issues in the kit. The only remaining "serious" items are the **old header's** search box and language select, replaced in Phase 3.
- Fixed while reviewing: a parent `space-y-*` could push the dialog off-centre (margins pinned); narrow product cards squeezed price and button (stacked now).
- Tests: `tests/unit/format.test.mjs` (prices per language, price ranges, dates). Full suite green.

## Screenshots
`styleguide-full-{desktop,mobile}-{en,ar}.png` (whole page), `dialog-*`, `drawer-*`, `toast-*` for each viewport and language.

Known, handled later: pages still use the old header/footer and their own `<main>` inside the layout's (Phase 3); some catalog titles mix languages in Arabic (Phase 5 data).
