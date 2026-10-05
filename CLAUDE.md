# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Note: `AGENTS.md` predates the migration to Next.js in places. Trust this file and the code over AGENTS.md for structure; its commit-style and asset-hygiene guidance still applies.

## Commands

```bash
npm run dev            # Next.js dev server against PRODUCTION Firebase (site + /api routes)
npm run build          # production build (`next build --webpack`: Turbopack duplicated shared chunks)
npm run emulators      # Firebase Auth + Firestore emulators (project demo-sofracom), UI on :4000
npm run dev:emulated   # Next.js dev server wired to the emulators (use this for local work)
npm run seed:emulator  # demo users/orders: buyer@example.test, staff@example.test (pw emulator-pass-123)
npm test               # i18n completeness + Firestore rules tests + API tests (start their own emulators)
npm run test:i18n      # every key present in en/fr/ar with matching {placeholders}
npm run test:rules     # tests/rules/*.test.mjs via firebase emulators:exec
npm run test:api       # tests/api/*.test.mjs: spawns `next dev` on :3199 against the emulators
                       #   (routing.test.mjs checks locale/legacy/image redirects and NEXT_LOCALE)
npm run admin          # local admin app → http://127.0.0.1:5180 (asks: emulator or production;
                       #   or pass -- --emulator / -- --production)
npm run admin:emulated # same app against the emulators
```

- Run a single test file: `node --test tests/i18n.test.mjs`, or for emulator suites `firebase emulators:exec --project demo-sofracom --only firestore,auth "node --test tests/api/flows.test.mjs"`. Filter by name with `--test-name-pattern="reviews"`.
- firebase-tools needs **Java 21+** (`PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH` on this machine).
- `NEXT_DIST_DIR=.next-foo` gives a second `next dev` its own build dir (needed when one is already running; the API tests use `.next-test`).
- One-off scripts: `node scripts/assign-product-ids.js`, `node scripts/migrate-statuses.mjs [--apply]` (dry run by default). Without emulator env vars these hit production.

## Architecture

**Next.js Pages Router** (`pages/`), React 19, plain JavaScript. Deployed on Vercel. Styling: Tailwind **v3.4 via PostCSS** whose theme is **only** `lib/design/tokens.js` (navy/accent/slate/success/warning/danger/info, 8 font sizes, radii sm–xl, 3 shadows, motion), so off-palette classes don't exist; use logical utilities (`ms-/me-/ps-/pe-/start-/end-/text-start`) and `rtl:`. `styles/globals.css` + `styles/account.css` use `theme()` for every value. Fonts: next/font (Inter + IBM Plex Sans Arabic) in `_app.js`. Status/stock colours: `tones` + `statusTone` in the tokens (one palette for site, admin and staff app).

### UI kit
`components/ui/` (see `/styleguide`): Button, Field/Input/Select/…, Card, Badge/StatusBadge/StockBadge, Price, Stars, Dialog/Drawer (native `<dialog>`), Tabs/Segmented, Breadcrumb, LoadMore/Pagination, Toast (`useToast`, provider in `_app`), EmptyState/Skeleton, QuantityStepper, ProductCard, icons (lucide via `components/ui/icons.js`). Build pages from these; format money/dates only with `lib/format.js` / `hooks/useFormat`. Keep first-load JS small: the cart drawer and mobile menu are `next/dynamic` (`ssr:false`), header/footer links use `prefetch={false}`, and only the LCP image gets `priority` (preloaded from `<head>`).

### Locales, SEO, images
- URL locales (`next.config.js` `i18n`): English at `/`, `/fr`, `/ar`; `_document` renders `lang`/`dir`; `LangContext` reads `router.locale`, the switcher navigates and sets `NEXT_LOCALE`. `getStaticPaths` must return every locale. Links via `next/link`/`router` keep the locale; never hard-code `/fr`.
- `components/Seo.js` (+ `lib/seo.js`) on every page: title/description/canonical/hreflang/OG/JSON-LD; `noindex` for private pages. `/sitemap.xml`, `/robots.txt` are pages. `NEXT_PUBLIC_SITE_URL` sets the canonical domain.
- Images are WebP `<stem>-{400,800,1600}.webp` (≤200 KB); JSON stores the `-800` path; render with `components/ui/ResponsiveImage` or `imageAt(src, 400)` (`lib/images.js`). `node scripts/optimize-images.mjs [--apply] [--delete-unreferenced]` converts anything else (idempotent; run it after merging catalog changes) and records old→new paths in `lib/data/image-redirects.json` (308 redirects). Admin uploads use the same pipeline (`tools/shared/images.js`).
- Local QA servers: run with the emulator env vars, otherwise API routes read production through the local service-account file. `SEO_RATINGS=off` skips the build-time ratings read.

### Catalog is JSON in the repo
- `public/assets/data/products.json` → `{ categories: [{ name, slug, image, description, translations, products: [...] }] }`. Each product has a **stable `id` (`p_` + 8 chars)** and `legacyId` (the old title-derived id) plus `title, brand, images[], image, description, usage[], variants[{label, price, stock}], price, stock, datasheet, translations`.
- Product URLs are `/products/<categorySlug>/<id>`. `next.config.js` redirects every `legacyId` URL. Never change an `id`: reviews, ratings and orders are keyed by it. `lib/productIds.js` (CommonJS, shared with the admin tool) generates ids; the admin app assigns them on create/save.
- `lib/products.js` imports the JSON (so serverless functions bundle it) and normalizes it. All catalog pages are static (`fallback: false`): catalog edits need a redeploy, but reviews/ratings load client-side.

### Firebase: who reads and writes what
- **All writes go through API routes using the Admin SDK** (`lib/firebase/admin.js`, CommonJS). Credentials resolve: emulator env vars → `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` → `FIREBASE_SERVICE_ACCOUNT_BASE64` → `FIREBASE_SERVICE_ACCOUNT_PATH` → the gitignored `sofracom-firebase-adminsdk-*.json`.
- The browser uses the client SDK (`lib/firebase/client.js`, lazy-loaded) for Auth, and for **reading only** the user's own `orders`/`quotes` (`lib/accountData.js`). `firestore.rules` denies every client write; `tests/rules` covers it.
- API helpers in `lib/server/`: `apiRoute` (method routing + `HttpError` → `{ok:false,error,code}`), `getUser/requireUser/requireDevice` (verify the ID token; staff = enrolled active phone, never a website account), `rateLimit` (in-memory, best effort per instance), `cleanString/cleanEmail` validation, `priceCart` (prices/stock from the catalog — never trust client prices), `users.js` (profile + addresses), `statusUpdates.js`, `reviews.js`.
- Error `code`s map to `errors.<code>` translation keys in the browser (`lib/apiClient.js` `errorMessage`).

### Data model (Firestore)
- References: every order/quote gets a short `ref` (`SOF-XXXXX` / `SOQ-XXXXX`, `lib/server/refs.js`), reserved in `refs/{REF}` → `{kind, docId}`. Older docs: `node scripts/backfill-refs.mjs [--apply]`. Show refs with `displayRef(doc)` (`lib/status.js`).
- `POST /api/track` (guest tracking: ref + phone → status history + items, no personal data) is capped by `lib/server/durableRateLimit.js` (Firestore `rateLimits/{hash}`, per IP and per ref; enable a TTL policy on `expireAt`).
- `orders/{id}`: legacy snake_case fields (`customer_name`, `customer_address`, `items[]`, `total`, `delivery_fee`, …) kept for the staff phone app, plus `uid|null`, `email` (lowercased), `productIds[]`, `subtotal`, `status`, `statusHistory[{status, at, note?, by?}]`. `quotes/{id}` follows the same pattern.
- Statuses live in `lib/status.js`: orders `pending → confirmed → preparing → out_for_delivery → delivered | cancelled`; quotes `received → in_review → quoted → accepted|declined → completed`. `normalize*Status` maps legacy values (`new, waiting, in_progress, treated, declined`).
- `users/{uid}` (`name, phone, email, lang, defaultAddressId`) and `users/{uid}/addresses/{id}`.
- `reviews/{productId}_{uid}` (one per user per product, `status: published|hidden`) and `productStats/{productId}` (`count, sum, avg, dist`), updated in the same transaction as every review change. Eligibility = an order with `uid`, `status == 'delivered'` and `productIds array-contains`. Composite indexes are in `firestore.indexes.json`.
- **There is no admin UI on the website.** Staff work happens in the local admin app (`tools/admin`), which imports the same shared functions (`lib/server/{statusUpdates,staffDesk,devices,reviewModeration,adminUsers}.js`) with the Admin SDK. Those modules use explicit `.js` import extensions and must not import the catalog JSON, so plain Node can load them.
- Staff-app devices (Flutter app in `../../IdeaProjects/sofracom_admin_pp`): the admin app's Staff phones page issues a single-use 6-digit code (`enrollCodes/{sha256}`, 15 min, newest only, 5 wrong attempts burn it); `POST /api/devices/enroll` returns a custom token `{device, deviceId}`. `devices/{id}.active` is checked by `requireDevice` and by `isStaffDevice()` in the rules (website accounts never get staff access, whatever their claims); revoking also revokes refresh tokens. The app reads orders/quotes live via Firestore but changes statuses only through `PATCH /api/admin/{orders,quotes}` (device tokens only). Production rollout steps: `DEPLOY.md`.
- Guest orders/quotes get attached to an account by `POST /api/account/link`, only when the token's email is verified (called by `AuthContext` once per session).

### Pages added by the redesign
`/checkout` (full page; guest or saved addresses; confirmation with the ref, kept in sessionStorage under `?placed=REF`), `/track`, `/quote` (`?service=` / `?product=` pre-fill; options in `lib/quote.js`; quotes store `service, boat_type, boat_length_m, product_id, product_title`), `/search` (client-side on `/api/catalog-index`), `/404`, `/styleguide`. The cart is `components/cart/CartDrawer.js`, mounted by Layout.

### Client state
- Catalog languages: `translations[lang].{title,description,usage,variants[i].label}` win; otherwise use tags and option labels go through `lib/catalogGlossary.js` (EN/FR/AR terms, merges "noir"/"black"); missing text falls back to English and pages mark it with `langAttrs` (`lib/i18n/locales.js`). Arabic titles get bidi isolates (`lib/bidi.js`). Drafted translations carry `needsReview: true` (and `suggestedTitle` when an existing Arabic title is just English); `node scripts/apply-translation-drafts.mjs [--apply]` fills gaps from `scripts/data/ar-drafts.json` without overwriting.
- `contexts/LangContext.js` + `lib/i18n/{en,fr,ar}.js`: `t(key, {vars})` with `{placeholder}` interpolation; missing keys fall back to English. Dictionaries go through `lib/i18n/messages.js`: the server has all three, the browser gets only the page's one inlined by `_document` (`#__I18N__`) and loads another on language switch; never import `lib/i18n/{en,fr,ar}` directly from client code (non-Next entry points such as the admin call `registerMessages`). Every new key must exist in all three files (`npm run test:i18n`). Catalog content uses `translations[lang]` via `lib/localize.js`.
- `contexts/AuthContext.js`: optional accounts (email/password, Google, reset, verification). Signing in/out never touches the cart. Firebase Auth is lazy: loaded on page load only with the `sofracom.signedIn.v1` hint, an existing Firebase IndexedDB session, or on `/account*` and `/checkout`; otherwise on first use (`getFirebase()`). `lib/firebase/client.js` uses `initializeAuth` and passes `browserPopupRedirectResolver` only to `signInWithPopup`.
- `contexts/CartContext.js`: one cart for the whole site in `localStorage` (`sofracom.cart.v1`); `components/cart/CartDrawer` + `/checkout` are the only cart UI; `useAddToCart` adds with a toast. Old cart lines without `productId` are resolved server-side via `legacyId`.

### Local admin app (`tools/admin`)
Vite + React SPA served by `tools/admin/server.mjs` (Vite in middleware mode: one process, one port, 127.0.0.1 only), never deployed. It reuses the site's UI kit, tokens, i18n and `lib/*` (aliases `next/link`/`next/router` → `src/shims`; a Vite plugin compiles the site's JSX-in-`.js`, another wraps the two CommonJS libs). `tools/shared/guard.js` rejects foreign Host/Origin and writes without the per-session token (in the page `<meta>`, sent by `src/api.js`). API in `tools/admin/api/` (orders/quotes search + paging, status, internal notes, quote replies via `lib/server/staffDesk.js`; reviews; customers; staff phones; catalog/gallery files with validation and version check; uploads → WebP; publish/rollback). Catalog and gallery edits are saved to the JSON files; **Publish** (`api/publish.mjs` + `tools/shared/publish.js`) commits only `products.json`, `gallery.json` and `public/assets/{products,categories,datasheets,gallery}` and pushes `HEAD:main` (refuses unless `main` is checked out and nothing unrelated is staged); **Rollback** reverts the last publish commit. `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` (+ `VERCEL_TEAM_ID`) show the build status. `ADMIN_REPO_ROOT` points the data/git at another checkout (tests), `ADMIN_PORT` changes the port.
