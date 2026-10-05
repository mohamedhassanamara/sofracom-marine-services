# Visual redesign v2 · Step 2: the new look on the catalog pages

> **Images are not in git.** Screenshots and image files named here are kept, git-ignored, in `docs/_images/redesign-v2/step-2/` on the computer that made them (same file names).

Branch `redesign-v2`, not pushed. Your Step 1 choices are applied: hero A (full-bleed), Manrope + IBM Plex Sans Arabic, cutouts with admin review, product cutouts as category art, testimonials removed, the language switch in the header, and "Get a quote" in the phone menu.

## Through the tokens and components
- **Base**
  - White page, `ink` text, 1.6 line height.
  - Every h1–h3 uses Manrope with −0.02em tracking.
  - Letter-spacing is off on Arabic pages, because it breaks Arabic letter joining.
- **Kit restyled for every page**
  - **Button:** pills, no shadows; secondary is a hairline outline. The account `.ui-btn` classes match.
  - **QuantityStepper:** a pill, with a large 56 px size.
  - **Breadcrumb**, **LoadMore**.
- **New in the kit**
  - **`Sheet`:** a bottom sheet.
  - **`Popover`**.
  - **`ProductRail`:** a carousel. Swipe on phones; on larger screens the ‹ › buttons follow the reading direction and are disabled at the ends.
  - **`CategoryArt`:** 1–3 products composed on the neutral surface.
- **ProductCard**, the one card used everywhere:
  - square image well, no border; brand / title (2 lines) / price ("from" when options differ) / stars only from real reviews;
  - stock shown only when the product is not in stock;
  - a "+" on the image: on hover with a mouse, always on touch screens;
  - products with options open a picker with each option's price: a popover on desktop, a bottom sheet on phones;
  - hover shows the second photo.

## Header and footer
- **Header**
  - White, with a hairline border. On scroll it turns translucent with a blur and gets shorter.
  - Logo · Shop / Services / Gallery / About · search, outline "Get a quote" pill, EN/FR/AR, account, cart.
  - **Shop** opens a panel of category tiles. Escape now closes it from the button too; I fixed this while testing.
  - **Search** opens a panel docked at the top: a native modal, so focus is trapped and Escape works. It shows popular categories and product thumbnails, with live results and "See all results".
  - The phone menu: a navy "Get a quote" at the top, then categories, links, tracking and language.
- **Footer:** light surface, 4 columns, working links. The contact column is the `#contact` target.

## Home (`pages/index.js`)
1. **Hero:**
   - Full-bleed marina photo with a light shade behind the text.
   - The headline "Everything your boat needs, in Monastir.", one subline, and *Shop supplies* / *Get a quote*.
2. **Trust bar:** delivered to your berth · expert advice · top marine brands · based in Monastir.
3. **Shop by category:** 6 large tiles, each showing its tile products.
4. **Popular products:** a rail of 10 cards.
5. **Services:** 3 large cards (antifouling, gelcoat, haul-out), each with a visible "Get a quote", including on phones. The other services are linked pills, followed by "How it works" in 4 numbered steps.
6. **Brands:** one grayscale row; colour on hover.
7. **About / location:** on the neutral surface.
8. **FAQ.**
9. **The one dark band:** "Planning a refit? Get a free quote" with the phone number. It sits flush on the footer.

**Testimonials:** the section, its code and all its strings are deleted.

**Changing the photos:** everything is in **`lib/siteMedia.js`**: `HERO.image` and `HERO.position`, plus each service card's photo or products. To use your new marina photo:
1. Put the JPEG under `public/assets/site/`.
2. Run `node scripts/optimize-images.mjs --apply`.
3. Set `HERO.image` to its `-800.webp` path.

## Category, product, search
- **Category** (no sidebar):
  - big title and one line; a scrolling row of use pills;
  - a sticky toolbar with Brand / Use / Availability / **Price** popovers, the count and sort;
  - removable chips with "Clear all"; a 4/3/2-column grid; an empty state.
  - On phones: one **Filters** button opening a bottom sheet with "Show N products".
  - Filters stay in the URL; the price filter is new, e.g. `?price=50-200`.
- **Product:**
  - a large gallery (click to enlarge; the lightbox has prev/next);
  - a sticky info column: brand, title, real rating, price, option chips with prices, stock dot and note;
  - a pill quantity control, a 56 px "Add to cart", a full-width **Ask for a quote on this** (on phones too), and "Delivered to Marina Monastir · 7.000 DT";
  - below: Description (open), Specifications (uses + options table), Datasheet, Reviews (restyled), then "You may also need" (same category, same brand first);
  - the phone buy bar keeps a quote button.
- **`/products`** and **`/search`:** the same tiles, grid and pills.

## Cutouts
- **Generated:** all **225 catalog photos**, with 0 failures (`node scripts/cutouts.mjs --all`, about 1.5 s each). All are **pending**, so the site still shows the originals until you approve them.
  - Files: `public/assets/products/cutouts/` (675 WebP, 39 MB).
  - Manifest: `public/assets/data/cutouts.json`.
  - Publish includes both.
- **Admin → Photos** (`admin-photos-*.png`):
  - filters: To review / Approved / Kept original / No cutout;
  - search; original next to the cutout, shown as on the site;
  - **Approve**, **Keep original**, **Retry** (with the other model);
  - select all shown → **Approve selected** / **Keep originals**;
  - **Generate missing**, in batches of 5, with Stop.
  - Nothing is deleted, so every choice is reversible. The Publish preview lists "Photo cutouts" (added = now shown on the site; removed = back to the original).
- **For the admin to generate or retry,** add `BG_REMOVAL_PATH=` to `.env`, pointing at an installed `@imgly/background-removal-node`. It is ~300 MB, so it is deliberately not a dependency. Reviewing works without it.
- **What to expect while reviewing:**
  - Cans, tubes, tools and blister packs come out clean.
  - **Some catalog "photos" are illustrations**, e.g. the Polyurethane / Acrylic / Epoxy / Acetone circles. Keep the originals for those.
  - A few white products come out almost blank. Retry them, or keep the original.
- **Category tiles:** I picked 2–3 clean products per category, saved as `featuredProductIds` in `products.json`. You can change them in **Admin → Catalog → Categories → Tile products**. An empty list means automatic selection.

## Ratings
Stars appear only from real review data: live stats, or the build-time snapshot on product pages. The lab's sample ratings are gone too.

## Checks
- **Tests:** `npm test` gives **73 unit, 19 rules, 63 API, all green**. New tests:
  - cutout resolver and statuses;
  - the admin's cutout API (token, bulk approve, publish diff, reversible, "not installed" message);
  - category tiles in the catalog index.
- **axe:** 0 violations of any severity on home, `/products`, category, product and search, in EN and AR, at 1440 and 390. Also 0 with the search panel, Shop menu, a filter popover and the filter sheet open.
- **Lighthouse, mobile (production build, simulated throttling):**

| Page | EN perf | AR perf | A11y | SEO | LCP (EN / AR) |
|---|---|---|---|---|---|
| Home | 94 | 91 | 100 | 100 | 3.1 s / 3.4 s |
| Category | 94 | 90 | 100 | 100 | 3.2 s / 3.5 s |
| Product | 94 | 90 | 100 | 100 | 3.0 s / 3.5 s |

  - Desktop home: 100 / 100 / 100.
  - To stay ≥ 90, Manrope is **not preloaded**: headings swap in after the LCP image.
  - IBM Plex Sans Arabic now loads 2 weights instead of 4: 400 for text, 600 for headings. The Arabic pages were at 87 before this change.
  - **Arabic is right at the line.** If you want headroom, the next step is a smaller hero image on phones.

## Screenshots (this folder)
- **Pages:** `{home,products,category,product,search}-{desktop,mobile}-{en,ar}.png` (whole page), plus a `-top` version of each (first screen).
- **States** (`state-*`):
  - search open, and with results;
  - Shop menu, filter popover;
  - card hover, option picker (desktop) / option sheet (phone);
  - phone menu, filter sheet, lightbox.
- **Admin:** Photos, a selection, category tile products.
- **On phone whole-page shots, the "+" is forced visible.** Chromium drops touch emulation in full-page captures; on a real phone it is always visible.

## Notes
- Checkout, quote, track, account, auth, gallery and 404 pick up the new buttons and header/footer now. Their own pages are restyled in Step 3.
- `/design-lab` still works in dev. It will be deleted with `components/lab/` at the end of Step 3.
