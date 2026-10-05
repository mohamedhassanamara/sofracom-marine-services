# Visual redesign v2 · Step 3: the rest of the site, final QA

Branch `redesign-v2`, not pushed.

## Your Step 2 feedback: colour
"Too blunt" is addressed with the brand colours, used as accents. The product photo wells stay `#F5F5F3`.
- **Top bar:** a slim navy bar above the header: same-day delivery to Marina Monastir · phone · Track an order.
- **Get a quote:** sky-blue (`accent-400`) pills everywhere: the header, the hero, the closing band and the phone menu.
- **Badge:** the cart count badge is sky blue.
- **Hero:** the shade is navy instead of black.
- **Bands:** the trust bar and the About section sit on pale navy (`navy-50`).
- **Accents:** accent-coloured eyebrows and step numbers.
- **Selected states:** pills, chips, filters, option chips and the checkout steps are navy.
- **Dark zone:** the home page's closing band and the footer are one navy zone. The footer is now navy on every page.

Screenshots: `catalog/*`, the same set as Step 2, re-taken.

## Before Step 3, items 1–4
1. **Cutout storage**
   - Generated cutouts now live in the git-ignored **`.cutouts-cache/`**.
   - **Approve** copies only that photo's 400/800/1600 WebP into `public/assets/products/cutouts/` and records the decision in `public/assets/data/cutouts.json`.
   - **Keep original** or a **retry** removes the published files again.
   - Publish therefore contains only approved files (tested).
   - **History rewritten:**
     - the Step 2 commit no longer contains the 675 files;
     - the Step 1 commit no longer has the 30 lab samples;
     - messages and dates are unchanged;
     - old objects pruned.
   - **Repo size:**
     - `.git` went from **659 MB to 609 MB**; the packs from 640.3 to 602.1 MiB.
     - The rest is the catalog's image history from before v2.
     - Committing Step 3 adds ~22 MB of screenshots. I quantized them (from 71 MB) and left Steps 1–2 untouched, so their history isn't duplicated.
2. **White and near-white products**
   - Cutouts are never blended. They sit on the `#F5F5F3` well with a faint edge (`photoClass`, `.photo-cutout`). Ordinary photos still multiply into the well.
   - `white-products-cutouts.png` shows the 5 whitest cutouts (paint rollers, the QP-3000 aerosol, the Lechler tube, the Methyl Acetate bottle). Each row has the original, the Step 2 rendering, and how it shows now.
   - The two **fibreglass** products are mask failures with both models. Use "Keep original" for them.
3. **Mobile hero**
   - `node scripts/hero-image.mjs <photo> --focus 0.62` writes a landscape set plus a **3:4 phone crop** (480/720 px, 25/40 KB).
   - `components/ui/HeroImage` serves the crop with `<picture>` and a `media="(max-width: 640px)"` preload, so phones never fetch the landscape file.
   - **Fonts:** no font is preloaded any more (Inter / Manrope / Plex). The LCP image goes first.
   - **Arabic mobile:** 97 (home), 93 (category and product).
4. **Illustrations**
   - The Polyurethane, Acrylic and Epoxy SELEMIX paints and the Methyl Acetate "Acetone" picture are flagged `needsPhoto`.
   - They are listed on **Admin → Today → Needs a real photo**.
   - Untick the checkbox in the product editor (Photos) after uploading a real photo.

Screenshots: `admin-today-needs-photo.png`, `admin-product-needs-photo.png`, `admin-photos-cache.png`.

## Step 3 pages
- **Kit**
  - Form fields: 48 px, rounded, hairline borders, navy focus.
  - Cards without shadows; pill segmented controls; a softer empty state.
  - The account `ui-*` classes match, so every form and page changed together.
- **Checkout**
  - Three numbered steps: **Contact → Delivery → Review**. The indicator at the top follows focus.
  - Desktop: form on the start side, sticky **order summary with thumbnails** on the end side.
  - Phones: one column, with the summary **collapsible at the top** (the total is always visible).
  - A big full-width **Place order · total** (56 px) at the Review step, with a recap of the entered details.
  - Error summary and field errors unchanged.
- **Confirmation**
  - Calm: a navy check, the **order ref large** (with Copy).
  - **What happens next** in 3 steps: we call you → we prepare it → we deliver it.
  - **Track order**, plus **Create an account to follow your orders** for guests, pre-filled as before.
- **Quote**
  - The service picker is **image cards** (4 per row, 2 on phones).
  - The pictures come from `lib/siteMedia.js` `QUOTE_SERVICE_ART`: product cutouts for now, a photo for haul-out.
  - Short fields: boat type and length in one row, a 4-line details box, contact on the end side.
  - The success page shows the ref large.
- **Track:** a calm form panel. The result shows the timeline and items side by side on desktop.
- **Account**
  - A quiet side nav with a navy marker (desktop) or underlined tabs (phones).
  - Orders are **cards with a thumbnail strip**, the status badge and the total.
  - The order detail has a **clear timeline** (navy done steps, an accent ring on the current one) in a sticky panel.
- **Sign in / up / reset:** centred, minimal, with the **marina photo on the side** on desktop.
- **Gallery:** a **masonry** grid (CSS columns, photos at their own height) and the existing lightbox. Only one entry exists today.
- **404:** a friendly "404" with search, Home / Get a quote, and the **category tiles**.
- **Lab:** `/design-lab` and `components/lab/` are deleted, along with the `_app` code only the lab used.

## QA
- **`npm test`:** **74 unit, 19 rules, 63 API, all green**, including the emulator suites. New tests cover:
  - the cutout cache (approve copies, keep/back remove, not-cached message);
  - the admin cutout API (only approved files are published).
- **axe:**
  - **0 violations of any severity.**
  - Tested on every page in EN and AR, at 1440 and 390: home, `/products`, category, product, search, quote, track, gallery, 404, login, signup, reset, styleguide, cart drawer, checkout with an item, the confirmation after placing an order, and, signed in, profile, orders, order detail, addresses, quotes, reviews and change password.
  - **Fixed along the way:**
    - The top bar is now a labelled landmark, and the skip link comes first.
    - A styleguide swatch label had low contrast.
- **Lighthouse, mobile (production build, emulators):**

| Page | EN perf | AR perf | A11y | SEO | LCP (EN / AR) |
|---|---|---|---|---|---|
| Home | 94 | 97 | 100 | 100 | 3.0 / 2.6 s |
| Category | 94 | 93 | 100 | 100 | 3.1 / 3.0 s |
| Product | 94 | 93 | 100 | 100 | 3.0 / 3.0 s |
| Checkout | 93 | 94 | 100 | 58* | 3.2 / 2.9 s |

  \*Checkout is `noindex` on purpose. Checkout's layout shift (the footer jumping when the cart loads) was fixed with a stable minimum height: CLS went from 0.049 to 0.011.

## Screenshots (this folder; 1440 + 390, EN + AR)
- **Pages:**
  - `cart-drawer`, `checkout` (+ `-top`, `-errors`, `-summary-open` on phones), `confirmation`;
  - `track`, `track-result`, `quote`, `quote-success`;
  - `auth-{login,signup,reset}`;
  - `account-{profile,orders,order-detail,addresses,quotes,reviews}`;
  - `gallery`, `gallery-lightbox`, `404`.
- **`catalog/`:** home, products, category, product, search and the interactive states, after the colour pass.
- **`compare/`:** **before (v1) / after (v2)** for 18 pages, desktop EN and phone AR. The "before" images are the v1 screenshots from `docs/redesign/phase-4` and `phase-8/final`.

## Still for you
See `docs/redesign/CHANGES.md` → "Visual redesign v2". In short:
- review and publish the cutouts;
- add `BG_REMOVAL_PATH` to `.env`;
- swap in the new hero photo with one command;
- replace the 4 illustrated pictures;
- add real service photos when you have them.
