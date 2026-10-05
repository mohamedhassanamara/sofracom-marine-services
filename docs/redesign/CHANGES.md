# SOFRACOM redesign: what changed and what you need to do

Branch `redesign` (website) and `redesign` in `../../IdeaProjects/sofracom_admin_pp` (staff app). The branches are **not pushed**. Nothing was deployed, and no production data was touched: all testing used the Firebase emulators. Each phase has a detailed report and screenshots in `docs/redesign/phase-N/`.

## What changed

### Phase 0: admin tools locked down (`21b3a56`)
- **Local admin servers only answer this computer.**
  - They listen on `127.0.0.1` only.
  - They reject a foreign `Host`, a foreign `Origin` and cross-site requests.
  - Every write needs a per-session token (`tools/shared/guard.js`).
  - Before this, any web page you visited could call them.
- **Publishing is scoped** (`tools/shared/publish.js`).
  - It commits only the catalog and gallery files, with `git commit --only`.
  - It runs only when `main` is checked out.
  - It refuses when unrelated files are staged.
  - It shows the exact file list before committing.
  - The GitHub token is masked in all output.

### Phase 1: foundations (`6d6ee24`, `ba3b052`)
- **Tailwind 3 via PostCSS**, themed only from `lib/design/tokens.js`.
  - This replaces the 251 KB render-blocking v2 CDN stylesheet.
  - Every colour, size, radius and shadow was snapped to the tokens.
- **RTL-safe CSS:** logical properties throughout.
- **Fonts via next/font:** Inter, plus IBM Plex Sans Arabic on Arabic pages.
- **Reduced motion** is respected.
- **Focus ring** is visible.
- **Images converted to WebP.** All 242 images now come in 400/800/1600 px versions, each ≤ 200 KB.
  - `public/assets` went from 450 MB to 63 MB.
  - Old image URLs redirect (308).
  - Admin uploads go through the same pipeline.
- **URL locales:** `/` is English, plus `/fr` and `/ar`.
  - `lang`/`dir` are rendered by the server.
  - The choice is remembered in `NEXT_LOCALE`.
  - Signing in no longer switches the language.
- **SEO**
  - Titles, descriptions, canonical, hreflang and OpenGraph on every page.
  - JSON-LD: Store, Product, Offer, AggregateRating and breadcrumbs.
  - `/sitemap.xml` (528 URLs) and `/robots.txt`.
  - Favicon set and web manifest.

### Phase 2: design system (`9ef0697`)
- **Accessible UI kit** in `components/ui/`:
  - Button, form fields, Card, Badge, Price, Stars
  - Dialog and Drawer (native `<dialog>`)
  - Tabs, Breadcrumb, Pagination, Toast
  - EmptyState, QuantityStepper, ProductCard, icons
- **One price and date formatter** for EN/FR/AR.
- **`/styleguide`** shows every component in English and Arabic.

### Phase 3: header, footer, home, category, product (`7800496`)
- **Header**
  - Search with suggestions; the dropdown is an accessible combobox.
  - Shop mega menu.
  - Account and cart.
  - A prominent **Get a quote** button.
  - Phone layout with a menu drawer; it no longer overflows when signed in.
- **Footer:** contact, hours, categories, help links, language.
- **Home**
  - Hero with Shop and Get a quote.
  - Categories, popular products, services with quote shortcuts, how it works.
  - Brands, haul-out, testimonials (placeholders, kept), FAQ, contact.
- **Category**
  - Filters (brand, use, in stock), kept in the URL.
  - Sort and "Load more".
  - An empty state when nothing matches.
- **Product**
  - Option chips, quantity and Add to cart.
  - "Ask for a quote on this" and the datasheet.
  - Reviews and related products.
  - A sticky add-to-cart bar on phones.
- **Search** uses a small cached index (`/api/catalog-index`) instead of the 380 KB catalog on every page.

### Phase 4: the rest of the site (`c27527f`)
- **Cart drawer** on every page.
- **`/checkout` as a full page**
  - Guests fill a form; signed-in customers pick a saved address.
  - Field errors and an error summary.
- **Order references:** `SOF-XXXXX`, and `SOQ-XXXXX` for quotes.
  - The confirmation page survives a refresh.
  - Guests are offered account creation, pre-filled.
- **`/track`:** a reference plus a phone number shows the status timeline.
  - No personal data is returned.
  - It is rate-limited in Firestore.
- **`/quote`:** service, boat and product, pre-filled from links.
- **Also rebuilt:** search page, gallery lightbox, 404, and the account and auth pages restyled.
- **Audit fixes**
  - The review form reopened after publishing; fixed.
  - Search and cart showed different prices; fixed.
  - Footer links now work on every page.
  - 152 unused CSS rules removed.

### Phase 5: translation and RTL (`572dd2e`)
- **All UI strings exist in EN, FR and AR**, and a test enforces it.
- **Arabic drafts** for 72 product titles and 2 category names, marked `needsReview`.
- **14 suggestions** for Arabic titles that were just English.
- **Glossary** for use tags and option labels.
- **Bidi isolation** for Latin and number runs in Arabic titles.
- **English fallback text** is marked `lang="en" dir="ltr"`.

### Phase 6: one local admin app (`b27cc21`)
- **`npm run admin`**, at http://127.0.0.1:5180. It asks whether to use the emulator or production.
- **It replaces** the product admin, the gallery admin and `/ops`.
- **Today:** a summary of what needs attention.
- **Orders and quotes**
  - Search, filters and paging.
  - Confirmed status changes.
  - Internal notes.
  - Quote amount and reply.
- **Catalog editor**
  - Photo reordering and auto-resize.
  - Options with FR/AR labels.
  - Side-by-side translations.
  - Validation, undo and a version check.
- **Also:** categories, gallery, reviews, customers and staff phones.
- **Publish**
  - Shows the diff in words, commits only the catalog files and pushes to main.
  - Shows the Vercel build status.
  - Rollback.

### Phase 7: staff app alignment (`d78d98b`; app branch `redesign`)
- **One status palette:** the staff app's palette is generated from the website tokens, with the same labels.
- **Order and quote cards** show:
  - the `SOF-`/`SOQ-` reference;
  - the customer's note;
  - the status history;
  - internal notes;
  - the quote reply.
- **Quotes** get a status filter.
- **Prices** show 3 decimals.
- **Updated wording** for enrolment.

### Phase 8: QA (this commit)
- **Performance:**
  - Firebase Auth is lazy for guests.
  - Only the current language's dictionary is sent.
  - Dynamic drawer and menu.
  - No link prefetching.
  - LCP image preload.
  - Webpack build.
  - The first-load JS for `_app` went from 63 KB to 27 KB gzip.
- **Lighthouse mobile:** performance 95–96, accessibility 100, SEO 100.
- **axe:** 0 issues.
- **Keyboard pass:** done.
- **Tests:** routing tests added; 68 unit, 19 rules, 63 API, all green.
- **Before/after comparisons:** `phase-8/compare/`.

## What you need to do

### Before merging to `main`
1. **Review the branch.** In particular:
   - the home page copy;
   - the testimonials, which are still placeholders: replace them with real ones (they are marked in `pages/index.js`).
2. **Vercel settings**
   - Leave the Build Command at its default, or set it to `npm run build`. That script now runs `next build --webpack`. If the project overrides it with `next build`, Turbopack is used and pages ship duplicated JS.
   - Node.js 20.9 or newer, which Next.js 16 requires.
3. **Vercel environment variables**
   - `NEXT_PUBLIC_SITE_URL`: your real domain, e.g. `https://www.example.com`, with no trailing slash. It is used for canonical links, hreflang, the sitemap and JSON-LD. If it isn't set, everything points at `https://sofracom-marine-services.vercel.app`.
   - The existing Firebase variables are unchanged:
     - `NEXT_PUBLIC_FIREBASE_*`
     - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, or `FIREBASE_SERVICE_ACCOUNT_BASE64`
   - The build reads review ratings from Firestore for the product JSON-LD, so the build needs these credentials. `SEO_RATINGS=off` skips that step.
4. **Firestore**
   - In Google Cloud Console → Firestore → **TTL**, add a policy on collection group **`rateLimits`**, field **`expireAt`**. Without it, `/track` rate-limit counters accumulate. They stay small, but this keeps them from growing forever.
   - `firestore.rules` did not change. The new `refs` and `rateLimits` collections are already closed to browsers by the catch-all deny. `firestore.indexes.json` did not change either.
5. **After the first deploy, give existing orders and quotes a reference.**
   - First run `node scripts/backfill-refs.mjs` (a dry run that lists what it would do).
   - Then run `node scripts/backfill-refs.mjs --apply`.
   - It uses your production credentials, so run it yourself. Until then, older orders show their short ID.

### Local admin app (your computer only)
- `.env` can hold `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` and, for a team project, `VERCEL_TEAM_ID`. With them, Publish shows the Vercel build status.
- Publish needs `PRODUCT_ADMIN_GITHUB_TOKEN` (+ `PRODUCT_ADMIN_GITHUB_USERNAME`) in `.env` to push, as before. It is a GitHub token with write access to this repository. It is never printed.
- `npm run gallery-admin` and the old port 5173/5174 tools are gone. Use `npm run admin`.
- Publish works only with `main` checked out. Pull before editing.

### Staff app
- Review and merge the `redesign` branch in `../../IdeaProjects/sofracom_admin_pp`, then build and release it as usual.
- After any status colour or label change on the website, regenerate the palette with `node scripts/export-staff-palette.mjs --write ../../IdeaProjects/sofracom_admin_pp`. A website test fails while the palette is out of date.

### Content to review (in the admin app, Catalog → "translations to review")
- 74 drafted Arabic names, plus 14 suggested replacements for Arabic titles that are just English. Accept or edit each one, then click "Mark reviewed".
- The FR/AR glossary for tags and options in `lib/catalogGlossary.js`.
- 70 products have no Arabic description. They show the English text, correctly marked, until you write one.
- Data problems found by the new validation. These are warnings and don't block edits:
  - "M12 Stainless Steel Washers …" has two options both called **12X125**.
  - The category slug `powertools&parts` contains `&`. I left it unchanged, because changing it changes its URLs.

### Redirects
Nothing to do. Old product URLs, old image paths and the language pages all redirect automatically, via `next.config.js` and `lib/data/image-redirects.json`. These redirects are tested.

## Known gaps
- **Mobile LCP in Lighthouse's simulated throttling is 2.8–3.0 s**, against the 2.5 s target. The cause is the bandwidth the hero image shares with the web font and the Next.js runtime; details are in `phase-8/REPORT.md`. With DevTools throttling it is 1.6–2.0 s, and on desktop 0.6–0.8 s. The remaining options are design decisions:
  - drop Inter for the system font;
  - inline a tiny hero placeholder.
- **Best practices 96 locally:** only the `/_vercel/insights` 404, which doesn't happen on Vercel.
- **The admin app is English only.** It is a staff tool; status labels come from the shared translations.
- **3 pre-existing `unused_element_parameter` warnings** in the staff app's `flutter analyze`. They were not introduced by the redesign.
- **The testimonials are placeholders** (kept on purpose).
- **Rate limits on API routes other than `/track`** remain in-memory per serverless instance, as before.
