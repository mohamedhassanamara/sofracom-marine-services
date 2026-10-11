# SOFRACOM redesign: what changed and what you need to do

> **Images are not in git.** Screenshots and image files named here are kept, git-ignored, in `docs/_images/redesign/` on the computer that made them (same file names).

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

### Visual redesign v2 (branch `redesign-v2`, built on `redesign`; reports in `docs/redesign-v2/step-{1,2,3}/`)
- **Look:**
  - "Clean premium": white pages, a neutral `#F5F5F3` well under every product photo, ink text and hairlines.
  - Manrope headings; IBM Plex Sans Arabic in Arabic.
  - Pill buttons, no resting shadows.
  - Colour comes from the brand:
    - a slim navy top bar (delivery, phone, tracking);
    - sky-blue "Get a quote" pills;
    - a navy-tinted hero;
    - pale-blue trust and About bands;
    - navy selected states;
    - a navy closing band + footer.
- **Catalog pages:**
  - a new header with a Shop panel and a search overlay;
  - one product card everywhere: "+" quick add with an option picker or bottom sheet, the 2nd photo on hover, real ratings only;
  - home: hero, trust bar, category tiles, product rail, service cards, steps, brands, FAQ, closing band;
  - category with no sidebar: sticky toolbar, popover filters including price, chips, a bottom sheet on phones;
  - product page: big gallery + lightbox, sticky buy column, accordions, "You may also need";
  - `/products` and `/search` match.
- **Rest of the site:**
  - checkout in 3 clear steps, with a sticky summary on desktop and a collapsible one on phones;
  - a calm confirmation with the large ref and "what happens next";
  - quote with image service cards;
  - track;
  - the account shell, order cards with thumbnails, an order timeline;
  - auth pages with the marina photo;
  - gallery as masonry;
  - a friendly 404.
- **Photos:**
  - Background-removed **cutouts** for all 225 product photos, waiting for review in **Admin → Photos** (approve / keep original / retry / bulk).
  - Only approved cutouts are copied into `public/assets` and published; the rest stay in the git-ignored `.cutouts-cache/`.
  - Category tiles use 2–3 chosen products each (Admin → Categories → Tile products).
  - Illustrated product pictures are flagged "Needs a real photo" (Admin → Today).
- **Hero:** a separate 3:4 phone crop with a media-scoped preload. Run `node scripts/hero-image.mjs <photo> --focus 0.6` to swap it.
- **Removed:** the placeholder testimonials (section, code and strings) and the temporary `/design-lab`.
- **Checks:**
  - all tests green (74 unit, 19 rules, 63 API);
  - axe 0 issues on every page, in EN and AR, at 1440 and 390, signed in and out;
  - Lighthouse mobile 93–97 on home, category, product and checkout in both languages.

## What you need to do

### Before merging to `main`
1. **Review the branch.** In particular:
   - the home page copy;
   - testimonials: v2 removed the placeholder section completely. Add a section back once you have real ones.
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

### Visual redesign v2 (before merging `redesign-v2`)
- **Cutouts**
  - Review them in `npm run admin` → **Photos**:
    - approve the good ones;
    - "Keep original" for illustrations, fabrics and failed masks (the fibreglass items);
    - then Publish.
  - To generate or retry cutouts on your computer, install `@imgly/background-removal-node` somewhere and set `BG_REMOVAL_PATH=` in `.env` to that package folder. It is ~300 MB, so it is not a site dependency.
  - The cutouts waiting for review are only in `.cutouts-cache/` on this computer. They aren't in git: run `node scripts/cutouts.mjs --all` on another machine.
- **Hero photo:** when you have the closer marina/berth photo, run `node scripts/hero-image.mjs photo.jpg --focus 0.6`. The current source is only 1280×576, so the phone crop is slightly upscaled.
- **Replace the 4 illustrated product pictures** listed on Admin → Today, then untick "Needs a real photo".
- **Service pictures** (home cards, quote form) are product cutouts until you have photos of the work. Edit them in `lib/siteMedia.js`.

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
- **Mobile LCP in Lighthouse's simulated throttling is 2.6–3.2 s (v2)**, against the 2.5 s target. Fonts are no longer preloaded and the hero has a small phone crop, which brought performance to 93–97. The rest is the Next.js runtime sharing the simulated 1.6 Mbps link.
- **Best practices 96 locally:** only the `/_vercel/insights` 404, which doesn't happen on Vercel.
- **The admin app is English only.** It is a staff tool; status labels come from the shared translations.
- **3 pre-existing `unused_element_parameter` warnings** in the staff app's `flutter analyze`. They were not introduced by the redesign.
- **The gallery has a single entry** (a video), so the masonry grid looks sparse until more are added in the admin.
- **Some catalog photos are illustrations** (4, flagged), and white products' cutouts need a careful review.
- **Rate limits on API routes other than `/track`** remain in-memory per serverless instance, as before.
