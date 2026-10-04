# Phase 3: header, footer, home, category, product

Built only from the Phase 2 kit.

## Header (`components/layout/SiteHeader.js`, `SearchBox.js`)
- Desktop: logo · prominent search · language · account · cart (count) · **Get a quote**; second row: **Shop** mega menu (disclosure button, opens on click or hover, Escape returns focus, closes when focus leaves), Services, Gallery, About, Contact.
- Phones: menu · logo · account (avatar only) · cart, then search + **Quote** on a second row. Signed in at 360 px: no overflow in EN or AR (`header-signed-in-360-*.png`; the audit's 409 px overflow is fixed).
- Mobile menu = start-side Drawer: all categories, nav links, Track an order, language (segmented), Get a quote.
- Search = ARIA combobox (↓/↑, Enter, Escape) with product suggestions. Suggestions show the same "from" price as the cards and the cart (fixes the audit's price mismatch).
- The header no longer downloads `products.json` (380 KB) on every page: `/api/catalog-index` serves a slim, CDN-cached index (categories + search fields), fetched when idle or on first use. `lib/catalogIndex.js` builds and searches it (accent/case-insensitive, all words, title matches first) and is unit-tested.
- Skip link, one `<main id="main">` per page (pages no longer nest their own).
- **The cart is on every page** (the drawer is mounted by Layout, opened from the header; the floating button is gone). The drawer itself is rebuilt in Phase 4.

## Footer (`SiteFooter.js`)
Contact (address + directions, phone, email, hours), Shop (all categories), Services & help (Services, Get a quote, Track an order, Questions, Contact), Company (About, Gallery, Account, language). Every link is a real route (`/#services` etc. work from any page), back-to-top.

## Home
Hero with both CTAs (Shop / Get a quote) and three facts → shop by category (6 tiles) → popular products (8, one per department, quick add with toast) → services (6, each with "Get a quote" pre-filled by service) + how it works (4 steps) → brands strip → Monastir & haul-out (About) → testimonials (kept as placeholders, marked in code) → FAQ (5, native accessible accordion; 2 new answers use only facts already on the site) → contact. Motion: fade-ins only, off with reduced motion; parallax and tilt removed.

## Category
Breadcrumb, h1 + description, category pills, search within the category, sort, brand / use / in-stock filters (sidebar on desktop, Drawer on phones with "Show N products"), active-filter chips, result count (live), grid of the new ProductCard ("from X DT", stock, rating, quick add or "Choose options"), Load more (24 at a time). **Empty results show an empty state** (clear filters / get a quote) instead of the full list. Filters are in the URL. Brand names are normalised (BOSCH/bosch were two brands).

## Product
Two columns above the fold: gallery (thumbnails, pressed state) | brand (links to the category filtered by brand), h1, rating → reviews, price, stock badge + on-order/out notes, **options as chips** (radio group), quantity, Add to cart, **Ask for a quote on this** (`/quote?product=…`), datasheet. Below: description (read more), use tags, options table, reviews, 4 related products (same brand first). **Sticky add-to-cart bar on phones** once the main button scrolls away. Page data trimmed.

## `/products`
Category index on the new tiles.

## Checks
- axe (EN/AR, 1440/390): home, category, product: 0 issues after fixing heading order and search landmark names.
- No horizontal overflow at 360 px on home, category, product (EN/AR).
- Tests: `tests/unit/catalog-index.test.mjs` (index contents, prices, search). Full suite green (63 unit, 19 rules, 49 API).

## Screenshots
`home|category|product-{desktop,mobile}-{en,ar}.png` (full page), `mega-menu-desktop-*`, `search-suggestions-desktop-*`, `filters-drawer-mobile-*`, `mobile-menu-*`, `header-signed-in-360-*`.

## Not yet (next phases)
`/quote`, `/track` and `/checkout` are linked from here and arrive in Phase 4, together with the new cart drawer, search page and account restyle. Use tags and some product titles are still English-only in FR/AR (Phase 5 data).
