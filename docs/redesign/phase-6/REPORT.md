# Phase 6: the unified local admin app (`tools/admin`)

## Choice: Vite + React (not a second Next.js app)
A local tool needs no SSR, routing or SEO. Vite runs **inside the admin's own Node server** (middleware mode), so there is **one command, one process, one port** (the hot-reload websocket shares it), it starts in about a second, and it imports the website's code directly: the UI kit (`components/ui`), tokens/Tailwind config, i18n (`LangContext`, status labels), `lib/format`, `lib/status`, `lib/quote` and the shared server modules. Two tiny shims replace `next/link`/`next/router`; one Vite plugin compiles the site's JSX-in-`.js`, another wraps the two CommonJS libs (`lib/i18n/locales.js`, `lib/design/tokens.js`).

## Running it
`npm run admin` asks **emulator or production** (or `npm run admin -- --emulator` / `-- --production`; `npm run admin:emulated`). Then http://127.0.0.1:5180. Only 127.0.0.1, Phase 0 guard (own Host/Origin, per-session token on every write), never deployed.

## What's in it
- **Header**: environment pill (green EMULATOR / red PRODUCTION, the whole bar gets a red outline in production) and git pill ("Site up to date · main" or "N unpublished changes" → Publish).
- **Today**: new orders, quotes to answer, reviews this week, translations to review (the Phase 5 drafts), each linking to the filtered list.
- **Orders / Quotes**: search (ref `SOF-…`/`SOQ-…`, name, phone, email, product/subject), status filter, date range, **Load more** past the old 100 limit (filters and search scan every document, legacy statuses included). Detail: customer, items/totals or request (service, boat, product), history timeline, **status change with a confirmation for Cancelled/Delivered (and Declined/Completed)**, customer-visible status notes, **internal notes** (never shown to customers or on /track), and for quotes the **quoted amount (TND, 3 decimals) + reply**, which moves the request to "Quote sent".
- **Catalog**: searchable products table (category filter, "translations to review" filter, FR/AR state per product) → **product editor**: title/brand/category (move)/description/tags, **photos with drag-reorder (and arrow buttons) and auto-resize on upload**, **options with price (3 decimals), stock and FR/AR labels**, single price/stock, datasheet upload, **FR and AR side by side** (title, description, tags; "Use suggestion", "Mark reviewed" for drafts), delete with confirmation. **Categories**: order (up/down), name, **slug with live collision check** (new slugs must be URL-safe; existing ones are kept), image, FR/AR, delete only when empty.
- **Gallery**: same editor style, photos or YouTube, FR/AR, reorder, delete with confirmation.
- **Reviews**: search, filter, hide/unhide with confirmation (ratings recalculated).
- **Customers**: search by phone/email/name, detail with orders and quotes, temporary password (confirmation, shown once).
- **Staff phones**: create an enrolment code (big 6-digit code + expiry), list, revoke with confirmation.
- **Publish**: the **diff in words** (products/categories/gallery added, changed (with fields), removed) + the exact file list → confirmation → commits **only** `products.json`, `gallery.json` and their asset folders, pushes `HEAD:main` → **Vercel build status** (when `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` are set; polls while building) → **Rollback** = revert the last publish commit and push (typed `ROLLBACK` confirmation; refused if the last publish touched other files, or there are unpublished changes).
- Everywhere: **unsaved-changes warnings** (leaving the page or the app), **Undo** (50 steps) / Discard / Save (⌘S), version check (a `git pull` or another tool changing the file is never overwritten: 409 with a clear message), validation with readable messages, toasts with clear wording.

## Shared code added
- `lib/server/staffDesk.js` (plain-Node loadable): searchable/paged lists, detail, internal notes, quote replies, Today counts.
- `tools/admin/api/{index,catalog,validate,diff,publish}.mjs`.

## Data issues found by the new validation (not changed by me)
- "M12 Stainless Steel Washers …" has two options both called **"12X125"**. Existing problems like this are reported as warnings so they don't block other edits; fix it in the editor.
- The category slug `powertools&parts` contains `&` (kept: changing it would change its URLs).

## Removed (parity reached)
- `tools/product-admin/` (catalog editor, `/ops` page, `ops-api.mjs`, `ops.js/html/css`, `app.js`, `server.js`, styles)
- `tools/gallery-admin/` (server, UI)
- `tools/shared/admin-client.js` (their browser helper)
- `npm run gallery-admin`
- Kept and reused: `tools/shared/guard.js`, `publish.js`, `images.js`.

## Tests
- `tests/unit/admin-app.test.mjs` (replaces the Phase 0 server test): the real admin server against a throwaway git repo: 127.0.0.1 only; foreign Origin/Host/cross-site and token-less writes refused; catalog save validation (duplicate slug), stable/new product ids, **409 on a stale version**, saving never commits; uploads → WebP, not staged; publish diff + **commit scope** (only catalog files, unrelated work untouched, pushed to main); rollback (wrong commit refused, revert pushed, file restored).
- `tests/unit/admin-validate.test.mjs`: validation rules and the publish diff.
- `tests/api/admin-ops.test.mjs` (replaces `ops-tool.test.mjs`): emulator target; token required; staff phones enrol/revoke; orders search by ref, status history, internal notes not on /track, **paging past the first page**; quote reply → quoted; review hide/unhide → stats; customers search + temporary password; Today; 404.
- Full suite: 66 unit, 19 rules, 57 API, all green.
- A browser run against the emulators + a throwaway repo did the whole loop (order → Delivered with confirmation, quote reply, product edit + ⌘S, publish, rollback) with no page errors.

## Screenshots (`docs/redesign/phase-6/`)
today, orders, order-detail, order-confirm-delivered, quote-detail, catalog, product-editor, product-saved, categories, gallery, reviews, customers, devices, publish-preview, publish-confirm, publish-done, rollback-confirm, rollback-done (desktop), orders-mobile, product-editor-mobile. The admin is English only (staff tool); status labels come from the shared i18n.
