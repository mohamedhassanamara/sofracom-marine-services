# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Note: `AGENTS.md` predates the migration to Next.js in places. Trust this file and the code over AGENTS.md for structure; its commit-style and asset-hygiene guidance still applies.

## Commands

```bash
npm run dev            # Next.js dev server against PRODUCTION Firebase (site + /api routes)
npm run build          # production build
npm run emulators      # Firebase Auth + Firestore emulators (project demo-sofracom), UI on :4000
npm run dev:emulated   # Next.js dev server wired to the emulators (use this for local work)
npm run seed:emulator  # demo users/orders: buyer@example.test, staff@example.test (pw emulator-pass-123)
npm test               # i18n completeness + Firestore rules tests + API tests (start their own emulators)
npm run test:i18n      # every key present in en/fr/ar with matching {placeholders}
npm run test:rules     # tests/rules/*.test.mjs via firebase emulators:exec
npm run test:api       # tests/api/*.test.mjs: spawns `next dev` on :3199 against the emulators
npm run admin          # local admin tool → http://127.0.0.1:5173 (catalog) and /ops (orders, quotes,
                       #   reviews, customers, staff phones) against PRODUCTION Firebase
npm run admin:emulated # same tool against the emulators
npm run gallery-admin  # gallery admin console  → http://127.0.0.1:5174
```

- Run a single test file: `node --test tests/i18n.test.mjs`, or for emulator suites `firebase emulators:exec --project demo-sofracom --only firestore,auth "node --test tests/api/flows.test.mjs"`. Filter by name with `--test-name-pattern="reviews"`.
- firebase-tools needs **Java 21+** (`PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH` on this machine).
- `NEXT_DIST_DIR=.next-foo` gives a second `next dev` its own build dir (needed when one is already running; the API tests use `.next-test`).
- One-off scripts: `node scripts/assign-product-ids.js`, `node scripts/migrate-statuses.mjs [--apply]` (dry run by default). Without emulator env vars these hit production.

## Architecture

**Next.js Pages Router** (`pages/`), React 19, plain JavaScript. Deployed on Vercel. Styling: Tailwind **v3.4 via PostCSS** whose theme is **only** `lib/design/tokens.js` (navy/accent/slate/success/warning/danger/info, 8 font sizes, radii sm–xl, 3 shadows, motion), so off-palette classes don't exist; use logical utilities (`ms-/me-/ps-/pe-/start-/end-/text-start`) and `rtl:`. `styles/globals.css` + `styles/account.css` use `theme()` for every value. Fonts: next/font (Inter + IBM Plex Sans Arabic) in `_app.js`. Status/stock colours: `tones` + `statusTone` in the tokens (one palette for site, admin and staff app).

### UI kit
`components/ui/` (see `/styleguide`): Button, Field/Input/Select/…, Card, Badge/StatusBadge/StockBadge, Price, Stars, Dialog/Drawer (native `<dialog>`), Tabs/Segmented, Breadcrumb, LoadMore/Pagination, Toast (`useToast`, provider in `_app`), EmptyState/Skeleton, QuantityStepper, ProductCard, icons (lucide via `components/ui/icons.js`). Build pages from these; format money/dates only with `lib/format.js` / `hooks/useFormat`.

### Locales, SEO, images
- URL locales (`next.config.js` `i18n`): English at `/`, `/fr`, `/ar`; `_document` renders `lang`/`dir`; `LangContext` reads `router.locale`, the switcher navigates and sets `NEXT_LOCALE`. `getStaticPaths` must return every locale. Links via `next/link`/`router` keep the locale; never hard-code `/fr`.
- `components/Seo.js` (+ `lib/seo.js`) on every page: title/description/canonical/hreflang/OG/JSON-LD; `noindex` for private pages. `/sitemap.xml`, `/robots.txt` are pages. `NEXT_PUBLIC_SITE_URL` sets the canonical domain.
- Images are WebP `<stem>-{400,800,1600}.webp` (≤200 KB); JSON stores the `-800` path; render with `components/ui/ResponsiveImage` or `imageAt(src, 400)` (`lib/images.js`). `node scripts/optimize-images.mjs [--apply] [--delete-unreferenced]` converts anything else (idempotent; run it after merging catalog changes) and records old→new paths in `lib/data/image-redirects.json` (308 redirects). Admin uploads use the same pipeline (`tools/shared/images.js`).
- Local QA servers: run with the emulator env vars, otherwise API routes read production through the local service-account file. `SEO_RATINGS=off` skips the build-time ratings read.

### Catalog is JSON in the repo
- `public/assets/data/products.json` → `{ categories: [{ name, slug, image, description, translations, products: [...] }] }`. Each product has a **stable `id` (`p_` + 8 chars)** and `legacyId` (the old title-derived id) plus `title, brand, images[], image, description, usage[], variants[{label, price, stock}], price, stock, datasheet, translations`.
- Product URLs are `/products/<categorySlug>/<id>`. `next.config.js` redirects every `legacyId` URL. Never change an `id`: reviews, ratings and orders are keyed by it. `lib/productIds.js` (CommonJS, shared with the admin tool) generates ids; product-admin assigns them on create/save.
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
- **There is no admin UI on the website.** Staff work happens in the local tool (`tools/product-admin`, `/ops`, `ops-api.mjs`), which imports the same shared functions (`lib/server/{statusUpdates,devices,reviewModeration,adminUsers}.js`) with the Admin SDK. Those modules use explicit `.js` import extensions and must not import the catalog JSON, so plain Node can load them.
- Staff-app devices (Flutter app in `../../IdeaProjects/sofracom_admin_pp`): the local tool's Devices tab issues a single-use 6-digit code (`enrollCodes/{sha256}`, 15 min, newest only, 5 wrong attempts burn it); `POST /api/devices/enroll` returns a custom token `{device, deviceId}`. `devices/{id}.active` is checked by `requireDevice` and by `isStaffDevice()` in the rules (website accounts never get staff access, whatever their claims); revoking also revokes refresh tokens. The app reads orders/quotes live via Firestore but changes statuses only through `PATCH /api/admin/{orders,quotes}` (device tokens only). Production rollout steps: `DEPLOY.md`.
- Guest orders/quotes get attached to an account by `POST /api/account/link`, only when the token's email is verified (called by `AuthContext` once per session).

### Pages added by the redesign
`/checkout` (full page; guest or saved addresses; confirmation with the ref, kept in sessionStorage under `?placed=REF`), `/track`, `/quote` (`?service=` / `?product=` pre-fill; options in `lib/quote.js`; quotes store `service, boat_type, boat_length_m, product_id, product_title`), `/search` (client-side on `/api/catalog-index`), `/404`, `/styleguide`. The cart is `components/cart/CartDrawer.js`, mounted by Layout.

### Client state
- `contexts/LangContext.js` + `lib/i18n/{en,fr,ar}.js`: `t(key, {vars})` with `{placeholder}` interpolation; missing keys fall back to English. Every new key must exist in all three files (`npm run test:i18n`). Catalog content uses `translations[lang]` via `lib/localize.js`.
- `contexts/AuthContext.js`: optional accounts (email/password, Google, reset, verification). Signing in/out never touches the cart.
- `contexts/CartContext.js`: one cart for the whole site in `localStorage` (`sofracom.cart.v1`); `components/cart/CartDrawer` + `/checkout` are the only cart UI; `useAddToCart` adds with a toast. Old cart lines without `productId` are resolved server-side via `legacyId`.

### Local admin tools (`tools/*`)
Standalone Node `http` servers with vanilla JS UIs; they read `.env`. They listen on 127.0.0.1 only and `tools/shared/guard.js` rejects any foreign Host/Origin and any write without the per-session token (printed in the terminal, injected into the pages, sent by `tools/shared/admin-client.js`). **product-admin** and **gallery-admin**: Save (Cmd+S) only writes the JSON; uploads are written but not staged. **Publish…** (`tools/shared/publish.js`) shows the exact file list, then commits only the tool's own JSON + asset folders and pushes to `main`; it refuses unless `main` is checked out and nothing unrelated is staged (the "Update products via admin tool" commits; pull before editing `products.json`). `ADMIN_REPO_ROOT` points a tool at another checkout (tests). `/ops` (operations) writes to Firebase through the shared server functions; the top banner shows PRODUCTION (red) or EMULATOR (green).
