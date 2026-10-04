# SOFRACOM UI/UX audit: summary

Audited 2026-10-04 on branch `redesign`. This was a read-only audit run against the Firebase emulators, with no code changes. Full details are in `REPORT.md`. The machine-readable inventory is `inventory.json`. Visuals are in `contact-sheets/` (6 grids) and `screenshots/` (78 files). Raw data is in `lighthouse/` and `axe/`.

## Executive summary

1. **Images are the #1 problem.** There are 391 MB of raw phone photos (up to 4080×3060 PNG), with no resizing, lazy loading or `next/image`. A category page downloads 57–96 MB, and mobile Lighthouse scores only 60–68.
2. **Signed-in checkout can fail.** Picking "Use a new address" makes the modal 1040 px tall with no scrolling, so the Order button can't be reached on phones or on 1366×768 laptops.
3. **The site loads Tailwind v2.2.19 from a CDN, but the markup uses some v3 syntax.** Those classes silently do nothing, which makes the product page a single column with Add to cart below the fold. The CDN stylesheet is also 251 KB, render-blocking and 99% unused.
4. **Guests can't track orders.** There is no order number and no email, and a guest order doesn't link to a new account unless the email is verified, which nothing on screen explains.
5. **FR/AR are half translated.** The page HTML is always English, ~50 English strings appear on the AR home page, 72/167 products have no Arabic title, and several RTL layout bugs remain.
6. **The site runs two design systems.** The account pages use a coherent `ui-*` kit. Marketing and catalog pages use stock Tailwind plus ad-hoc CSS: 14 blues, 5 primary-button looks, 24 font sizes, and no reduced-motion support.
7. **Mobile has several problems.**
   - Signed in, the header overflows to 409 px and the logo collides with the account pill.
   - Inputs are 15.2 px, so iOS zooms in on them.
   - A category page has 82 tap targets under 24 px.
8. **Admin today means 3 tools, 2 ports and 3 npm scripts.**
   - The catalog "Save & Deploy" (and Cmd+S, with no confirmation) commits the whole git index and pushes whatever branch is checked out.
   - The PROD/EMULATOR banner appears only on `/ops`.
   - Both servers accept cross-origin requests from any website (CORS `*`).
9. **The foundations are good:** server-side pricing, stable product ids, API-only writes with tests, a clean status model, low JS cost (TBT ≤ 40 ms, CLS ≈ 0), real Monastir photos and the brand navy.
10. **Biggest opportunities:**
    - an image pipeline
    - one token-based design system built from the `ui-*` pieces
    - a shared Dialog, ProductCard and Button
    - a cart on every page
    - order refs plus guest lookup
    - the language in the URL
    - a single local admin app with Draft → Publish

## Current design tokens (as found in the code)

| Group | Values in use | Notes |
|---|---|---|
| Brand colours (CSS vars, `globals.css:1-7`) | `--deep-navy #0b2050` · `--sea #0f3d72` · `--sky #e6f0ff` · `--accent #24b4ff` · `--sand #f8fafc` | The only token layer. Tailwind isn't configured with them |
| Other blues | Tailwind blue-900 `#1e3a8a` (CTAs), blue-600 `#2563eb` (product "Add to cart", links), `#1d4ed8`, `#0f62fe`, `#0b1f3a`, `rgba(15,32,80)`, footer `#051836→#030b1d` | 14 blues in total |
| Text / grays | slate `#0f172a #334155 #475569 #64748b #94a3b8` (custom CSS) **plus** coolGray `#111827 #374151 #4b5563 #6b7280` (Tailwind) | 6 near-duplicate pairs. `#94a3b8` fails AA (2.56) |
| Semantic | success `#0f7a2e` / `#047857`; danger `#d72638` / `#b91c1c`; warning `#c2410c` / `#f97316` / `#92400e`; stars `#f59e0b` | Two or three of each. On-order badge 2.47 (fails) |
| Totals | 88 raw colour values (50 used once) + 47 Tailwind colour classes | |
| Fonts | Inter 400/500/600/700/800 via Google Fonts `<link>` (latin only); stack `Inter, system-ui, …` | No Arabic face, so AR falls back to the system font. Admin tools declare Inter but never load it |
| Font sizes | Tailwind xs…6xl (11 sizes) + 24 CSS sizes (11 between 0.65 and 0.95 rem) | Page titles: 60 / 36 / 30 / 28 / 25.6 px depending on the page |
| Radii | 999px pill · 0.5 · 0.65 · 0.75 · 0.9 · 1 · 1.1 · 1.2 · 1.25 · 1.5 rem + one-offs (20 in total) | Buttons alone use 4 radii |
| Shadows | 6 Tailwind classes + 14 one-off CSS shadows in 3 tints (slate / navy / sea) | Four different "card at rest" elevations |
| Containers | 1280 (`max-w-7xl`), 1152 (`max-w-6xl`, account), 896, 672; dialogs 420 / 440 / 480 / 520 | Header gutter 16 px vs page 24 px |
| Breakpoints | Tailwind 640 / 768 / 1024; CSS 640 / 720 / 768 / 900 (mixed max- and min-width) | 720 and 900 are off-scale |
| Motion | 0.2–0.6 s ease; float 8–12 s infinite; tilt; fixed parallax | 0 `prefers-reduced-motion` rules |

## Top 15 UX problems

| # | Problem | Where | Severity |
|---|---|---|---|
| 1 | Checkout with a new address: Order button unreachable (modal doesn't scroll) | `CheckoutModal`, `globals.css:720` | High |
| 2 | 57–96 MB of images per category page; LCP 16 s on product pages (mobile, simulated) | `public/assets/products`, header dropdown | High |
| 3 | Guests can't track orders: no ref, no email, no linking without a verified email | checkout confirmation, `/api/account/link` | High |
| 4 | Product page single column; Add to cart below the fold | `[productId].js:98` (v3 class) | High |
| 5 | Signed-in mobile header overflows (409 px); logo/pill collision | `account.css:262` | High |
| 6 | FR/AR half translated; SSR always English | many, see REPORT A5 | High |
| 7 | Search/suggestion price ≠ cart price for 51 products | `Layout.js`, `search.js` | High |
| 8 | Cart drawer and checkout modal not accessible (no focus trap/return, no Escape); language select unlabeled | `CartWidget`, `CheckoutModal`, `Layout` | High |
| 9 | Cart only on catalog pages; search has no Add to cart | `CartWidget` mounting | Med |
| 10 | Quote only via the home form; success vanishes after 6 s, English, no ref | `pages/index.js` | Med |
| 11 | Empty filter result shows the full list | category page `:205` | Med |
| 12 | Footer anchors dead off the home page | `Layout.js:505` | Med |
| 13 | Contrast failures (on-order badge 2.47, gray text 2.56, focus ring 2.32) | `globals.css`, `account.css` | Med |
| 14 | iOS input zoom (15.2 px), tiny tap targets, no autocomplete on guest checkout | forms, cards, cart | Med |
| 15 | No titles/meta/OG/sitemap/robots/JSON-LD/favicon; FR/AR not indexable | `_app.js`, no `_document.js` | Med |

Next in line: RTL bugs (timeline, "DT 341,887", unmirrored drawer), inconsistent buttons/colours, motion without reduced-motion, review form reopening after publish, profile save switching the language, no custom 404. All 31 are in REPORT A6.

## Lighthouse and axe

Production build on localhost against the emulators. Mobile = simulated Moto G on slow 4G.

| Page | Perf mobile / desktop | A11y | Best pr. | SEO | LCP mobile | Page weight |
|---|---|---|---|---|---|---|
| Home `/` | 68 / 97 | 95 | 96 | 91 | 10.2 s | 5.8 MB |
| Category `/products/hardware-tools` | 60 / 73 | 88 | 96 | 91 | 275.6 s | 96.3 MB |
| Product `/products/antifouling-coatings/p_bamzqzdm` | 60 / 74 | 87–88 | 96 | 91 | 16.1 s | 8.2 MB |
| Checkout host `/products` | 61 / 93 | 91 | 96 | 91 | 13.6 s | 5.0 MB |

- **TBT** is ≤ 40 ms and **CLS** ≤ 0.006 everywhere. JS isn't the bottleneck: first-load JS is 141–166 KB gz.
- **LCP render delay** of 2.3–2.9 s comes from the Tailwind CDN plus Google Fonts.

| axe rule (impact) | Pages (of 31 scans) | Main cause |
|---|---|---|
| `select-name` (critical) | 31 | Header language `<select>` and category sort/brand selects have no label |
| Nested/duplicate `<main>` (moderate) | 29 | `Layout.js:490` wraps pages that render their own `<main>` |
| `color-contrast` (serious) | 16 | On-order badge, `#94a3b8` text, `text-red-500`, timeline todo labels |
| `aria-hidden-focus` (serious) | 6 | Closed cart drawer still tabbable |
| `aria-dialog-name` (serious) | 5 | Checkout dialog has no name |
| `heading-order` / `page-has-heading-one` | 9 / 2 | Footer h3 after h1; category page has no h1 |
| `aria-allowed-attr` (gallery) | 2 | Inside the YouTube iframe (third party) |

The manual keyboard check found no skip link, and the six invisible dropdown links are in the Tab order. Neither the drawer nor the modal moves focus, traps it, closes on Escape or returns focus. Input focus rings are 2.32:1.

## Admin tools inventory

| Tool | Start / port | Data | Auth | Notes |
|---|---|---|---|---|
| Product admin (catalog) | `npm run admin` → 127.0.0.1:5173 | `products.json` + `public/assets/**`; git commit + push | none; CORS `*` | Vanilla JS. 167 products, no search. Save = commit whole index + push current branch |
| `/ops` (same server) | `npm run admin` (PROD) / `admin:emulated` → :5173/ops | Firestore orders, quotes, reviews, users, devices, enrollCodes; Auth | none; CORS `*` | Tabs: Orders, Quotes, Reviews, Customers (temporary password), Devices (enrol/revoke). Red/green env banner. Latest 100 only |
| Gallery admin | `npm run gallery-admin` → :5174 | `gallery.json` + `public/assets/gallery`; git commit + push | none; CORS `*` | Copy-paste fork of the product-admin server. No test mode, no translations, delete has no confirm |
| Scripts | `seed:emulator`, `assign-product-ids.js`, `migrate-statuses.mjs` | emulator / `products.json` / Firestore | n/a | Only `seed` refuses production |
| Staff phone app (Flutter) | sideloaded APK | reads orders/quotes live; `PATCH /api/admin/*` | enrolled device token | Orders, Quotes, change-status dialog. Different status colours |
| Deploy | git push → Vercel; `firebase deploy` for rules | | | Catalog pages are static, so every edit needs a rebuild |

### Workflow pain points

| Job | Steps · tools · commands | Pain |
|---|---|---|
| Add a product (variants, photos, datasheet) | ~15 + 2 per photo + 3 per variant · terminal, admin, file manager, Vercel · 2 | Default image is a missing file. Price field rejects decimals. Variant translations can't be edited. Uploads are `git add`ed even if you never save. No search, no unsaved-changes warning |
| Edit price / stock | ~7 · 3 tools · 2 | A full redeploy for one field. Cmd+S pushes immediately |
| Add a category | ~8 · 2 tools · 1–2 | Slug typed by hand with no collision check. Order can't be changed |
| Add a gallery entry | ~8 · second server/port · 2 | No FR/AR. Delete has no confirm |
| Publish | 1 click + build wait | Commits everything staged and pushes the current branch (on `redesign` that's only a preview). No build status, no preview, manual rollback |
| Process an order | 4 status changes × 3 taps in the app (or /ops) | App doesn't show notes, the order ref or history. /ops shows only the latest 100 orders. Cancel has no confirm |
| Handle a quote | ~5 status changes + phone/email outside the system | The quote amount and the reply aren't stored. No filter in the app |
| Hide a review | 4 · terminal + /ops · 1 | Not possible from the phone. No search |
| Enrol / revoke a phone | 6 / 3 · laptop + phone · 1 | Laptop and phone must be together within 15 min |
| Forgot password (phone account) | 7 · /ops + phone call · 1 | Identity check is ad hoc. Name search needs `nameLower` (missing on older profiles) |

Cross-cutting: there's no single entry point. The PROD/EMU banner doesn't cover catalog or gallery, which always hit real git. Dangerous actions without confirmation: Cmd+S deploy, Reload (drops edits), Remove variant, gallery Delete, ops Cancel/Delivered. Category/product delete gets only a native `confirm()`, with no warning that the product's reviews become orphaned.

## Merge options (analysis only)

Draft IA for one local admin app:
- Today (dashboard)
- Orders · Quotes
- Catalog: Products (searchable table), Categories, Media library
- Gallery
- Publish (diff → commit → push to `main` → build status → rollback)
- Reviews · Customers · Staff phones · Settings
- A global environment pill and a git status pill

| Option | Pros | Cons |
|---|---|---|
| **A. Route group inside the Next site**, excluded from Vercel builds | Reuses components, tokens, `lib/*` directly; one dev server | Highest risk of shipping admin routes or the Admin SDK to production. Build exclusions are fragile |
| **B. Separate local app in `tools/admin`** (Vite/React or a 2nd Next app + small Node API) | Clear "never deployed" boundary. Can import `lib/server/*`, `lib/status.js` and i18n, and copy the tokens. Modern UI | Second toolchain. Needs Origin/Host checks or a session token |
| **C. Merge the vanilla-JS tools as they are** | Fastest, no new dependencies | Keeps the duplication. Hard to scale the catalog editor |
| **D. Electron / Tauri** | Real desktop app, keychain for secrets, no port | Packaging and updates overhead for a one-person shop |

The auditor leans towards **B**.

Catalog storage, JSON-in-git vs Firestore:
- **Git** gives free history, zero runtime reads and static pages, but every edit means a rebuild (minutes), and today the repo carries 391 MB of images.
- **Firestore + on-demand ISR** gives edits live in seconds, but needs revalidation, rules, a migration and a home for the images.
- **Recommendation:** keep JSON-in-git for now, fix the publish pipeline, and move *images* out of git first. Revisit Firestore if instant price/stock edits become a need.

Whatever the option, keep the status labels and colours consistent with the website and the staff app.

## Keep

- Brand navy `#0b2050` family, already shared by the site, the admin tools and the staff app.
- The real Monastir photography and real product photos (resized).
- Trilingual en/fr/ar + RTL with the i18n key-parity test, and logical CSS properties in `account.css`.
- The `ui-*` account kit: AccountLayout, AuthCard, AddressFields, StatusBadge/Timeline, Stars.
- The status model with identical labels everywhere, and the 4-tone grouping.
- Stable product ids + redirects, server-side pricing, API-only writes, rules/API tests.
- Optional accounts, phone sign-in, a cart that survives sign-in, `next=` return.
- The cart drawer opening on add.
- The delivered → "Rate your items" verified-review flow.
- `/ops` patterns: env banner, two-step confirms, enrol countdown.
- Low JS cost and near-zero CLS.

## Questions for Mohamed

1. **Brand:** keep navy + cyan and Inter, or refresh? Is `modern_logo.svg` the new logo? Which Arabic typeface?
2. **Main purpose:** shop-first, quote-first, or both? This drives the home page, the nav and where "Request a quote" lives.
3. **Home page:** which sections stay (hero, Monastir band, About, Brands, Services + timeline, Haul-out, Testimonials, FAQ, Contact)? Are the testimonials real? Add featured products?
4. **Catalog storage:** JSON-in-git with a fixed publish flow, or Firestore with instant edits? How often do prices and stock change?
5. **Images:** OK to move product photos out of git with auto-resizing, and to delete the 74 unreferenced files?
6. **Guest tracking:** order number + lookup by phone? Email/SMS confirmations? Link guest orders by phone too?
7. **Languages:** language in the URL (`/fr`, `/ar`)? Default language? Who translates the 72 missing AR titles, usage tags and variant labels?
8. **Prices:** "from X DT" for variants? Show millimes? Flat 7 DT delivery, and is there a free threshold?
9. **Admin:** who uses it? OK with a separate local app (B)? Should Publish always target `main`, with a preview first?
10. **Staff app colours:** adopt the website's 4-tone grouping, or six distinct colours everywhere?
11. **Gallery:** keep it (1 entry today)? Translations? Lightbox?
12. **Security fixes found during the audit (outside the redesign):** OK to fix soon? CORS `*` on the admin servers, the whole-index commit / current-branch push, and rotating the leaked service-account key.

## Files

| Path | What |
|---|---|
| `REPORT.md` | Full audit: A1–A6, B1–B4, C, Keep, Questions |
| `inventory.json` | Pages (20), components (26), design tokens (135 colours + type/radii/shadows/breakpoints), animations (16), admin tools (9), workflows (10), status palette |
| `contact-sheets/1-public-desktop.png` … `6-staff-app.png` | Labelled grids. Sheet 6 is rendered from the Flutter source; the app wasn't run |
| `screenshots/` | 78 curated: every page EN at 1440 + 390, key states, 5 RTL/FR problem shots, 14 admin screens |
| `lighthouse/`, `axe/` | Raw Lighthouse (8 JSON+HTML) and axe (31 JSON + `_summary.json`) results |
