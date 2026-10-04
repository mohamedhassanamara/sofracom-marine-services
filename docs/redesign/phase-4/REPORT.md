# Phase 4: the rest of the site

## New pages and flows
- **Cart drawer** (`components/cart/CartDrawer.js`): every page, from the header. Lines with photo, option, quantity stepper, remove; on-order notice; totals; Checkout / Continue shopping; empty state. Quick add elsewhere shows a toast with "View cart" instead of opening it. The old drawer, floating button and checkout modal are deleted.
- **/checkout** (full page, so the Order button is always reachable):
  - guest: name, phone (`tel`), optional email, street/berth, city, notes; correct `autocomplete`, 16 px fields;
  - signed in: saved-address cards (default preselected) or a new address (+ save);
  - field errors and an error summary (focused, with links to the fields); sticky summary on desktop with the button "Place order · total"; "no online payment, we contact you" (no claim about how payment works).
- **Order reference + confirmation**: every order gets `SOF-XXXXX` (5 characters without 0/O/1/I/L, unique via `refs/{REF}`). The confirmation shows it with Copy, "Track this order", and for guests "Create an account to follow your orders" which opens signup **pre-filled** (name + email or phone). A refresh keeps the confirmation (`?placed=REF` + sessionStorage).
- **/track**: reference + phone → status badge, timeline (with staff notes), items, totals. No name, address, email or notes are returned. Same answer for an unknown ref and a wrong phone. Capped per IP (20/h) and per reference (8/h) in Firestore, so it holds across serverless instances.
- **/quote**: service picker (6 services + products/parts + other), boat type and length (optional), details, contact (pre-filled when signed in). Pre-filled from `?service=` (home service cards) and `?product=` ("Ask for a quote on this", shows the product). Success shows `SOQ-XXXXX` and stays until you leave the page. The API stores `service`, `boat_type`, `boat_length_m`, `product_id`, `product_title` (validated against fixed lists and the catalog).
- **/search**: runs on the cached catalog index (the page no longer embeds 292 KB of products), category chips with counts, sort, ProductCard with quick add, load more, empty state with "Get a quote".
- **Gallery**: FR/AR fields (`translations.fr|ar.title/description`, `needsReview`) supported by `lib/gallery.js`; cards open a **lightbox** (Dialog) with prev/next buttons and ←/→ (mirrored in Arabic); YouTube via youtube-nocookie with a thumbnail and play button.
- **404**: search box and links to Shop, Get a quote, Home.
- **Auth and account**: AccountLayout (side nav on desktop, scrollable tabs on phones, sign-out) and AuthCard rebuilt with the kit; the account pages' `ui-*` classes are now defined with the kit's exact utilities (`@apply`), so forms, buttons, cards and alerts render identically to the components; status badge and timeline use the shared palette and the timeline rail mirrors in Arabic; orders show their `SOF-` ref; prices use the locale formatter.

## Audit items fixed here
- Review form reopening after publishing (the `#write-review` deep link now opens once and is cleared).
- Profile save switching the language (fixed in Phase 1; profile language is only a preference).
- Search vs cart price mismatch (suggestions and search use the same lowest price as cards and the cart).
- Footer links work on every page (Phase 3).
- 152 unused CSS rules removed (styles: 1,685 → 618 lines); `lib/stock.js` removed.

## Data and scripts
- `node scripts/backfill-refs.mjs [--apply]` gives existing orders/quotes a ref (tested on the emulator: dry run → apply → nothing left).
- New Firestore collections `refs` and `rateLimits` (no client access: the rules' catch-all deny). Turn on a TTL policy on `rateLimits.expireAt` in production (listed in CHANGES.md).

## Checks
- End-to-end in a real browser against the emulators, desktop + mobile, EN + AR: search → product → add → drawer → checkout (empty submit shows errors) → order → confirmation (survives reload) → /track with the ref and a differently formatted phone → wrong phone → quote pre-filled from a product → SOQ ref. No page errors.
- axe: track, quote, gallery, login, signup: 0 issues; search/404/checkout: the remaining moderate items (duplicate search landmark names, empty-state heading level) are fixed.
- Tests: new `tests/api/refs-track-quote.test.mjs` (refs, tracking privacy, same error for wrong phone/unknown ref, rate cap, quote fields) and `tests/unit/refs.test.mjs`. Full suite: 66 unit, 19 rules, 54 API, all green.

## Screenshots
`search`, `cart-drawer`, `checkout` (+ `-errors`, `-signed-in`), `confirmation`, `track-result`, `track-not-found`, `quote`, `quote-success`, `login`, `signup-prefilled`, `account-{profile,orders,order-detail,addresses,reviews}`, `gallery`, `gallery-lightbox`, `404` — each `-{desktop,mobile}-{en,ar}.png`.

## Left for Phase 5
Some catalog content (category names like "Power Tools & Parts", use tags, 72 product titles) is still English in FR/AR; a few account strings mix languages.
