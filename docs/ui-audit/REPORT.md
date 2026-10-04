# SOFRACOM UI/UX audit (full report)

Audited 2026-10-04 on branch `redesign` (HEAD `ce00448`). This was a read-only audit: no app code, styles or config were changed, and nothing was committed. All runtime checks ran against the Firebase emulators (`demo-sofracom`): the emulated dev site on :3100, a production build on :3200 for Lighthouse, product-admin and `/ops` on :5183, and gallery-admin on :5184. Nothing was saved in the catalog or gallery tools, because they auto-commit and push.

**Companion files.** `SUMMARY.md` is the short version (under 300 lines). `inventory.json` holds pages, components, design tokens, animations, admin tools, workflows and the status palette. `screenshots/` holds 78 curated shots, and `contact-sheets/` holds 6 grids. `lighthouse/` has 8 JSON+HTML reports and `axe/` has 31 scans. Some screenshot names cited below come from the full capture run (≈440 files) and were pruned to keep the set small. Most of them appear on the contact sheets. Paths like `$S/scripts/…` refer to throwaway audit scripts that were not kept in the repo.

## 1. Executive summary

1. **Images are the #1 problem.** There are 391 MB of phone photos (up to 4080×3060 PNG), served raw: no `next/image`, no lazy loading. A category page downloads 57–96 MB, and mobile Lighthouse scores 60–68, with simulated LCP from 10 s to 275 s.
2. **Signed-in checkout can be impossible.** Choosing "Use a new address" makes the modal 1040 px tall, and it doesn't scroll, so the Order button can't be reached on phones or on 1366×768 laptops.
3. **The site loads Tailwind v2.2.19 from a CDN, but some markup uses v3 syntax**, which silently does nothing. The product page is a single column at 1440 with Add to cart below the fold. The CDN stylesheet is 251 KB, render-blocking and 99% unused.
4. **Guests cannot track an order.** There is no order number, no email, and guest orders don't attach to a new account unless the email is verified, which nothing on screen explains.
5. **Trilingual support is half done.** The page HTML is always English, there are about 50 English text nodes on the AR home page, 72 of 167 products have no Arabic title, the product and cart UI strings were never translated, and several RTL layout bugs remain.
6. **There are two design systems side by side.** The account pages use a coherent `ui-*` system. Marketing and catalog use stock Tailwind blues and grays plus ad-hoc CSS: 14 blues, 5 primary-button looks, 24 font sizes, and no reduced-motion support.
7. **Mobile is rough.** Signed in, the header overflows to 409 px; the logo collides with the account pill; inputs are 15.2 px, so iOS zooms in; and a category page has 82 tap targets under 24 px.
8. **The admin side is 3 tools, 2 ports and 3 npm scripts, with no shared UI.** The catalog editor deploys by committing the whole git index and pushing whatever branch is checked out (Cmd+S does it with no confirmation). The PRODUCTION/EMULATOR banner exists only on `/ops`, and both servers accept cross-origin requests from any website (`*`).
9. **The foundations are good.** Server-side pricing, stable product ids, API-only writes with rules tests, a clean status model, low JS cost (TBT ≤ 40 ms, CLS ≈ 0), real Monastir photography and the brand navy are all worth building on.
10. **Biggest opportunities:** an image pipeline, one token-based design system (Tailwind v3 build or plain CSS tokens) built from the existing `ui-*` pieces, a shared Dialog/ProductCard/Button, a cart available site-wide, order refs plus guest lookup, language in the URL, and one local admin app with an explicit Draft → Publish flow.

## A1. Pages, states and journeys

Site: http://localhost:3100 (next dev, Firebase emulators). Captured 2026-10-04 with Playwright (Chromium), viewports 1440x900 and 390x844 (390 uses `isMobile` + touch), DPR 1.
Script: `$S/scripts/a1-site-shots.js` (re-run one step: `ONLY_STEP=buyer-reviews node ... 390-en`). Merged metrics: `$S/scripts/a1-merged.json`. Inventory JSON: `$S/drafts/a1-pages.json`.
Screenshots: 399 site captures were taken (EN complete, AR nearly complete, FR subset). A curated 78 are kept in `screenshots/`, and many of the rest appear on the contact sheets.

Emulator side effects (all against the emulator): 4 guest orders and 4 guest quotes ("Audit Guest", guest-audit@example.test). The buyer profile was re-saved with the same values. 3 reviews were written as buyer and then deleted again through the UI, matched by their "(automated UI audit)" / "اختبار آلي" text. Another agent's buyer review on p_bamzqzdm ("Good product, delivered quickly…") was left alone.

Notes for readers: the round "N" badge at the bottom left of every shot is the Next dev indicator, not part of the site. The other agents also changed the buyer's data while this ran (new pending order de2d33da, review on p_bamzqzdm), so the "in-progress" order shot shows a *pending* order.

### 1. Route table

| Route | File | Purpose | Main components | Data source |
|---|---|---|---|---|
| `/` | pages/index.js | Marketing home: hero, about, brands, services, testimonials, FAQ, contact + **quote request form (the only "quote mode" on the site)** | Layout header/mobile menu/search suggestions/footer/back-to-top, hero, parallax, FAQ accordion, `#quote-form` | Static i18n plus hard-coded arrays. Header suggestions fetch `/assets/data/products.json` in the browser. Quote: `POST /api/create-quote` |
| `/products` | pages/products/index.js | Category grid | category cards, CartWidget | static JSON (getStaticProps) |
| `/products/[categorySlug]` | pages/products/[categorySlug]/index.js | Products in one category with brand filter, text filter, sort, reset | ProductCard (variant select, stock badge, read more, datasheet, Add to cart), CardRating, CartWidget | static JSON; ratings `GET /api/product-stats` |
| `/products/[categorySlug]/[productId]` | pages/products/[categorySlug]/[productId].js | Product detail plus reviews | image + thumbs, variant buttons, stock badge, on-order note, Add to cart, ProductReviews, ReviewForm modal, CartWidget | Static JSON. Client calls: `/api/product-stats`, `GET /api/reviews`, `GET /api/reviews/mine`, `POST/DELETE /api/reviews` |
| Cart drawer | components/cart/CartWidget.js | Floating cart button and drawer. **Only on /products, category and product pages** (not on home, search, gallery or account) | `#cartFab`, `#cartDrawer`, qty stepper, summary, on-order notice | localStorage `sofracom.cart.v1` (CartContext) |
| Checkout modal | components/cart/CheckoutModal.js | Order checkout. There is no quote mode: quotes go through the home contact form | sign-in prompt, guest fields, member address picker, AddressFields, confirmation | `GET /api/account/profile`, `POST /api/create-order` |
| `/search?q=` | pages/search.js | Full-catalog search. **No cart widget and no Add to cart** | form, count, result cards | static JSON |
| `/gallery` | pages/gallery/index.js | Images/videos with type filter. **No lightbox**. Currently 1 entry (a YouTube video) | filter pills, GalleryCard (img / iframe / link fallback) | static JSON (gallery.json) |
| `/account/login` | pages/account/login.js | Email-or-phone + password, Google | AuthCard, GoogleButton | Firebase Auth (client) |
| `/account/signup` | pages/account/signup.js | Create account (email/phone detected live) | AuthCard, GoogleButton | Firebase Auth + `POST /api/account/register` |
| `/account/reset` | pages/account/reset.js | Reset link (email) or "call the shop" (phone accounts) | AuthCard | Firebase Auth |
| `/account/change-password` | pages/account/change-password.js | New password (forced after a staff temp password) | AccountLayout, 2 fields | Firebase Auth + `/api/account/password-changed` |
| `/account` | pages/account/index.js | Profile: name, login id (read only), other contact, language | AccountLayout (nav, sign out), verify-email banner, form | AuthContext profile; `PUT /api/account/profile` |
| `/account/addresses` | pages/account/addresses.js | Address CRUD + default | cards, AddressFields, inline delete confirm | `/api/account/profile`, `/api/account/addresses` |
| `/account/orders` | pages/account/orders/index.js | Order list | record cards, StatusBadge, "Rate your items" pill | **Firestore client read** (`lib/accountData.listMine`) |
| `/account/orders/[id]` | pages/account/orders/[id].js | Items, totals, delivery, status timeline | order lines, totals, StatusTimeline, delivered prompt | Firestore client read (`getMine`) |
| `/account/quotes` | pages/account/quotes/index.js | Quote list | record cards, "New quote" goes to `/#contact` | Firestore client read |
| `/account/quotes/[id]` | pages/account/quotes/[id].js | Quote detail + timeline | dl, StatusTimeline | Firestore client read |
| `/account/reviews` | pages/account/reviews.js | Products to review + my reviews | lists, nav badge, ReviewForm | `GET /api/reviews/mine`, `POST/DELETE /api/reviews` |
| 404 | *(no pages/404.js)* | Default Next 404 inside Layout. Unknown product ids also land here (`fallback:false`) | — | — |

### 2. States table (from code, and whether each was captured)

Legend: ✓ captured · – exists in code but not captured · n/a not applicable

| Page | Loading | Empty | Error | Success | Disabled | Stock (out / on order) | Guest vs signed in |
|---|---|---|---|---|---|---|---|
| Home / quote form | n/a (static) | ✓ quote-empty | ✓ quote-error. **Empty submit is blocked by native `required` popups** (index.js:546,560), so the custom message only shows when the message is missing, and it is English only (index.js:129) | ✓ quote-success, hard-coded English (index.js:143), auto-hides after 6 s | button disabled while sending, with no visual change – | n/a | ✓ signed in prefills name/email/phone (home-quote-prefilled-member) |
| Header | – | n/a | n/a | n/a | n/a | n/a | ✓ guest "Sign in" vs ✓ "My account" + avatar. Also ✓ mobile menu, ✓ scrolled solid header, ✓ products dropdown, ✓ search suggestions |
| Catalog | n/a | n/a | n/a | n/a | n/a | n/a | same |
| Category | ratings load silently | **no empty state: a filter with 0 matches shows ALL products** ([categorySlug]/index.js:205 `filtered.length ? filtered : localizedProducts`), ✓ category-empty-filter | n/a | ✓ brand-filter, sort | Add disabled when out of stock ✓ | ✓ outofstock-card, ✓ onorder-cards | same |
| Product | reviews loading – | ✓ "No reviews yet" | reviews error – | ✓ review-submitted | Add disabled when out ✓ | ✓ outofstock, ✓ onorder (orange note), ✓ **firstvariant-out: defaults to variant 0 (out) even though variant 2 is in stock** ([productId].js:45; the card version picks the first in-stock one) | ✓ guest "Sign in to review", ✓ not eligible "only buyers" (staff), ✓ eligible "Write a review", ✓ has review "Edit your review" |
| Cart drawer | n/a | ✓ cart-empty. **Shows Delivery fee 7,000 DT and Grand total 7,000 DT with an empty cart** (CartWidget.js:176-185) | n/a | ✓ on-order notice | Checkout disabled when empty ✓ | on-order notice ✓ | same |
| Checkout | member: "Loading…" while addresses load – | n/a | ✓ guest-errors (single message, no per-field marking) | ✓ guest-confirmation (delayed / on-order wording). Member confirmation with "Track order" – (not placed, to keep buyer data stable) | submit disabled while sending/loading | delayed wording ✓ | ✓ guest prompt, guest form, filled; ✓ member saved address, new address, no address (staff) |
| Search | n/a | ✓ empty-query, ✓ no-results | n/a | ✓ results | n/a | badge only (uses product-level stock, ignores variants) | same |
| Gallery | n/a | gallery.empty (unreachable with current data) | n/a | ✓ all / images / videos | n/a | n/a | same |
| Login | busy label – | n/a | ✓ required, ✓ wrong password | redirect | ✓ | n/a | signed in → redirect |
| Signup | busy – | n/a | ✓ short password, ✓ email in use | redirect | ✓ | n/a | signed in → redirect |
| Reset | busy – | n/a | ✓ required | ✓ sent (also for unknown email), ✓ phone-account info | ✓ | n/a | n/a |
| Change password | – | n/a | ✓ mismatch, too short – | redirect | ✓ | n/a | temp-password warning – |
| Profile | ✓ (account.loading, brief) | n/a | ✓ name error | ✓ saved. **Saving switches the site to the profile language** (index.js:54 `setLang(result.profile.lang)`): saving in AR switched the site to EN (account-profile-saved-1440-ar) | ✓ | n/a | guest → ✓ redirect to login (account-guest-redirect); verify-email banner – (seed users are verified) |
| Addresses | ✓ | ✓ empty (staff) | ✓ form-error (one message for the first problem) | saved notice – | ✓ busy | n/a | ✓ with address, ✓ form-new, ✓ delete-confirm |
| Orders list | ✓ | ✓ empty (staff) + Browse CTA | generic error – | ✓ list | n/a | n/a | — |
| Order detail | ✓ | ✓ not-found | n/a | ✓ delivered + rate prompt, ✓ in progress (pending) timeline | n/a | n/a | cancelled timeline – |
| Quotes list/detail | ✓ | ✓ empty | – | ✓ list, ✓ detail (in_review + note) | n/a | n/a | — |
| Account reviews | ✓ | ✓ nothing to review (staff), "no reviews yet" ✓ | – | ✓ with-my-review, after-delete notice | busy | n/a | ✓ nav badge count |
| Review form | n/a | n/a | ✓ error-no-rating | ✓ submitted, ✓ edit-existing, ✓ delete-confirm | ✓ | n/a | — |
| 404 | n/a | n/a | ✓ default, ✓ bad product id | n/a | n/a | n/a | — |

Products used: variants + 2 images `p_bamzqzdm`, out `p_u0n8pch8`, on-order `p_1xkasr5w`, variants [out,in] `p_t8wi61l1`, 17 variants `p_zckpww9j`, empty description `p_xtdv3l1f`.

### 3. Visual bugs observed

| # | Bug | Where / evidence | Cause (file:line) | Severity |
|---|---|---|---|---|
| V1 | **Signed-in header overflows at 390.** The "My account" pill shows on mobile (it should be `md:` only), overlaps the logo text, and pushes the layout to **409 px** (411/414 on some pages), so mobile zooms out or scrolls sideways. The hamburger is partly off-screen, and Playwright clicks on `#mobileMenuBtn`, Add to cart and Checkout were *intercepted* (needed JS clicks). 43 shots at 390 measured scrollWidth 409 > 390 | site-header-signed-in-390-en, site-account-profile-default-390-ar, site-checkout-member-saved-address-390-en | `.header-account{display:inline-flex}` (styles/account.css:262) overrides Tailwind `hidden` on `header-account hidden md:inline-flex` (Layout.js:389) | High |
| V2 | The guest "Sign in" pill also shows at 390 and **overlaps the "SOFRACOM" wordmark** (FR "Se connecter" is worse) | site-home-mobilemenu-390-en, site-home-hero-390-fr, site-product-variants-top-390-ar | same as V1 | High |
| V3 | **Product detail is single-column at 1440**: a huge image card, with price and Add to cart below the fold | site-product-variants-1440-en, site-product-firstvariant-out-1440-en | `lg:grid-cols-[1.1fr,0.9fr]` is Tailwind v3 arbitrary syntax and does nothing on the v2.2.19 CDN ([productId].js:98) | High |
| V4 | Other v3-only classes do nothing: mobile menu bg `bg-[rgba(...)]` (Layout.js:424), `border-white/30` (Layout.js:436,473), cart count chip `bg-white/15` (CartWidget.js:76), gallery badge `bg-white/80` (gallery:73), `tracking-[0.3em]` (gallery:127) | site-gallery-default-1440-en (the "Video" badge has no background and sits over the YouTube title) | v2 CDN | Medium |
| V5 | Empty category filter result shows the full list, so the user thinks the filter failed | site-category-empty-filter-1440-en | [categorySlug]/index.js:205 | Medium |
| V6 | Empty cart still charges 7 DT delivery and shows a 7 DT grand total | site-cart-empty-1440-en, site-cart-after-order-onorder-notice-1440-en | CartWidget.js:176-185 | Medium |
| V7 | The on-order notice after an order is rendered **inside the cart drawer, which has just been closed**, so the user never sees it unless they reopen the cart within 7 s | site-cart-after-order-onorder-notice-1440-en (seen only after reopening) | CartWidget.js:57-60, 94 | Medium |
| V8 | The back-to-top button (`#toTop`, fixed bottom-6 right-6) sits **under the cart FAB** (also bottom-right, z-60) on catalog/product pages. At 390 the FAB is full width and covers the bottom ~60 px of content and the checkout modal's Order button area | site-product-scrolled-fabs-1440-en, site-checkout-guest-prompt-390-en (Order button cut at fold) | globals.css:318-322, 865-869; Layout.js:556 | Medium |
| V9 | The closed cart drawer's box-shadow bleeds in as a grey strip on the right edge of every catalog/product page | right edge of site-category-empty-filter-1440-en, site-product-variants-top-390-ar | `.cart-drawer` translateX(100%) + `box-shadow:-8px 0 24px` (globals.css:360-372) | Low |
| V10 | Deep link `#write-review`: after publishing, **the form pops up again in "Edit your review" mode** because the effect re-runs when `mine` reloads while the hash is still in the URL | site-product-review-submitted-1440-en | ProductReviews.js:104-107 | Medium |
| V11 | Footer "Quick Links" are bare `#about`/`#services` anchors, so they are dead on every page except home (the header correctly uses `/#…`) | any footer, e.g. site-gallery-default-1440-en | Layout.js:505-535 | Medium |
| V12 | Home "Request a Free Quote" button links to `#contact`, the section it is already in (no-op) | site-home-quote-error-1440-en | index.js:521 | Low |
| V13 | No-rating summary shows a bold "–" bar plus a 0 % histogram, which reads as an empty or broken widget | site-product-scrolled-fabs-1440-en | ProductReviews.js:17 | Low |
| V14 | The checkout modal has double horizontal padding (inputs inset ~24 px inside the card on mobile) and one combined error message with no field highlighting | site-checkout-guest-errors-1440-en, site-checkout-guest-form-390-ar | CheckoutModal / `.cart-form` | Low |
| V15 | Nested `<main>` in every page (Layout `<main>` wraps the page's own `<main>`) | DOM | Layout.js:490 + pages | Low (a11y) |
| V16 | Default unstyled Next 404 with no way back except the header | site-404-default-1440-en | no pages/404.js | Low |

#### RTL / translation issues (AR, FR)

| # | Issue | Evidence | Cause |
|---|---|---|---|
| R1 | **AR 390, order detail: the page is 411 px wide**, content is shifted, there is a blank strip on the left of header/footer, and the status pill is clipped at the left edge | site-account-order-detail-in-progress-390-ar | a long unbroken product title in `.order-line`, plus V1 |
| R2 | Large parts of the UI are hard-coded English inside AR/FR pages: stock badges (`lib/stock.js` STOCK_LABEL), "Add to cart", "View details", "Read more/Show less", "Download datasheet", "Catalog", "Product detail", "N products / View", catalog hero, search page copy, quote-form status messages, "Phone" label, header search placeholder, footer blurb, "Back to top", about/services paragraphs | site-category-default-1440-ar, site-product-variants-top-390-ar, site-home-default-390-ar | strings not in lib/i18n |
| R3 | Bidi garbling of mixed strings: "Read more…surface" (the ellipsis jumps to the wrong side), "..Search products" placeholder, "DT 16,779" order flips, and the `DT` in the variant `<select>` collides with the dropdown chevron | site-category-default-1440-ar | no `<bdi>`/`dir="auto"` on mixed content; native select arrow position |
| R4 | Saving the profile while browsing in AR switches the whole site to EN (profile.lang stays 'en'; the form defaults to the profile, not the current UI language) | site-account-profile-saved-1440-ar | pages/account/index.js:24-30, 54 |
| R5 | Cart drawer still slides in from the **right** and the FAB/back-to-top stay bottom-right in RTL. Internals mirror correctly | site-cart-items-390-ar | globals.css physical `right:` properties |
| R6 | Gallery type badge uses `right-4` (not mirrored) and dates use the `en-US` formatter regardless of language | site-gallery-default-1440-ar | gallery/index.js:16,73 |
| R7 | FR hero wraps to 3 lines and the CTA labels wrap to 2 lines at 390 (acceptable), but the "Se connecter" pill collides with the logo (V2) | site-home-hero-390-fr | — |

#### Horizontal overflow at 390 (document.scrollWidth vs 390)
* 409 px: every signed-in page at 390 in EN and FR (43 shots), and AR profile pages. Cause V1. Guest pages: 0 overflow.
* 411 px: site-account-order-detail-in-progress-390-{en,ar}. 414 px: site-account-orders-list-390-fr, site-account-order-detail-delivered-390-fr.
* No overflow at 1440. No broken images (`naturalWidth==0`) on any page.

#### Console / network per page
* **No uncaught JS errors (`pageerror`) on any page.**
* Every page: 2 dev warnings, "Do not add stylesheets using next/head" (Google Fonts and the Tailwind CDN `<link>` in pages/_app.js:26-33). These should move to `_document.js`.
* /gallery: warning "No available adapters." (probably from the YouTube embed; unconfirmed).
* Expected 4xx from deliberate error states only: 400 signInWithPassword (wrong password), 409 /api/account/register (email in use), 400 sendOobCode (reset for an unknown email, shown to the user as "sent"), 404 on the 404 tests.

### A1.x User journeys

#### J1: Find a product from home → add to cart → guest checkout (1440 and 390)

| # | Action | Clicks (1440 / 390) | Fields | Screen | Friction notes |
|---|---|---|---|---|---|
| 1 | Land on home | 0 / 0 | – | `/` (1 full load, ~2.0 s dev) | Above the fold, the hero CTAs are **Explore Services** and **Get a Quote**. Nothing on home leads to the shop except the nav item. Home has **no cart button** (`#cartFab` count 0). |
| 2 | Open menu (mobile only) | – / 1 | – | `/` | At 390 the header logo text "SOFRACOM" and the **Sign in pill overlap by 40 px** (EN/FR/AR). `.header-account{display:inline-flex}` (styles/account.css:262) overrides Tailwind `hidden md:inline-flex` (Layout.js:389). Evidence: `site-journey1-step2-390-en.png`. The search box is only reachable inside the menu (`#siteSearch` hidden below 640 px). |
| 3 | Click **Products** | 1 / 1 | – | `/products` | Category grid. Heading is English-only. |
| 4 | Click category "Antifouling & Coatings" | 1 / 1 | – | `/products/antifouling-coatings` | 29 cards. At 390 the 4 filter controls stack and push the first product image to y≈370. |
| 5 | Click **View details** on a card | 1 / 1 | – | `/products/antifouling-coatings/p_hzvbdkwu` | **The product page is a single column at 1440.** `lg:grid-cols-[1.1fr,0.9fr]` is v3 arbitrary syntax that does not exist in the Tailwind 2.2.19 CDN (computed `grid-template-columns: 1104px`). As a result the **Add to cart button sits at y=1022 at 1440** (fold 900) and at **y=1193 at 390**. Evidence: `site-journey1-step4-1440-en.png`. |
| 6 | Scroll, click **Add to cart** | 1 (+1 scroll) / 1 (+1 scroll) | – | same URL, drawer opens | Good feedback: the drawer opens automatically and the FAB count updates ("Cart 1"). |
| 7 | Click **Checkout** in drawer | 1 / 1 | – | checkout modal over drawer | The modal shows a "Sign in to track your order" box **and** the guest form underneath at the same time. |
| 8 | Click **Continue as guest** | 1 / 1 | – | modal | This click does nothing except hide the sign-in box, because the guest fields were already usable. |
| 9 | Submit empty (probe) | – | – | modal | Single generic error: "Name, phone, and address are required." No per-field highlighting. |
| 10 | Fill name, phone, address | 3 / 3 | **3 req** + 2 opt (email, notes) | modal | The address is a free-text textarea with no city field. Phone has no format hint. The submit button just says **"Order"**. |
| 11 | Click **Order** | 1 / 1 | – | modal → confirmation | Confirmation says "Order received / Order received successfully." It shows **no order number, no summary, no tracking path and no next step** for guests (the "Track this order" link is member-only, CheckoutModal.js:218). Evidence: `site-journey1-step10-1440-en.png`. |
| 12 | **Go to home** | 1 / 1 | – | `/` | The only exit is to home. Home has no cart widget. |
| **Total** | | **10 clicks + 1 scroll** (1440) / **11 taps + 1 scroll** (390). Minimum 9 / 10 if you skip the useless "Continue as guest" | **3 required, 2 optional** | 4 routes + 2 overlays, 1 full load | Shortcut: "Add to cart" on the category card skips the product page (8 clicks). |

#### J2: The same, signed in with a saved address (1440)

The buyer already had a saved default address ("Boat – Marina Monastir, pontoon B"), so no address had to be added. Adding one from `/account/addresses` costs: **Add an address** (1) + 4 required fields (full name, phone, address line, city) + 2 optional (label, notes) + Save. That is 6–7 clicks (from the AddressFields code; I did not run it).

| # | Action | Clicks | Fields | Screen | Friction notes |
|---|---|---|---|---|---|
| 1 | Home | 0 | – | `/` | – |
| 2 | Click **Sign in** | 1 | – | `/account/login?next=%2F` | Correctly comes back to where you were. |
| 3 | Email + password, submit | 3 | 2 req | → `/` | ~3.3 s including the Firebase round trip. |
| 4 | Click header search, type "sika" | 1 | 1 | `/` dropdown | 6 suggestions with image and price. **Suggestion prices can differ from the cart price**: they show `product.price`, but the cart charges `variants[i].price`. Example: Sikaflex 291i shows 55,568 DT in the suggestion but 57,414 DT in the cart and order. **51 products** have a base price different from the first variant's price. |
| 5 | Click first suggestion | 1 | – | `/products/sealants-adhesives/p_n6zc6cxm` | Title says "300ml", but its only variant is "Black/Noir 400ml" (catalog data issue). |
| 6 | Scroll, **Add to cart** | 1 (+scroll) | – | drawer | Same below-the-fold problem as J1. |
| 7 | **Checkout** | 1 | – | modal | The default address is preselected as a radio card. "Use a new address" is offered. |
| 8 | **Order** | 1 | 0 req, 1 opt (notes) | confirmation | Shows **Track this order**, but still no order number in the confirmation. |
| 9 | **Track this order** | 1 | – | `/account/orders/<id>` | Order #DE2D33DA, "Pending", 4-step timeline. Good. |
| **Total** | | **10 clicks** (5 after sign-in) + 1 scroll | **0 required at checkout** (2 to sign in) | 5 routes + 2 overlays | The fastest path on the site. |

#### J3: Request a quote (1440)

| # | Action | Clicks | Fields | Screen | Friction notes |
|---|---|---|---|---|---|
| 1 | Home | 0 | – | `/` | – |
| 2 | Hero **Get a Quote** | 1 | – | `/#contact` (smooth scroll) | The quote form is the last section of a long home page. There is no `/quote` page. The account page's "Request a quote" button also links to `/#contact`. |
| 3 | Submit empty (probe) | 1 | – | – | Native browser bubble on Name ("Please fill out this field."). **Message is required only in JS** (no `required` attribute), and the JS error is hard-coded English (index.js:129). |
| 4 | Fill name, email, subject, message | 4 | **3 req** (name, email, message) + 2 opt (phone, subject) | – | Optional fields are not marked optional. The "Phone" label is English in every language (index.js:564). There are no fields for boat size/type or photos, although the timeline asks for "size, material, timeline". |
| 5 | **Send** | 1 | – | – | "Quote received! We will reply within a day." (English-only). It **disappears after 6 s** (index.js:161). There is no reference number and no link to "My quotes". |
| **Total (guest)** | | **7 clicks** | 3 req + 2 opt | 1 route | A guest cannot follow up on the quote online. |
| Signed in (3b) | Get a Quote → type subject + message → Send → Account → My quotes | 1 + 2 + 1 (+2 to view) | name/email/phone **prefilled**; 1 req typed | `/account/quotes` | The new quote appears as "Received". The success message still has no link to it. |

#### J4: Sign up from checkout (1440)

| # | Action | Clicks | Fields | Screen | Friction notes |
|---|---|---|---|---|---|
| 1 | Product page, **Add to cart** | 1 | – | drawer | – |
| 2 | **Checkout** | 1 | – | modal | **No "Create account" button.** Sign-up is only hinted at in the email-field help text ("…if you sign up later"). |
| 3 | **Sign in** (from the prompt) | 1 | – | `/account/login?next=/products/…?checkout=1` | – |
| 4 | **Create an account** (link at the bottom of the login card) | 1 | – | `/account/signup?next=…` | `next` is preserved. Good. |
| 5 | Name, email-or-phone, password, submit | 4 | **3 req** | → product page | You can sign up with a phone number or an email. Google is also offered. |
| 6 | Returned with **drawer + checkout reopened automatically** | 0 | – | modal | **The cart survives** ("Cart 1"). Only the name is prefilled. If the user had already typed guest details before leaving, **they are lost** (component state). |
| 7 | Fill new address + **Order** | 4 | **4 req** (name prefilled, phone, line, city) + 2 opt + "save address" checkbox | confirmation | **Two notes fields** appear ("Delivery notes (optional)" in the address and "Notes (optional)" for the order). That is confusing. |
| **Total** | | **13 clicks** | **6–7 required** (3 sign-up + 3–4 address) | 3 routes + 2 overlays | Works end to end, but takes 3 extra screens and has no visible "Create account" entry point. |

#### J5: Track an order: guest vs signed in

| # | Action | Clicks | Fields | Screen | Friction notes |
|---|---|---|---|---|---|
| G1 | Guest places an order **with email** | – | – | confirmation | No order number, no tracking link. No email/SMS is sent (no mail code in `pages/api` or `lib/server`). |
| G2 | Look for any tracking entry point | – | – | site-wide | **None.** No link contains "track/order". `/account/orders` redirects to login. |
| G3 | Sign up with the **same email** used at checkout | 1 + 4 | 3 req | `/account/orders` | **The guest order does not appear**: "You haven't placed any orders with this account yet." `/api/account/link` requires a *verified* email (link.js:30). Sign-up does not ask for verification, and the empty state doesn't mention it. The only hint is the verify banner on the Profile page. Evidence: `site-journey5-step5-1440-en.png`. |
| **Guest total** | | – | – | – | **A guest cannot track an order at all.** The only route is phone/email to the shop. |
| S1 | Signed-in: header **My account** | 1 | – | `/account` (Profile) | Lands on Profile, not Orders. |
| S2 | **My orders** | 1 | – | `/account/orders` | List with status pill, total and a "Rate your items" pill. Uses "1 item(s)" style plurals. |
| S3 | Open order | 1 | – | `/account/orders/<id>` | Timeline with timestamps, delivery details and totals. Good. |
| **Signed-in total** | | **3 clicks** from any page (on mobile, +1 for the menu) | 0 | 3 routes | – |

#### J6: Leave a review after delivery (buyer, order GLoEAVvN)

| # | Action | Clicks | Fields | Screen | Friction notes |
|---|---|---|---|---|---|
| 1 | Home (signed in) | 0 | – | `/` | **No prompt anywhere outside the account.** Home doesn't mention reviews and there is no header badge. |
| 2 | **My account** | 1 | – | `/account` | The account nav "Reviews" item shows **no badge here**. Badges are only passed by `pages/account/reviews.js` (AccountLayout.js:16, `badges = {}`), so the "2 to review" count only shows once you are already on the Reviews page. |
| 3 | **My orders** | 1 | – | `/account/orders` | The delivered order has a "Rate your items" pill. This is the first real discovery cue. |
| 4 | Open delivered order | 1 | – | `/account/orders/GLoEAVvN…` | Green banner: "Your order was delivered. How were the products?" with a **Rate your items** button. |
| 5 | **Rate your items** | 1 | – | `/account/reviews?order=…` | Items from this order are listed first ("From the order you just opened"). |
| 6 | **Write a review** | 1 | – | modal | – |
| 7 | Pick stars + comment | 2 | **1 req** (rating) + 1 opt (comment, 1000 chars) | modal | – |
| 8 | **Publish review** | 1 | – | `/account/reviews` | "Thank you! Your review is published." The badge drops to 1. |
| **Total** | | **8 clicks** | 1 req + 1 opt | 4 routes + 1 overlay | Discovery depends on the user opening My orders. There is no email, no home/header cue and no prompt on the product page unless they visit it while signed in ("Write a review" button appears there for eligible users). |

#### Journey summary

| Journey | Clicks | Required fields | Screens | Main blocker |
|---|---|---|---|---|
| J1 guest checkout | 10 (+1 scroll) desktop / 11 mobile | 3 | 4 + 2 overlays | Add to cart below the fold; confirmation has no order ref |
| J2 signed-in checkout | 5 after sign-in (10 total) | 0 | 5 + 2 overlays | Suggestion price ≠ cart price |
| J3 quote (guest) | 7 | 3 | 1 | Success text vanishes after 6 s, no ref, no tracking |
| J4 sign-up from checkout | 13 | 6–7 | 3 + 2 overlays | No "Create account" CTA in checkout |
| J5 track (guest / signed) | impossible / 3 | – | – / 3 | Guest orders never linked without email verification |
| J6 review | 8 | 1 | 4 + 1 overlay | Only discoverable via My orders |

---

## A2–A4. Visual system, components, motion

Scope: public website only (`pages/` minus `pages/api`, `components/`, `contexts/`, `styles/`, `pages/_app.js`). There is no `pages/_document.js` and no `tailwind.config.js`.
Method: static extraction scripts plus computed-style checks with Playwright on the emulated dev site at http://localhost:3100 (1440×900 and 390×844, en and ar). No screenshots were taken for this section.
Scripts: `$S/scripts/extract-system.mjs`, `color-math.mjs`, `computed-a2.mjs`, `account-headings.mjs`, `buttons.mjs`, `build-json.mjs`. Raw output: `$S/data/system.json`, `color-math.json`, `computed-a2.json`, `buttons.txt`, `imgsizes.txt`. Inventory: `$S/drafts/a2-a4-system.json`.

---

### Top findings (ranked)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **Product images are huge.** 289 product photos total 391 MB (median 1.4 MB; 177 are over 1 MB; the largest is 5.0 MB at 4080×3060). They are served as plain `<img>` into 220 px card slots, with no `next/image`, no `srcset` and no `loading="lazy"` (only the gallery uses lazy). The `/products/antifouling-coatings` page (29 products) downloaded **57 MB of images** and `/search?q=paint` downloaded 30 MB. `hardware-tools` has 88 products. | `$S/data/imgsizes.txt`, `computed-a2.json → imgBytesByPage`; `pages/products/[categorySlug]/index.js:51` | Critical (performance) |
| 2 | **Some Tailwind classes need v3 but the site loads v2.2.19 from a CDN, so they do nothing.** The worst case is the product detail layout: `lg:grid-cols-[1.1fr,0.9fr]` doesn't exist, so the page is **one column at 1440 px** (computed `grid-template-columns: 1104px`). Other dead classes: `bg-white/15` (cart count chip has no background), `bg-white/80` (gallery "Image/Video" badge has no background), `border-white/30` (twice), `bg-[rgba(11,32,80,0.92)]` (mobile menu), `tracking-[0.3em]` (gallery eyebrow), `text-orange-400` and `bg-opacity-15` (neither is in the v2 build). | `pages/products/[categorySlug]/[productId].js:98`, `components/cart/CartWidget.js:76`, `pages/gallery/index.js:73,127`, `components/Layout.js:374,402,424,436,473`, `[productId].js:167` | High |
| 3 | **Header search and language select render as opaque white boxes in the navy glass header.** `bg-opacity-15` doesn't exist in v2, so the computed background is `rgb(255,255,255)` with black text and a `placeholder-black` placeholder. The intended look was translucent. | `components/Layout.js:374,402`; computed `headerSearch.backgroundColor` | High (visual) |
| 4 | **There are two "navy" primaries plus a bright blue.** Brand `--deep-navy #0b2050` is used by `.ui-btn--primary` and `.cart-submit`. Tailwind `bg-blue-900 #1e3a8a` is used by the home contact/quote CTAs, the search button, the gallery filters and `#toTop`. `bg-blue-600 #2563eb` is used by the product-detail "Add to cart" button. That makes **5 visual styles for a primary button** across 41 distinct button class combinations. | `$S/data/buttons.txt` | High (consistency) |
| 5 | **Two gray scales are mixed.** The custom CSS uses Tailwind-v3 *slate* hexes (`#0f172a`, `#334155`, `#475569`, `#64748b`, `#94a3b8`). The Tailwind v2 classes are *coolGray* (`#111827`, `#374151`, `#4b5563`, `#6b7280`). That gives 6 near-duplicate pairs (ΔE 2.8–6.0). | §A2.1 | Medium |
| 6 | **Nothing respects `prefers-reduced-motion`.** There are zero matches in the repo. Motion that keeps running anyway: infinite float animations, scroll reveal, 3D tilt, fixed-background parallax and forced smooth scroll. | grep: 0 hits | High (a11y) |
| 7 | **The 3D tilt is broken and fights other effects.** No `perspective` is set, so `rotateX/Y` looks like a flat squash and `.layer translateZ(18px)` does nothing. Its inline `style.transform` permanently overrides `hover:scale-105` (brand cards) and the `.product-card:hover` lift. The `.tilt` transition also overrides the `[data-animate]` 0.6 s fade, so the opacity of tilt cards snaps instead of fading (computed `transition-property: transform, box-shadow`). | `components/Layout.js:133-158`, `styles/globals.css:129-152` | Medium |
| 8 | **Content is hidden until JS runs.** 34 `[data-animate]` elements on home, including the hero `<h1>`, are rendered at `opacity:0` in the SSR HTML until hydration plus IntersectionObserver. This delays LCP and leaves the page blank if JS fails. | `pages/index.js:179`, `styles/globals.css:129` | Medium |
| 9 | **RTL is only half done.** `account.css` uses logical properties, but the cart drawer (`right:0; translateX(100%)`), the cart FAB, `#toTop`, the search dropdown (`text-align:left`, `margin-right`), the `.variant-select` arrow, the home timeline (`border-l`, `-left-3`) and `ml-3` are physical. Computed in `ar`: the drawer is still `right:0`. **Inter has no Arabic glyphs**, so Arabic text falls back to the system font. | `computed-a2.json → checks.ar/arCart` | Medium |
| 10 | **The cart FAB covers `#toTop`.** Both sit at bottom 24 px / right 24 px. The FAB is z 60 and `#toTop` is z auto, so on catalog pages back-to-top is hidden underneath. At 390 px the FAB is full width (16–374 px) and `#toTop` (321–366 px) sits inside it. | `computed-a2.json → checks.mobileCat`; `styles/globals.css:318-333,864-870`; `components/Layout.js:557` | Medium |
| 11 | **The heading structure is uneven.** The category page has **no h1 and no h2**; product titles are h3. The search page uses h2 for product titles while the category page uses h3. The cart drawer's `h3 "Your order"` and the footer h3/h4 are in the DOM on every catalog page. Home uses h4 for the timeline steps under the h2 "Services" (h3 service cards in between). | §A2.2 | Medium (a11y/SEO) |
| 12 | **The CSS is bloated.** The Tailwind 2.2.19 CDN file is **2.93 MB raw / ~256 KB brotli**, render-blocking, and the site uses ~250 of its classes. The custom CSS has 22 dead rules (~3 KB): `.detail-*`, `.variant-option`, `.product-variants`, `.hero-bg`, `.admin-tabs`, `.admin-table*`. | §A2.6 | Medium (performance) |

---

### A2. Visual system as it really is

#### A2.1 Colors

**Brand tokens** (`styles/globals.css:1-7`). This is the only token layer. Tailwind is not configured with these values.

| Token | Value | Count of raw-hex repeats outside var() | Role |
|---|---|---|---|
| `--deep-navy` | `#0b2050` | 4 more hard-coded `#0b2050` (globals.css:273,422,454,485) | primary buttons, active states, header (as rgba(11,32,80,…)) |
| `--sea` | `#0f3d72` | 2 hard-coded (globals.css:228,278) | hover, links, `.ui-pill`/`.status-badge` text |
| `--sky` | `#e6f0ff` | – | tint backgrounds (pill, alert--info, nav hover) |
| `--accent` | `#24b4ff` | as rgba(36,180,255,…) ×6 | focus border/ring, current timeline dot, avatar, nav badge, hero glow |
| `--sand` | `#f8fafc` | 5 hard-coded | page background, chip backgrounds |

**Raw color values found:** 88 distinct hex/rgb(a) values in CSS and JSX (excluding the Google-logo SVG), plus one computed inline `rgba(15,32,80,${…})`. Of these, **50 are used exactly once**. There are also **47 distinct Tailwind color classes**.

Most-used raw colors (full list with every file:line in `a2-a4-system.json → designTokens.colors`):

| Value | Count | Role | Where |
|---|---|---|---|
| `#fff` | 28 | surfaces, white text | globals.css ×11, account.css ×17 |
| `#0f172a` (slate-900) | 14 | body/heading text | globals.css:19,46,85,409,640,642; account.css:119,242,379,422,598,646,739,791 |
| `#64748b` (slate-500) | 8 | muted text | account.css:140,185,192,386,427,609,691,907 |
| `rgba(15,61,114,0.08)` | 7 | hairline card border | globals.css:398,533,853; account.css:9,408,779,898 |
| `rgba(11,32,80,0.18)` | 6 | input borders | globals.css:372,490; account.css:113,830,873,912 |
| `rgba(15,61,114,0.12)` | 6 | dividers | globals.css:384,464,475; account.css:223,554,647 |
| `#f8fafc` | 6 | sand | globals.css:6,244,630,823,833; account.css:253 |
| `#f3f4f6` (gray-100) | 5 | image placeholder | globals.css:267,417; account.css:134,440,629 |
| `#334155` (slate-700) | 5 | secondary text | account.css:149,334,484,636,801 |
| `#b91c1c` | 4 | error | globals.css:56; account.css:57,162,523 |
| `#0f7a2e` | 4 | success/in stock | globals.css:293,681; account.css:517,815 |
| `#d72638` | 4 | danger/out of stock | globals.css:299,677; account.css:592-593 |
| `#94a3b8` (slate-400) | 4 | faint text (**fails AA**) | account.css:212,602,796,839 |

**One-off / off-palette colors worth removing:** `#0f62fe` (IBM blue, datasheet link, globals.css:562), `#1d4ed8` (another datasheet link, globals.css:661), `#2563eb` (card links, globals.css:555,584), `#0b1f3a` (select/variant text, globals.css:606,834), `#0f1f4e` (dead breadcrumb, globals.css:784), `rgba(15,32,80,…)` (home timeline inline style `pages/index.js:399` and `.variant-select` border globals.css:600; *0f2050* is not the brand navy), `rgba(5,20,64,0.98)` (nav-solid, globals.css:102), `#051836`/`#030b1d` (footer gradient, globals.css:243), `#f97316` (on-order badge, globals.css:305), `rgba(240,145,1,…)`/`rgba(252,165,79,…)` (on-order badge bg/border, mismatched hues), `#047857` vs `#0f7a2e` (two success greens), `#b91c1c` vs `#d72638` (two reds), `#c2410c` vs `#f97316` vs `#92400e` (three oranges).

**Tailwind color classes**, grouped (counts are class occurrences):

| Family | Classes (count) |
|---|---|
| Text gray | text-gray-900 (38), text-gray-600 (24), text-gray-500 (22), text-gray-700 (13), text-gray-800 (1), hover:text-gray-800 (1) |
| Text blue | text-blue-900 (12), text-blue-700 (4), text-blue-100 (3), text-blue-200 (1), hover:text-blue-200 (4), text-blue-600 (1), text-blue-800 (1), hover:text-blue-900 (1) |
| Backgrounds | bg-white (20), bg-blue-900 (5), bg-gray-50 (4), hover:bg-blue-800 (3), hover:bg-gray-100 (2), bg-blue-50/100/300/600 (1 each), hover:bg-blue-700 (1), hover:bg-white (1), bg-transparent (1) |
| Borders/rings | focus:ring-blue-200 (12), border-white (4), border-blue-900 (2), border-gray-200 (2), border-gray-100/blue-100/blue-200/blue-500 (1 each), ring-white (1), divide-gray-100 (1) |
| Gradients | from-blue-50 to-blue-100, from-white to-blue-50 (home only) |
| Other | text-white (14), text-black (2), placeholder-black (1), placeholder-gray-500 (1), text-red-500 (1), **text-orange-400 (1, not in the v2 build)** |

Tailwind color classes that the custom CSS overrides (it loads after Tailwind, so it wins at equal specificity): `bg-blue-100 text-blue-700` on `.tag` (`pages/products/index.js:56`), and `rounded-3xl shadow hover:shadow-xl hover:-translate-y-1` on `.product-card` (`pages/products/index.js:46`).

**Near-duplicates (CIE76 ΔE < 6, opaque colors)**, from `color-math.mjs`:

| A | B | ΔE | Comment |
|---|---|---|---|
| `#f8fafc` (sand) | gray-50 `#f9fafb` | 0.6 | invisible difference: `bg-gray-50` sections vs sand body |
| `#0b2050` | `#0f1f4e` | 1.0 | dead breadcrumb gradient |
| `#fff` | gray-50 | 1.9 | alternating white/gray-50 home sections barely differ |
| `#f8fafc` | `#f3f4f6` | 2.0 | |
| `#e2e8f0` | gray-200 `#e5e7eb` | 2.5 | slate vs coolGray |
| `#334155` | gray-700 `#374151` | 2.8 | slate vs coolGray |
| `#0f172a` | gray-900 `#111827` | 3.1 | **body text vs Tailwind headings** |
| `#e6f0ff` (sky) | blue-100 `#dbeafe` / blue-50 `#eff6ff` | 3.8 / 3.9 | brand tint vs Tailwind tints |
| `#475569` | gray-600 `#4b5563` | 3.9 | |
| `#64748b` | gray-500 `#6b7280` | 6.0 | muted text in two grays |

**Navy/blue family:** brand `#0b2050`, `#0f3d72`, rgba(5,20,64,.98), `#051836`, `#030b1d`, `#0b1f3a`, rgba(15,32,80), plus Tailwind blue-900 `#1e3a8a`, blue-800, blue-700, blue-600, blue-500, and link blues `#2563eb`, `#1d4ed8`, `#0f62fe`. That is **14 blues** for a palette that defines 2.

**WCAG contrast** (`$S/data/color-math.json`):

| Pair | Ratio | AA |
|---|---|---|
| Body `#0f172a` on sand `#f8fafc` | 17.06 | pass |
| White on `--deep-navy` (primary button) | 15.71 | pass |
| White on `--sea` (primary hover) | 10.88 | pass |
| White on blue-900 | 10.36 | pass |
| White on blue-600 (detail add to cart) | 5.17 | pass |
| `--sea` on `--sky` (pill/status badge) | 9.46 | pass |
| Navy on `--accent` (avatar, nav badge) | 6.77 | pass |
| Muted `#64748b` on white / on sand | 4.76 / 4.55 | pass (barely on sand) |
| gray-500 on gray-50 | 4.63 | pass (barely) |
| Link `#2563eb` on white | 5.17 | pass |
| Stock "in" `#0f7a2e` on its 12% tint | 4.61 | pass (barely) |
| **Stock "out" `#d72638` on its tint** | **4.13** | fail at 12 px (large text only) |
| **Stock "on order" `#f97316` on its tint** | **2.47** | **FAIL** |
| **`#94a3b8`** (review date, char count, divider, timeline todo) on white | **2.56** | **FAIL** |
| **`--accent #24b4ff` on white** (focus border/ring = only focus cue) | **2.32** | **FAIL** (non-text 3:1) |
| **Star fill `#f59e0b` on white** | **2.15** | **FAIL** (non-text 3:1) |
| Empty star `#cbd5e1` on white | 1.48 | FAIL (non-text) |
| Status "waiting" `#c2410c` on `#fff7ed` | 4.88 | pass |
| Hero `text-blue-100` on navy overlay | 12.9 | pass (depends on photo) |
| Footer white at 70% opacity on `#051836` | 9.0 | pass |

#### A2.2 Typography

**Font loading:** Inter comes from a Google Fonts `<link>` in `next/head` (`pages/_app.js:23-26`), not from `next/font`. It loads weights 400/500/600/700/800 with `display=swap`, from an external origin that is render-blocking. Only the latin subsets load (computed `document.fonts`: `U+0-FF…`). With `lang=ar` the same five Inter faces load and Arabic glyphs fall back to the system font (Geeza Pro/Segoe UI), so AR pages mix two typefaces. The stack is `'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif` (`styles/globals.css:16`). The body computes to 16 px / 24 px.

**Weights used:** Tailwind font-semibold (37), font-bold (14), font-extrabold (13), font-medium (5). CSS 600 (23), 700 (9), 800 (5), 400 (3), 500 (1). All five loaded weights are in use.

**Font sizes:** 11 Tailwind sizes plus **24 distinct CSS font-sizes**.

| Source | Sizes (count) |
|---|---|
| Tailwind | text-xs (17), text-sm (52), text-base (1), text-lg (15), text-xl (2), sm:text-xl (1), text-2xl (2), text-3xl (11), text-4xl (3), sm:text-4xl (9), sm:text-5xl (1), lg:text-6xl (1) |
| CSS rem | 0.65 (2), 0.7, 0.72 (2), 0.75 (8), 0.78 (2), 0.8 (3), 0.82 (4), **0.85 (13)**, 0.86, 0.88 (6), 0.9 (3), 0.92, 0.95 (4), 1 (2), 1.05 (2), 1.1, 1.25, 1.35, 1.6 (2), 1.75, 2, 3 |

Eleven different sizes sit between 0.65rem and 0.95rem (10.4–15.2 px), several of them 0.02–0.03rem apart (0.78/0.8/0.82, 0.85/0.86/0.88). That is not a type scale. Line-heights: CSS 1, 1.3rem, 1.35, 1.4, 1.5, 1.55; Tailwind leading-none, leading-tight, leading-relaxed.

**Page-title sizes don't agree:** marketing/catalog h1 `text-3xl sm:text-4xl font-extrabold` (36 px), detail h1 `text-3xl font-bold` (30 px), account h1 `1.75rem/800` (`account.css:376`), auth h1 `1.6rem/800` (`account.css:239`), hero h1 60 px.

**Heading hierarchy per route** (from the running site, `computed-a2.json → headings`; the footer h3 "SOFRACOM" plus h4 "Quick Links"/"Monastir" appear on every page and are omitted below):

| Route | Outline | Issues |
|---|---|---|
| `/` | h1 hero → h2 Monastir band → h2 About → h2 Brands → h2 Services → 6×h3 service cards → 4×h4 timeline steps → h2 Haul-out band → h2 Testimonials → h2 FAQ → h2 Contact | h4 timeline is under h3 cards, not a sibling; the FAQ questions are `<p>` |
| `/products` | h1 → 6×h2 categories → h3 "Your order" (hidden drawer) | drawer heading in the outline |
| `/products/[cat]` | **29×h3 products only** → h3 "Your order" | **no h1, no h2**; breadcrumb is the only title |
| `/products/[cat]/[id]` | h1 product → h2 Customer reviews → h3 Your order | OK. "Product detail" eyebrow is a `<p>` |
| `/search?q=paint` | h1 → 44×h2 product titles | card titles are h2 here and h3 on the category page |
| `/gallery` | h1 (subtitle text) → h2 per entry | the page "title" ("Gallery") is the eyebrow `<p>`, the h1 is the subtitle |
| `/account/login`, `/signup`, `/reset` | h1 | OK |
| `/account`, `/orders`, `/addresses`, `/quotes` | h1 | OK |
| `/account/reviews` | h1 → h2 ×2 | OK |
| `/account/orders/GLoEAVvN` | h1 "My orders" only at capture time | uncertain: data may still have been loading; code has h1 = page title and h2 Items/Delivery/Status (`orders/[id].js:74,120,130`) |
| Modals | CheckoutModal `h3` (`CheckoutModal.js:196`), ReviewForm `h2` (`ReviewForm.js:69`) | inconsistent |

#### A2.3 Spacing & layout

**Containers:**

| Container | Width | Where |
|---|---|---|
| `max-w-7xl` | 1280 px | header/footer (`Layout.js:283,493,539`), home sections, `/products`, category, search |
| `max-w-6xl` | 1152 px | product detail (`[productId].js:79`), gallery (`gallery/index.js:125`) |
| `.account-shell` | 72rem = 1152 px | `account.css:295` |
| `max-w-4xl` | 896 px | home timeline, FAQ (`index.js:392,460`) |
| `max-w-2xl` | 672 px | intro paragraphs, search form |
| modal/drawer | 420 / 440 / 480 / 520 px | drawer, auth card, checkout, review modal: four different dialog widths |

**Gutters:** header uses `px-4` (16 px) while the footer and every page use `px-6` (24 px). The logo and the page content therefore don't line up on the left edge. Account uses `padding: 2.5rem 1.5rem 4rem`.

**Section rhythm:** home sections `py-20` (×6), parallax `py-24` (×2), catalog pages `py-12` (×5), footer `py-10` plus `mt-16`. The `<main>` wrapper in `Layout.js:490` holds pages that render their own `<main>` (category, products, detail, search, gallery, AccountLayout, AuthCard), so there are **nested `<main>` elements** on every non-home route (computed `nestedMain: 1`).

**Grids:** product grids `sm:grid-cols-2 lg:grid-cols-3 gap-6` (consistent across products, category and search). Home: brands `grid-cols-2 sm:3 lg:4`, services/testimonials `md:grid-cols-3`, about/contact `md:grid-cols-2 gap-10`. Gallery `sm:grid-cols-2`. Detail: intended `lg:grid-cols-[1.1fr,0.9fr]`, **broken** (single column, see finding 2). Account detail `lg:grid-cols-3` with `lg:col-span-2`.

**Breakpoints:**

| Source | Values | Usage |
|---|---|---|
| Tailwind | sm 640 (26 uses), md 768 (12), lg 1024 (10), xl 1280 (0) | layout |
| globals.css | `max-width:768px` (parallax off), `max-width:640px` ×2 (cart-fab full width, dead `.detail-layout`) | mobile overrides (desktop-first) |
| account.css | `min-width:640px` (form row), **`min-width:720px`** (rating summary), **`min-width:900px`** ×2 (account sidebar) | 720 and 900 are off the Tailwind scale |

Mixed desktop-first (`max-width`) and mobile-first (`min-width`) queries. The `max-width:640px` and Tailwind `sm:` (min 640) overlap at exactly 640 px.

**Spacing values:** Tailwind gap-1/2/3/4/5/6/8/10. CSS gaps 0.05, 0.25, 0.35 (×8), 0.4, 0.5, 0.6, 0.75 (×10), 0.85, 0.9, 1, 1.25, 1.5 rem. Paddings follow the same pattern (`0.35rem 0.9rem`, `0.4rem 0.9rem`, `0.35rem 1rem`, `0.35rem 0.85rem` for pill controls). There is no spacing scale in the custom CSS.

#### A2.4 Shape & depth

**Border radii:** 8 Tailwind radius classes plus 12 distinct CSS radii.

| Value | Count | Used for |
|---|---|---|
| `999px` / `rounded-full` | 19 + 13 | pills, buttons (`.ui-btn`), badges, FAB, header account |
| `0.75rem` / `rounded-xl` | 5 + 10 | `.cart-submit`, search dropdown, card-img, hero/contact CTAs |
| `rounded-lg` (0.5rem) / `0.5rem` | 11 + 2 | inputs (Tailwind), dropdown, cart thumbs |
| `0.65rem` | 3 | `.ui-field`/`.cart-form` inputs, variant-select |
| `0.9rem` | 4 | alerts, address option, dead thumbs |
| `1.1rem` | 3 | record/address/review cards |
| `1.2rem` | 1 | `.product-card` |
| `1.25rem` | 2 | `.ui-card`, `.checkout-modal` |
| `rounded-2xl` (1rem) | 9 | home cards, detail thumbs, detail add-to-cart |
| `rounded-3xl` / `1.5rem` | 3 + 1 | gallery card, detail panel; dead `.detail-gallery` |
| `rounded-md` | 4 | header logo, search/lang inputs, dropdown thumbs |
| `10px`, `0.6rem`, `0.4rem` | 1 each | one-offs |

Buttons alone use 4 radii: pill (`.ui-btn`), 0.75rem (`.cart-submit`, `rounded-xl` CTAs), 1rem (`rounded-2xl` detail CTA), 0.5rem (`rounded-lg` category reset).

**Shadows:** 6 Tailwind shadow classes (`shadow` ×7, `shadow-sm` ×4, `shadow-xl` ×3, `shadow-lg` ×2, `hover:shadow-xl` ×2, `hover:shadow-lg`) plus **14 distinct CSS box-shadows**, each used once except the focus ring (×2). Three different shadow tints are in use: `rgba(15,23,42,…)` slate, `rgba(11,32,80,…)` navy, `rgba(15,61,114,…)` sea, plus `rgba(0,0,0,.15)` on `.tilt:hover`. Elevation for "card at rest" alone has four values: `0 10px 30px .06` (ui-card), `0 6px 18px .05` (record-card), Tailwind `shadow`, Tailwind `shadow-xl` (gallery).

**Borders:** the hairline `1px solid rgba(15,61,114,0.08)` is the de-facto card border (7 uses). Input borders split between `rgba(11,32,80,0.18)` (custom) and Tailwind `border` = gray-200 `#e5e7eb` (home form, category filters, search). Active thumbnail `border-blue-500` (Tailwind) vs dead `.detail-thumbs img.active { border-color: var(--accent) }`.

**Gradients (5 CSS, 2 Tailwind):** hero overlay radial + linear (`globals.css:107-108`), parallax shade (`:198`), footer `145deg #051836→#030b1d` (`:243`), dead breadcrumb (`:784`), home cards `from-blue-50 to-blue-100` and `from-white to-blue-50` (`index.js:262,360`). Plus the SVG wave dividers: inline SVG in the hero (`index.js:202`) and a data-URI `::before` on `.wave-top` (`globals.css:168-177`). The `.wave-top` waves (white into the gray-50 Brands/Contact sections after white sections) work as intended. The hero's bottom wave is `text-white`, but the next section is the dark parallax photo band (`index.js:214`), so there is a white wave sitting directly on a navy photo. It doesn't continue into anything.

#### A2.5 Icons & images

**Icon sources:** there is no icon font or icon library. The site mixes inline SVG paths and Unicode/emoji glyphs:

| Icon | Implementation | File:line |
|---|---|---|
| Service card icons | inline SVG, Heroicons-outline style paths in `SERVICE_CARDS` | `pages/index.js:17-48,366-378` |
| Google logo | inline multicolor SVG | `components/account/AuthCard.js:40-45` |
| Cart | emoji 🛒 (renders as a platform emoji, colored) | `components/cart/CartWidget.js:73` |
| Mobile menu | ☰ text | `components/Layout.js:417` |
| Back to top | ↑ text | `components/Layout.js:563` |
| Dropdown caret | ▾ text | `components/Layout.js:316` |
| Close | × text (3 places, 3 classes) | `CartWidget.js:102,117`, `CheckoutModal.js:203`, `ReviewForm.js:74` |
| Verified | ✓ text | `ProductReviews.js:181` |
| Stars | ★ text | `Stars.js:17,19,68` |
| Qty / FAQ | − + text | `CartWidget.js:138,156`, `index.js:477` |
| Select chevron | data-URI SVG | `globals.css:608` |

**The service icons don't match their labels.** The path data are generic Heroicons: "Antifouling & Painting" shows a **mail envelope** (`M3 8l7.89 5.26…`), "Gelcoat & Fiberglass" an **info circle**, "Electrical & Mechanical" a **check mark**, "Polishing & Protection" a **plus**, "Haul-out Coordination" a **play triangle**, "Deck & Hardware" stacked layers (`index.js:21-46`). The `.datasheet-link svg` CSS (`globals.css:665`) styles an icon that is never rendered.

**Images in `public/`:**

| File | KB | px | Usage |
|---|---|---|---|
| `hero.jpeg` | 126 | 1280×576 | hero `<img>` full-screen cover (`index.js:171`): upscaled on ≥1440 and retina, also referenced by dead `.hero-bg` |
| `monastir1.jpeg` / `monastir2.jpeg` | 102 / 126 | 1280×576 | parallax backgrounds (min-height 60vh): upscaled |
| `logo.jpeg` | 117 | **1536×1536** | header logo shown at **40×40** (`Layout.js:286`); fallback thumb in account orders |
| `modern_logo.svg` | 1 | 512×512 | **unused on the website** (only listed by the product-admin static server) |
| `assets/*.png` brand logos | 16–202 (sika 202 KB) | 225–860 px | shown at h-20 (80 px) with grayscale filter |
| `assets/categories/*` | 8 files, 7.2 MB, max 3.5 MB | mostly 1024×1024 ChatGPT-generated PNGs | category cards (220 px) and the header dropdown at **32×32** on every page (6 images ≈ several MB on every route) |
| `assets/products/*` | 289 files, **391 MB**, median 1.43 MB, max 5.0 MB | phone photos up to 4080×3060 (`20251104_…jpg`), some saved as PNG | product cards, detail, cart, search, header suggestions |
| `assets/gallery/*` | 2 files, 232 KB | – | gallery (`loading="lazy"`) |

There is no favicon (no `public/favicon.ico`, no `<link rel=icon>`).

- `next/image` is **never used**. Every image is a raw `<img>`, 15 sites in pages/components.
- Only the gallery uses `loading="lazy"`. Playwright counted 0 lazy images on every other route.
- On every route, every `<img>` has a natural width more than twice its displayed width (`computed-a2.json → perPageImg.oversize`).
- `alt` text on product images is the product title. The dropdown alt reads "`… category`". Account order thumbs use `alt=""` (fine as decoration).

**object-fit / crops:**

- `contain`: `.card-img` (220 px, `#f3f4f6` letterbox), detail main `h-96`, brand logos.
- `cover`: hero, gallery (4:3 via `padding-top:75%`), cart item 64², order-line 3.5rem, record thumbs 2.5rem, detail thumbs `w-20 h-20`, suggestions 48², dropdown 32².

Product cards therefore letterbox portrait and landscape phone photos differently, while thumbnails crop them.

#### A2.6 Tailwind setup & custom CSS

- **Version/loading:** Tailwind **2.2.19, full prebuilt CSS from jsDelivr** (`pages/_app.js:28-31`), injected via `next/head` after the Google Fonts link and **before** the app CSS. Computed stylesheet order: Fonts → Tailwind CDN → `_next/static/chunks/styles_*.css`, so the custom CSS wins ties. The size is **2,934,019 bytes raw / 255,702 bytes brotli** (301 KB gzip). There is no purge, no config, no JIT. The theme can't be extended, so brand colors exist only as CSS variables, and Tailwind utilities use the stock blue/coolGray palette.
- **Classes used:** 411 distinct class tokens in JSX: 249 Tailwind, 149 custom, 13 unresolved. The unresolved tokens that are actually broken: `lg:grid-cols-[1.1fr,0.9fr]`, `bg-white/15`, `bg-white/80`, `border-white/30` ×2, `bg-[rgba(11,32,80,0.92)]`, `tracking-[0.3em]`, `bg-opacity-15` ×2, `text-orange-400`, `faq-a` (no CSS). The others are false positives from dynamic `--${variant}` names. Also a no-op: `-translate-y-1`/`translate-y-0` without `transform` (`Layout.js:324-325`); computed `transform: none`.
- **Custom stylesheets:** `styles/globals.css` 16,561 B (3.9 KB gz), 871 lines: tokens, header/nav, hero, motion utilities, parallax, footer, catalog cards, stock badges, cart FAB/drawer/form, checkout modal, dead detail-page styles. `styles/account.css` 16,946 B (3.6 KB gz), 917 lines: the `ui-*` building blocks (card, btn, field, alert, pill, divider), auth, account shell/nav, record/address cards, status badges, timeline, order lines, stars/reviews, modal, dead admin styles. Both are imported globally in `_app.js:6-7`, so every page ships both.
- **Two parallel systems:** the account/review pages use a coherent BEM-ish `ui-*` system with logical properties. The marketing and catalog pages use Tailwind utilities plus ad-hoc globals classes. The checkout modal mixes both (`.cart-form` labels plus `.ui-alert`, `.ui-btn`, `.ui-card`, `.address-option`).
- **Dead CSS** (selectors with no reference anywhere in pages/components/contexts/hooks/lib; 22 rules ≈ 2.96 KB):

| Selector | File:line |
|---|---|
| `.hero-bg` | globals.css:34 |
| `.product-variants`, `.variant-option`, `.variant-option.active`, `.variant-option span` | globals.css:619-649 |
| `.detail-panel` | globals.css:779 |
| `.detail-breadcrumb`, `.detail-crumb(:hover)` | globals.css:783-809 |
| `.detail-main-img` | globals.css:811 |
| `.detail-thumbs img(.active)` | globals.css:816-828 |
| `.detail-layout .detail-gallery`, `@media .detail-layout` | globals.css:851-862 |
| `.datasheet-link svg` (no svg rendered) | globals.css:665 |
| `.admin-tabs*`, `.admin-table-wrap`, `.admin-table*` (web admin removed in commit 00c33e4) | account.css:861-917 |

  `.timeline__step--*` and `.stars--*` are used dynamically and are not dead. The `account.css` header comment still says "and the staff admin page" (`account.css:1`).

---

### A3. Components

There are 16 real React UI components: `Layout`, `CartWidget`, `CheckoutModal`, `ProductReviews` (+ local `RatingSummary`), `ReviewForm`, `Stars`, `CardRating`, `StarInput`, `AccountLayout`, `AddressFields`, `AuthCard`, `GoogleButton`, `StatusBadge`, `StatusTimeline`, plus page-local `ProductCard` and `GalleryCard`. Everything else (buttons, inputs, badges, breadcrumbs, tabs, cards) is markup with class strings.

| Component | File | Variants / props | Used in | Duplicates / problems |
|---|---|---|---|---|
| Layout (header, mobile menu, footer, back-to-top) | `components/Layout.js` | nav-glass / nav-solid; mobile menu | every page via `_app.js` | Search form rendered twice with different classes (`:370`, `:432`). Footer "Back to top" (`:544`) duplicates `#toTop` (`:555`). Footer links use bare `#home` (`:505-527`), so they break off the home page. Hard-coded English ("Search products…", "Back to top", "All rights reserved", footer blurb `:497`). |
| Buttons | no component; `.ui-btn` system `account.css:14-72` | primary / secondary / danger / small / block / google | account, reviews, checkout | **41 distinct button/CTA class combinations** (`$S/data/buttons.txt`). Primary-action looks: `.ui-btn--primary` (navy pill), `.cart-submit` (navy, r .75rem; plus `px-4 py-2 text-sm` override in `[categorySlug]/index.js:138`), Tailwind blue-900 rounded-xl ×3 (`index.js:520,600`, `search.js:120`), Tailwind blue-600 rounded-2xl (`[productId].js:219`, **no disabled style**: an out-of-stock "Add to cart" looks enabled), hero white (`index.js:187`). Secondary looks: `.ui-btn--secondary`, hero outline (`index.js:193`), category reset `rounded-lg border` (`[categorySlug]/index.js:269`), gallery filter pill (`gallery/index.js:140`). |
| Link-buttons | `.ui-link` `account.css:74` | – | account | `.product-detail-btn` (`globals.css:581`), `.product-readmore` (`:548`), `text-blue-600 hover:underline` (`[productId].js:200`), `text-blue-700` (`index.js:505,512`): 4 link colors. |
| Text inputs | `.ui-field` `account.css:102-136` | – | account, AddressFields, ReviewForm | `.cart-form input` (`globals.css:488-503`) is a **verbatim copy** of `.ui-field input`. Tailwind variants on home quote form (`index.js:544-596`, `rounded-lg border` gray-200, labels `text-gray-600`), category filter (`[categorySlug]/index.js:257`), search (`search.js:115`, rounded-xl py-3), header search. **6 input looks.** |
| Selects | – | `.variant-select` (custom chevron), `.ui-field select`, `.review-toolbar select` (pill), Tailwind filters, header lang | catalog, account, reviews | 5 treatments. The chevron is `background-position: right` (not RTL-aware). |
| Language switcher | `Layout.js:400-409` | native select EN/FR/AR | header | No label/aria-label. Opaque white (finding 3). Labels are codes, not language names. |
| Product card | `pages/products/[categorySlug]/index.js:17-148` (local `ProductCard`) | in / out / on-order; variants select; read-more | category page | **Re-implemented inline in `pages/search.js:142-203`** (h2 vs h3, no variants, no add-to-cart, full description, `.price` vs `.product-price`). Category card on `/products` (`products/index.js:43`) reuses `.product-card` with conflicting Tailwind. Title row `flex justify-between` puts brand beside long titles and wraps badly. |
| Card surfaces | `.ui-card` `account.css:6` | – | account/reviews/checkout | 8 radius/shadow combos (§A2.4): `.record-card`, `.address-card`, `.review-item`, `.product-card`, `.checkout-modal`, home Tailwind cards, gallery, detail panel. |
| Badges / pills | `.status-badge` (`account.css:502`) + `StatusBadge` (`components/account/Status.js:38`); `.stock-badge` (`globals.css:281`); `.ui-pill`; `.verified-badge`; `.tag`; `.account-nav__badge`; `.header-account__avatar` | status done/stopped/waiting; stock in/out/order | account, catalog, reviews | Stock and status badges encode the same semantics with different oranges (`#f97316` vs `#c2410c`), paddings and weights (600 vs 700). Gallery chips are Tailwind `bg-blue-50 text-blue-800` vs `.tag`. Gallery type badge and cart count chip are invisible (v3 syntax). |
| Alerts / notices | `.ui-alert` `account.css:153-182` (error/success/info/warning) | – | account, reviews, checkout | Also `.quote-status` (`globals.css:40`, home form), `.cart-alert` (`globals.css:670`, colored text only), `.cart-onorder-popup` (`globals.css:684`, = warning colors). **4 alert systems.** No toast component. Messages auto-dismiss after 6 s (`index.js:161`) and 7 s (`CartWidget.js:30`). |
| Modals | `CheckoutModal.js:193`, `ReviewForm.js:64` | – | CartWidget, ProductReviews | **Two overlay implementations**: `.checkout-modal-overlay` (z 110, slate 65%, no blur, **no max-height or scroll**, so tall member checkout can overflow on 390 × 844) vs `.modal-overlay` + `.modal-card` (z 90, navy 45% + blur, max-height 90vh). Only ReviewForm handles Escape. Neither traps or returns focus. Close buttons reuse `.checkout-modal-close`. |
| Drawer | `CartWidget.js:85` `.cart-drawer` | open / closed / empty / on-order notice | products index, category, detail only | Not on home/search/gallery/account, so the cart is unreachable there. `aria-hidden` toggled, but it isn't a dialog and has no focus management. Physical `right:0` in RTL. |
| FAB | `CartWidget.js:71` `.cart-fab` | – | catalog pages | Emoji icon. Covers `#toTop` (finding 10). Full-width bar ≤640 px covers content bottom. |
| Qty stepper | `CartWidget.js:132-165` `.cart-qty` | – | drawer | Remove button lives inside the stepper pill (`ml-3`, not logical). |
| Stars | `components/reviews/Stars.js` (`Stars`, `CardRating`, `StarInput`) | sm/md/lg; radiogroup | category, search, detail, reviews | Well-built, single source. Colors fail non-text contrast. |
| Rating summary | `ProductReviews.js:12-43` | – | ProductReviews | – |
| Status timeline | `components/account/Status.js:49` | done/current/stopped/todo | order + quote detail | **Home process timeline `index.js:393-413` is a separate ad-hoc build** (inline `rgba(15,32,80,x)` dots, `border-l`, `-left-3`; not RTL-mirrored). |
| Breadcrumb | none | – | category (`<nav id="breadcrumb">`, `[categorySlug]/index.js:230`), detail (`<div>`, `[productId].js:84`) | Two markups, neither uses `aria-label`/`aria-current`. Dead `.detail-breadcrumb` is a third design. "Catalog" is hard-coded English. |
| Tabs / filters | none | gallery filter pills (`gallery/index.js:140`), account nav (`account.css:309`) | gallery, account | Both navy-active pill navs built separately. No `aria-pressed`/`aria-current` on gallery pills. Account nav sets class `active` but no `aria-current`. |
| Account shell | `components/account/AccountLayout.js` | loading / ready; props title, eyebrow, actions, badges | 8 account pages | Good. |
| AuthCard / GoogleButton | `components/account/AuthCard.js` | – | login, signup, reset | Good. |
| AddressFields | `components/account/AddressForm.js` | `showLabel` | addresses, checkout (member) | Guest checkout uses a different flat form (`CheckoutModal.js:108-131`, single address textarea). |
| Search suggestions | `Layout.js:243-273` | – | header | `text-left`, `margin-right` (not RTL). Suggestions match on image filename and price text (`Layout.js:76-78`). |
| Products dropdown | `Layout.js:320-349` | – | header desktop | Hover-only (`onMouseEnter`), no keyboard open. Translate is a no-op. |
| FAQ accordion | `index.js:467-488` | – | home | `<div onClick>`: not focusable, no `aria-expanded`. |
| Gallery card | `pages/gallery/index.js:39` | image / video / fallback | gallery | Date formatted with fixed `en-US` (`:17`) while account uses locale-aware `useFormatDate`. |
| Price formatting (logic) | `lib/constants.js formatPrice` | – | catalog, cart | **3 implementations**: also `search.js:22-32` and `Layout.js:53-57`. |

**One-off markup that should be components:**

- primary/secondary `Button` (covers all 41 combos)
- `ProductCard` shared by category + search (+ suggestion variant)
- `Badge` (stock + status + tag)
- `Alert`
- `Modal`/`Dialog` shell (overlay, Escape, focus trap, scroll)
- `Breadcrumb`
- `SectionHeading` (h2 `text-3xl sm:text-4xl font-extrabold text-center text-gray-900` repeated 5× in `index.js:230,307,343,434,461,495` plus 3 page intros with the eyebrow + h1 + lead pattern in `products/index.js:32-40`, `search.js:93-103`, `gallery/index.js:126-136`)
- `IconButton` (close ×)
- `Select`
- `Timeline` (reuse StatusTimeline styling for the home process)

---

### A4. Motion & interaction

**`prefers-reduced-motion`: not handled anywhere** (0 matches in pages/components/contexts/styles/hooks). No motion library; everything is CSS transitions/keyframes plus three JS hooks in `Layout.js`. Live counts on home at load: `document.getAnimations()` = 2 running (the float circles), 17 `[data-tilt]`, 34 `[data-animate]`.

| Effect | File:line | Implementation | Duration / easing | Reduced motion | Cost / issues |
|---|---|---|---|---|---|
| Scroll reveal | `globals.css:129-138`; `Layout.js:116-131` | `[data-animate]` opacity 0 + translateY(20px) → `.in-view` via IntersectionObserver (threshold 0.15, unobserve) | 0.6 s ease, `transition: all` | no | Low CPU. **SSR content invisible until hydration** (hero h1 included). On tilt cards the `.tilt` transition (same specificity, later in file) replaces it, so opacity snaps (computed brand-card `transition-property: transform, box-shadow`). Observer is re-run only on `router.asPath`, so later-mounted elements never reveal. |
| 3D tilt | `Layout.js:133-158`; `globals.css:140-152` | mousemove on every `[data-tilt]` → `getBoundingClientRect()` + inline `rotateX/rotateY` ≤6° | 0.2 s ease | no | Un-throttled handler with a layout read per event. **No `perspective`**, so the effect is a 2D squash and `preserve-3d`/`translateZ(18px)` are no-ops. Inline transform overrides `hover:scale-105` (brand cards) and the `.product-card:hover` lift. `will-change: transform` on every `.tilt` card keeps layers alive permanently. Applied to all product/category cards (29–88 per category page). |
| Floating circles | `index.js:177-178`; `globals.css:111-127` | `@keyframes float` translateY −12 px, infinite, on blurred divs | 8 s / 12 s ease-in-out, infinite | no | Cheap (transform), but runs forever and is nearly invisible at 10% opacity. |
| Parallax bands | `globals.css:187-199,235-239`; `index.js:214,418` | `background-attachment: fixed` (off ≤768 px) | scroll-linked | no | **Expensive**: full repaint each scroll frame on desktop. Images are 1280×576 stretched to viewport width. |
| Header glass → solid | `Layout.js:100-114,277-281`; `globals.css:59-63,101-104` | scroll listener, rAF-throttled (good), not `{passive:true}` (harmless for scroll), toggles class at 40 px; Tailwind `transition-colors duration-300` | 0.3 s, cubic-bezier(.4,0,.2,1) | no | `backdrop-filter: blur(12px)` on a sticky bar over photos costs paint each frame. State updates on every rAF tick (React may bail out when equal). |
| Back-to-top | `globals.css:252-261`; `Layout.js:239-241,555-564` | opacity via `.show` at 500 px; `scrollTo({behavior:'smooth'})` | 0.3 s ease | no (smooth scroll forced) | Hidden under the cart FAB on catalog pages. |
| Products dropdown | `Layout.js:322-326` | Tailwind `transition duration-200` opacity; translate no-op | 0.2 s | no | Hover-only interaction. |
| Header search widen | `Layout.js:374-376` | `transition-all`, `md:w-44 → md:w-64`; the nav is hidden at the same time (`md:hidden`, `:296`) | 0.2 s | no | Animates width (layout); the nav links vanish instantly while the input grows: a jarring jump. |
| Hover lifts | `globals.css:335-338,521-524,536-539`; `account.css:40-43,415-418`; `index.js:189,322`; `products/index.js:46` | transform translateY(−1…−4 px) / scale(1.05), some with box-shadow | 0.2–0.3 s ease | no | Box-shadow transitions repaint (product-card, cart-fab, record-card, `.tilt:hover`). Lifts overridden by tilt (above). |
| Brand logo color-in | `globals.css:154-162` | img `filter: grayscale` → 0 + scale 1.06 | 0.3 s ease | no | Filter transition repaints. 8 cards. Logos are grayscale by default, which hides brand colors on touch devices (no hover). |
| Cart drawer + overlay | `globals.css:340-377` | translateX(100%) → 0; overlay opacity; overlay `backdrop-filter: blur(2px)` | 0.28 s / 0.25 s ease | no | Compositor-friendly. **Slides from the right in RTL too.** |
| Modals | `CheckoutModal.js:193`, `ReviewForm.js:64` | conditional render | none | n/a | No enter/exit. Fine, but inconsistent with the animated drawer. |
| FAQ | `index.js:479-483` | `hidden`/`block` toggle with a useless `transition` class | instant | n/a | – |
| Star input | `account.css:708-717` | scale 1.12 + color | 0.15 s ease | no | – |
| Focus ring | `globals.css:495-503`; `account.css:122-131` | border-color + box-shadow | 0.2 s ease | no | Ring color `#24b4ff` at 20% alpha fails 3:1; Tailwind inputs use `focus:ring-blue-200` (also low contrast); several elements have no visible focus style (FAQ div, gallery pills, header links rely on UA outline). |
| Button color changes | `account.css:25,273`; `globals.css:513,842`; Tailwind `transition` ×11 | background/color/border | 0.2 s ease / 0.15 s | no | – |

**Performance summary:**

- Heavy items, in order: (1) multi-MB images with no lazy loading; (2) `background-attachment: fixed` parallax; (3) 256 KB-brotli render-blocking Tailwind CDN plus the Google Fonts CSS; (4) the backdrop-filter sticky header; (5) un-throttled mousemove tilt with layout reads on dozens of cards; (6) `will-change: transform` on every tilt card; (7) two infinite animations.
- No scroll-linked JS other than the rAF-throttled header handler, which is fine.
- No `top`/`left` animations. Width is animated once (header search).
- The data-animate pattern hides SSR content until JS runs.

---

## A5. Quality checks

**Method.** I ran a production build (`next build`, Next 16.0.7 with Turbopack, dist dir `.next-audit-prod`, wired to the emulators) and served it with `next start -p 3200`. Lighthouse 12 (headless Chrome for Testing 1243) ran in mobile mode (simulated Moto G and slow 4G) and in desktop mode (`--preset=desktop`). axe-core ran through `@axe-core/playwright` with the tags wcag2a/aa, 21a/aa, 22aa and best-practice. I wrote Playwright scripts for the keyboard, mobile and SEO checks (`$S/scripts/a5-*.mjs`).

**Caveat.** Everything was served from localhost, so the server responses (TTFB) are unrealistically fast and no CDN or edge cache is involved. The mobile numbers come from Lighthouse's simulated throttling, not real devices. The Vercel Analytics and Speed Insights scripts return 404 locally, which is expected outside Vercel. `favicon.ico` also returns 404, and that one is a real problem.

Raw outputs:
- Lighthouse: `docs/ui-audit/lighthouse/{home,category,product,checkout-host}-{mobile,desktop}.report.{json,html}`. The category run uses `/products/hardware-tools` (the largest category, 88 products). The product run uses `/products/antifouling-coatings/p_bamzqzdm`. The checkout-host run uses `/products`, which is the page where the cart button and checkout modal live.
- axe: `docs/ui-audit/axe/*.json`, one file per page and state, plus `_summary.json`.
- Build log: `$S/logs/a5-build.txt`. Bundle table: `$S/logs/a5-bundles.txt`. Keyboard log: `$S/logs/a5-kbd.txt`. Mobile log: `$S/logs/a5-mobile.txt`.
- Screenshots: `site-home-menu-open-390-en.png`, `site-product-cartdrawer-open-390-en.png`, `site-product-checkout-guest-390-en.png`, `site-product-checkout-guest-375x667-en.png`, `site-product-checkout-signedin-newaddr-375x667-en.png`, `site-product-bottom-fab-390-en.png`, `site-account-header-signedin-390-{en,fr,ar}.png`.

---

### 1. Lighthouse scores

| Page | Mode | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index | Page weight |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Home `/` | mobile | **68** | 95 | 96 | 91 | 3.3 s | **10.2 s** | 20 ms | 0.003 | 3.3 s | 5.8 MB |
| Home `/` | desktop | 97 | 95 | 96 | 91 | 0.8 s | 1.2 s | 0 ms | 0.001 | 0.8 s | 5.9 MB |
| Category `/products/hardware-tools` | mobile | **60** | 88 | 96 | 91 | 5.5 s | **275.6 s** | 20 ms | 0.003 | 6.1 s | **96.3 MB** |
| Category `/products/hardware-tools` | desktop | 73 | 88 | 96 | 91 | 1.0 s | **42.9 s** | 0 ms | 0.004 | 1.0 s | **96.5 MB** |
| Product `/products/antifouling-coatings/p_bamzqzdm` | mobile | **60** | 87 | 96 | 91 | 5.4 s | **16.1 s** | 40 ms | 0.003 | 6.2 s | 8.2 MB |
| Product `/products/antifouling-coatings/p_bamzqzdm` | desktop | 74 | 88 | 96 | 91 | 1.0 s | 6.0 s | 0 ms | 0.001 | 1.0 s | 8.2 MB |
| Checkout host `/products` | mobile | **61** | 91 | 96 | 91 | 5.6 s | **13.6 s** | 30 ms | 0.003 | 5.6 s | 5.0 MB |
| Checkout host `/products` | desktop | 93 | 91 | 96 | 91 | 0.9 s | 1.7 s | 0 ms | 0.006 | 0.9 s | 5.0 MB |

**What the numbers show:**
- **JavaScript is not the bottleneck.** TBT stays at 40 ms or less everywhere. **The problems are image weight and render-blocking CSS.**
- **CLS is negligible** on every page (0.006 or less). The only sources are the header row (`div.flex.items-center.gap-3`) and the "Web font loaded" swap of Inter.
- **SEO is 91 on every page because there is no meta description.** Lighthouse checks very little, though. §6 lists the gaps it does not check.
- **Best practices is 96 everywhere** because of console errors. Locally these are the Vercel script 404s plus `favicon.ico` 404, so only the favicon applies to production.
- **The accessibility failures Lighthouse reports** are `select-name` on every page, plus `aria-hidden-focus` and `color-contrast` on the pages that have the cart. §3 covers them.

#### LCP element and phases (mobile)

| Page | LCP element | TTFB | Load delay | Load duration | **Render delay** |
|---|---|---|---|---|---|
| Home | `<img src="/hero.jpeg" alt="Monastir Marina">` (`pages/index.js:171`) | 7 ms | 4 ms | 8 ms | 794 ms |
| Category | first product card `<img class="card-img">` (a 4080×3060 PNG) | 9 | 7 | 20 | **2 758 ms** |
| Product | main image `<img class="w-full h-96 object-contain">` (`[productId].js:100`), a 1.3 MB PNG | 6 | 4 | 9 | **2 891 ms** |
| Checkout host | first category card `<img class="card-img">` | 5 | 5 | 6 | **2 324 ms** |

- **Render delay makes up almost all of LCP.** On simulated mobile Lighthouse estimates the render-blocking stylesheets cost about 2.0–2.7 s per page:
  - the **Tailwind 2.2.19 CDN stylesheet**: 251 KB transferred, about 3.1 s by itself
  - the Google Fonts CSS: about 0.9 s
- The very large simulated LCP values (275 s for the category page, 16 s for the product page) come from the image bytes. Lighthouse models image downloads over throttled 4G, and the category page downloads 95 MB of images.

#### Render-blocking resources and fonts

| Resource | How it loads | Transferred | Est. blocking (mobile / desktop) |
|---|---|---|---|
| `https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css` | `<link rel=stylesheet>` in `pages/_app.js` `<Head>` | **251 KB** (Lighthouse: 249 KB of it unused) | 2.7–3.2 s / 0.6–0.8 s |
| Google Fonts CSS, Inter 400/500/600/700/800 `&display=swap` | `<link rel=stylesheet>` plus preconnect, `_app.js` | 1 KB, then one 47 KB woff2 | ~0.9 s / ~0.36 s |
| `/_next/static/chunks/be6e496a3fd6aadc.css` (globals plus account) | Next CSS | 6 KB gz (23.6 KB raw) | 0.15–0.3 s / 0 |

- **No `next/font` is used.** Inter comes from the Google Fonts CSS, a third-party, render-blocking request. Five weights are requested, but only one latin woff2 file was actually fetched.
- The Tailwind "script" in the brief is actually a **stylesheet**, not the JIT script. It is the full v2 build, about 2.9 MB raw. Lighthouse estimates 249 KB of the 251 KB transferred is unused on every page.

#### Image weight

- **No page uses `next/image`.** `grep -r next/image pages components` finds nothing, and all 15 `<img>` tags in JSX are raw `<img>`.
- **Only one `loading="lazy"`** exists in the codebase (`pages/gallery/index.js:49`). Lighthouse found **0 lazy images and 0 images with width/height attributes** on every page audited (see the SEO script output).

| Asset | Size on disk / transferred | Pixels | Displayed at | Where |
|---|---|---|---|---|
| `public/assets/products/*` (catalog photos) | **391 MB** in total. 180 files are larger than 1 MB. The biggest are 3.0–3.8 MB each (`20251115_183413-mi1n2j4w.png` is 3.8 MB) | 4080×3060 (phone photos saved as PNG) | ~300 px card / 384 px tall detail | Every catalog page. The `hardware-tools` category loads **96 images and 95 MB** |
| `public/assets/categories/chatgpt-image-*.png` | 1.5 MB, 1.2 MB and 4 × 210–290 KB | 1024×1024 | 32×32 in the header dropdown, ~300 px on cards | **Loaded on every page**: the desktop "Products ▾" dropdown (`Layout.js:325`) renders all category images hidden with `opacity-0` |
| `/logo.jpeg` | 117 KB | 1536×1536 | 40×40 (`Layout.js` header) | Every page |
| `/hero.jpeg` | 126 KB | 1280×576 | full width | Home LCP. It is not preloaded, but SSR discovery is fine |
| `/assets/sika.png` and other brand logos | up to 203 KB each, no dimensions | e.g. 728×441 | `h-20` | Home (Lighthouse `unsized-images` lists 8 logos) |

- **Formats:** 260 PNG, 41 JPG, 2 JPEG and 4 WebP under `public/assets`, with no AVIF.
- **Potential savings** reported by Lighthouse's `image-delivery-insight`:
  - category: 33 MB on desktop / 13 MB on mobile
  - product: 7.2 MB / 3.4 MB
  - home: 4.6 MB / 0.8 MB
  - checkout host: 3.9 MB

#### JS bundle size per route (first load)

- Next 16 with Turbopack no longer prints First Load JS in the build output, so I computed it from `build-manifest.json`: the page chunks plus the `_app` chunks, gzipped by me.
- Lighthouse's measured Script transfer agrees: 433–525 KB raw-compressed per page, depending on the late-loaded Firebase chunks.

| Route | First-load JS (gzip) | Of which page-only | Notes |
|---|---|---|---|
| `_app` (shared) | **133.5 KB** | — | React DOM 63 KB, i18n dictionaries for en/fr/ar about 22 KB, Firebase Auth loader, etc. |
| `/` | **165.3 KB** | 31.8 KB | The home chunk `9298ca64…js` contains **a second copy of all three translation dictionaries**: `"nav.home":"Home"` appears in `9298ca64…`, `b836fc4d…` (_app) and `74c29239…`. So about 20 KB gz is duplicated on home |
| `/account/change-password` | 165.5 KB | 32.0 | Same duplicate-dictionary pattern (`74c29239…`) |
| `/gallery` | 160.0 KB | 26.5 | |
| `/products/[categorySlug]/[productId]` | 150.1 KB | 16.6 | |
| `/products/[categorySlug]` | 147.7 KB | 14.3 | |
| `/products` | 146.1 KB | 12.7 | |
| `/account/*` (other pages) | 142.7–145.9 KB | 9–12.5 | |
| `/search` | 141.5 KB | 8.0 | |

Lazy chunks fetched after load on every page:
- `edccef16…js`, **Firestore SDK**: 567 KB raw / 165.5 KB gz. Lighthouse shows it fetched on `/products` and other pages.
- `5ea83d70…js`, Firebase Auth: 38 KB gz.
- Lighthouse reports `unused-javascript` of about 205 KB on every page.

Large page data, from build warnings:
- `/search` and `/products`: **290 KB** of `__NEXT_DATA__` each.
- Every `hardware-tools` product page: about 164 KB.
- `/products/hardware-tools`: 162 KB.

**And the whole catalog is downloaded again on every page.** `Layout.js:170` runs `fetch('/assets/data/products.json')`, which is 383 KB raw / 76 KB transferred, on every page view, only to power header search suggestions and the category dropdown. On top of that, `next/link` prefetch downloads `/_next/data/.../products.json` (73 KB) and the category JSONs (up to 39 KB each) in the background.

#### Top performance issues

| # | Issue | Pages | Evidence |
|---|---|---|---|
| P1 | Full-resolution 4080×3060 PNG product photos served as-is: no resizing, no WebP/AVIF, no lazy loading, no `next/image` | Category, product, search, home | 96 MB on `/products/hardware-tools`. Lighthouse LCP is 275 s mobile and 43 s desktop |
| P2 | The header dropdown loads every category image (up to 1.5 MB each) on every page, even though it is invisible | All pages | `Layout.js:325` `opacity-0`. Top transfers on every report are `chatgpt-image-nov-13…png` (1.5 MB) and `…dec-16…png` (1.2 MB) |
| P3 | Render-blocking Tailwind CDN stylesheet, 251 KB with 99% unused, plus Google Fonts CSS | All | 2.0–2.7 s estimated savings on mobile. LCP render delay is 2.3–2.9 s |
| P4 | `products.json` (383 KB) fetched client-side on every page, on top of page data of up to 290 KB | All | `Layout.js:170`, build warnings |
| P5 | Firestore SDK (165 KB gz) loaded on pages that only need Auth or nothing at all | Catalog pages | `edccef16…js` appears in the network requests of every report |
| P6 | i18n dictionaries for all three languages shipped twice on home and change-password | `/`, `/account/change-password` | Chunk grep above |
| P7 | 117 KB, 1536 px logo displayed at 40 px. Brand logos have no dimensions | All / home | `unsized-images` |
| P8 | Missing `favicon.ico` (404). This is the only best-practices failure that applies to production | All | network-requests |

---

### 2. Checkout modal (analyzed with Playwright, product page)

| Check | Result |
|---|---|
| Role | `role="dialog" aria-modal="true"` sits on the **overlay** div (`CheckoutModal.js:193`). **There is no accessible name.** axe reports `aria-dialog-name` (serious). The fix is `aria-labelledby` pointing at the `h3.checkout-modal-title` |
| Focus on open | **It does not move.** Focus stays on the drawer's "Checkout" button, which is now behind the overlay |
| Focus trap | **None.** After the 9 controls inside the modal, Tab moves into the footer links ("Home", "About", …) and `#toTop` behind the overlay |
| Escape | **Does not close the modal**, and does not close the drawer either |
| Focus on close | Lost to `BODY` |
| Errors | One message `p.cart-alert.error role="status"` (`CheckoutModal.js:249`). Fields get no `aria-invalid` and no `aria-describedby`, and focus is not moved to the error or to the first invalid field. The form uses `noValidate` |
| Labels | Every input is wrapped in a `<label>`, so labels are associated (OK) |
| `autocomplete` (guest) | **Missing on all fields**: name, tel, address, email and notes have `autocomplete=null`. The phone field is `type="tel"` (OK) |
| `autocomplete` (signed-in, new address) | Handled by `AddressFields`: `name`, `tel`, `street-address` and `address-level2` (OK) |
| Input font size | **15.2 px** (`.cart-form input`, `globals.css:488`, 0.95 rem), so iOS Safari zooms on focus |
| **Height and scrolling** | The overlay is `position:fixed` and centred with `display:grid`. Neither the overlay nor `.checkout-modal` has `overflow:auto` or `max-height` (`globals.css:720-739`), and body scroll is not locked. **For a signed-in user who picks "Use a new address", the modal is 1 040 px tall and the "Order" button sits at y=962–1012. Playwright confirms the button cannot be clicked or scrolled into view at 375×667, 390×844 and 1366×768.** It is reachable only on viewports at least about 900 px tall (`site-product-checkout-signedin-newaddr-375x667-en.png`). The guest form is 683 px tall and just fits at 667 px |
| Contrast inside | Stock badge "In stock" #0f7a2e on #dcebe3 is 4.43:1 (12 px). The "Remove" link `text-red-500` is 3.76:1. The review date #94a3b8 is 2.56:1 |

---

### 3. axe violations (rule × page × node count)

- 31 scans in total: 15 public pages and states in EN, the same set in AR, and 9 signed-in account and checkout states.
- The AR results match the EN results except for the extra contrast nodes noted below, so the AR columns are folded in.

| Rule (impact) | Pages | Nodes | Where | Fix |
|---|---|---|---|---|
| `select-name` (critical) | **31/31** | 35 | The header language `<select id="lang">` has no label (`Layout.js:401`). The two category sort/brand selects (`pages/products/[categorySlug]/index.js:240,259`) also have none | `aria-label` or a visually hidden `<label>` |
| `landmark-no-duplicate-main` / `landmark-main-is-top-level` / `landmark-unique` (moderate) | 29/31 | 29 each, plus 2 for the duplicate header `<nav>` on category | **Nested `<main>`**: `Layout.js:490` wraps every page in `<main>`, and the pages render their own `<main>` too. See `search.js:92`, `products/index.js:31`, `[categorySlug]/index.js:228`, `[productId].js:79`, `gallery/index.js:125`, `AuthCard.js:8`, `AccountLayout.js:23,38` | Make one of them a `div` |
| `color-contrast` (serious) | 16 | 30 | `.ui-divider` "or" on login/signup (#94a3b8 on white, 2.56). `.stock-badge--order` (#f97316 on #fdefd9, **2.47**, `globals.css:303`). `.stock-badge--in` (4.43). Cart "Remove" `text-red-500` (3.76). `.review-item__date` (2.56, `account.css:794`). `.timeline__step--todo .timeline__label` on quote detail ×4 (2.56, `account.css:601`) | Darker tokens: slate-500 #64748b is 4.76 and orange-700 #c2410c is about 5 |
| `aria-hidden-focus` (serious) | 6: category, product and /products in EN and AR | 1 | The closed `<aside id="cartDrawer" aria-hidden="true">` (`CartWidget.js:85`) is only moved off-screen with `translateX(100%)`. Its buttons and quantity input stay tabbable | `inert` or `visibility:hidden` when closed |
| `aria-dialog-name` (serious) | 5 checkout states | 1 | `CheckoutModal.js:193` | `aria-labelledby` |
| `heading-order` (moderate) | 9 (account pages, login/signup AR) | 1 | The footer `h3` "SOFRACOM" follows an `h1` with no `h2` in between (`Layout.js` footer) | Use `h2` or a `p` |
| `page-has-heading-one` (moderate) | 2: category EN and AR | 1 | `/products/[categorySlug]` has **no `<h1>`** | Add an h1 with the category name |
| `aria-allowed-attr` (critical) / `aria-prohibited-attr` (serious) | 2: gallery EN and AR | 1 each | Inside the **YouTube embed iframe** (third party), so this is not fixable in this repo | Accept, or use a click-to-load facade |

**Clean except for the global issues** (select-name and landmarks): home, search, products index, account profile, addresses, orders, order detail and reviews. On home, only `select-name` fails.

---

### 4. Keyboard and focus

Playwright Tab walk on the product page, 1440 wide:

| Area | Finding | Severity |
|---|---|---|
| Skip link | **None.** The first Tab goes to the logo | Medium |
| Header order | Logo, then Home, About, Brands, Products ▾, **then 6 invisible dropdown links** (category links inside the `opacity-0` dropdown, `Layout.js:325`: focus lands on links you cannot see, and focusing "Products" does not open the dropdown), then Gallery, Services, Contact, search input, hidden submit button "Search" (sr-only, which is fine), account link, language select | High (invisible focus targets) |
| Cart drawer: role | `<aside>` with no `role="dialog"`, no `aria-modal`, no label. `aria-hidden` toggles correctly | Medium |
| Cart drawer: open | Pressing Enter on the cart button opens the drawer, but **focus stays on the button**. The drawer is the last thing in the DOM, so a keyboard user has to Tab through the rest of the page first | High |
| Cart drawer: trap and Escape | No trap: after "Checkout", Tab moves to footer links. **Escape does nothing** | High |
| Cart drawer: close | Clicking "×" leaves **focus on the now off-screen close button** (`[OFFSCREEN] focus:NONE`). Focus does not go back to the cart button | High |
| Closed drawer | Its controls (close, −, qty, +, Remove, Checkout) stay in the Tab order while invisible (axe `aria-hidden-focus`) | High |
| Checkout modal | See §2: focus is not moved in, not trapped, Escape does nothing, and focus goes to BODY on close | High |
| Hamburger (390) | `#mobileMenuBtn` has `aria-label="Toggle navigation"` (English only, not translated) and **no `aria-expanded` or `aria-controls`**. Escape does not close the menu. Focus is not moved into the menu | Medium |
| Focus visibility | Most links and buttons show the browser default ring (`outline 1px rgb(0,95,204)`). Two exceptions: the header search and the language select use `focus:outline-none focus:ring-2 focus:ring-blue-200` (`Layout.js:374,402,436`), so the ring is light blue on a translucent header. Form inputs replace the outline with `border-color: var(--accent)` plus `box-shadow 0 0 0 3px rgba(36,180,255,.2)` (`globals.css:498-502`, `account.css:125-129`). That pairs a 2.32:1 border with a 20%-alpha halo, **below the 3:1 non-text contrast required by WCAG 1.4.11 / 2.4.11 (2.4.13 at AAA)**. `.star-input button:focus-visible` uses a 2 px accent outline (2.32:1 on white) | Medium |
| `outline: none` occurrences | `globals.css:500`, `account.css:128`, Tailwind `focus:outline-none` at `Layout.js:374,402,436` and `search.js:115`. All of them come with a replacement ring of weak contrast | — |
| Login error | `role="alert"` (good), but inputs get no `aria-invalid` and focus drops to BODY after submit | Low/Med |
| Signup empty submit | `role="alert"` "Please fill in all required fields." The form is `noValidate`, so it says nothing about which field is wrong and sets no `aria-invalid` | Medium |
| Images and alt | Every `<img>` on every audited route has an `alt` (none missing, none filenames). Alts are mostly titles. On the product page, thumbnail buttons (`button.w-20`) have no text, but their `img alt` names them | OK |

#### Palette contrast (computed)

| Pair | Ratio | Use | Verdict |
|---|---|---|---|
| white on `--deep-navy` #0b2050 | 15.71 | header, buttons | Pass |
| white on `--sea` #0f3d72 | 10.88 | | Pass |
| `--accent` #24b4ff on white | **2.32** | focus borders, active badges | Fails as text and as a non-text indicator |
| white on `--accent` | **2.32** | — | Fail |
| navy on accent (avatar) | 6.77 | header avatar | Pass |
| #94a3b8 (slate-400) on white | **2.56** | dividers, dates, timeline todo labels (`account.css:212,602,796,839`) | Fail |
| #64748b (slate-500) on white | 4.76 | | Pass |
| gray-500 #6b7280 on white / on sand #f8fafc | 4.83 / 4.62 | 22 uses | Pass (barely) |
| red-500 #ef4444 on white | 3.76 | cart "Remove" | Fail at 12 px |
| #f97316 on #fdefd9 | **2.47** | "On order" badge | Fail |
| `text-orange-400` on white | **2.26** | `[productId].js:167` | Fail |
| #f59e0b star fill on white | 2.15 | stars (graphic, number shown alongside) | Below 3:1 for non-text |
| #cbd5e1 empty star | 1.48 | stars | Below 3:1 |

---

### 5. Mobile UX (390×844 unless noted)

| Check | Result |
|---|---|
| Horizontal scroll, signed out | None on any page, EN or AR (`scrollWidth == 390`) |
| **Horizontal scroll, signed in** | **Yes on every page in EN (409 px) and FR (414 px).** The header right group (avatar plus "My account" / "Mon compte", language select, hamburger) overflows and the hamburger is partly off-screen (`burger: 377–409`). The cause: `.header-account { display:inline-flex }` in `account.css:262` overrides Tailwind's `hidden` on `className="header-account hidden md:inline-flex"` (`Layout.js:389`), so the account pill always shows on mobile. Signed out, the pill also shows on mobile, but "Sign in" is short enough to fit. AR fits (390). See `site-account-header-signedin-390-{en,fr}.png` |
| Hamburger menu | It opens inline inside the sticky header: menu 523 px, header 590 px tall on an 844 px viewport, with no `overflow` on the menu. With 7 links, sign-in and 6 categories it fits at 844, but on a ~600 px viewport the bottom would be cut off and unscrollable, because the header is sticky. No `aria-expanded`, no Escape. The search field in the menu is unlabeled (placeholder only, hard-coded English "Search products…", `Layout.js:373,435`) |
| Cart drawer | Full width (`min(420px,100vw)`) and full height. The submit button is visible (bottom 828/844). **Body scroll is not locked**. Close "×" is **16×24 px**, −/+ quantity buttons are **20×24**, "Remove" is 57×16 |
| Checkout modal | The guest form fits (683 px). The **signed-in new-address form is 1 040 px with an unreachable submit** (§2) |
| Sticky and fixed elements | Sticky header 67 px. `#cartFab` is fixed, 358×55, at the bottom of catalog pages and covers the last 55 px of content (it sits over `div.max-w-7xl` at the page bottom; `site-product-bottom-fab-390-en.png`). `#toTop`, 45×40, is fixed at `bottom-6 right-6` and overlaps the FAB's right end on catalog pages (FAB 16–374 px, toTop 321–366 px at y≈780) |
| Tap targets under 24×24 (fails WCAG 2.5.8) | Every page: footer links Home/About/Brands/Services/Contact (39–57×17) and "Back to top" (64×16). Category: "Read more" (66×19) and **"View details" (80×20) on every card**, giving **82 tiny targets** on `/products/antifouling-coatings`. Product: "Catalog" breadcrumb (51×20), "Download datasheet" (132×20), "Sign in" (46×17). Auth: "Forgot password?" (121×17), "Create an account" (124×17), "Back to sign in" (99×17). Cart: close 16×24, −/+ 20×24. Checkout close "×" **14×22** |
| Tap targets under 44×44 | Header: hamburger **32×42**, language select 68×36, "Sign in" pill 74×34. Product variant pills 143×34. Review sort select 142×33. Gallery filter chips about 38 px tall |
| Input font-size under 16 px (iOS zoom) | **Login, signup, reset, account profile, address form and checkout inputs are all 15.2 px** (`account.css:116` 0.95 rem, `globals.css:488`). The category card variant selects are 15.2 px and the product page variant select is **13.6 px**. Home contact form and search inputs are 16 px (OK) |
| `type` / `inputmode` / `autocomplete` | Login: `type=text inputmode=email autocomplete=username` (the field also accepts phone numbers, so that is reasonable). Password fields: `current-password` / `new-password` (OK). Signup name: `autocomplete=name` (OK). Profile email `type=email` has no autocomplete. **Checkout guest fields have no autocomplete.** **Home contact form** (`pages/index.js`): name, email, phone and subject have no autocomplete, and **phone is `type=text`** rather than `tel` |
| RTL (AR) | `html lang="ar" dir="rtl"` is set client-side. No overflow at 390 |

---

### 6. SEO

| Item | Status | Evidence |
|---|---|---|
| `<title>` | **"SOFRACOM" on every public page**: home, /products, category, product, search, gallery, login, signup, reset. Only `AccountLayout` sets `"{title} · SOFRACOM"`. The 404 page uses the Next default. Titles do not change with language | `_app.js:17`. Playwright dump in all 3 languages |
| Meta description | **Missing on every page** (Lighthouse `meta-description` fails everywhere) | — |
| OpenGraph / Twitter | **None** (0 `og:*`, 0 `twitter:*`) | — |
| Canonical | **None** | — |
| hreflang | **None.** Language lives only in `localStorage` (`sofracom.lang.v1`), so the same URL serves en/fr/ar and crawlers only ever see English. FR/AR content cannot be indexed | `LangContext.js` |
| `html lang` / `dir` | **The SSR HTML has a bare `<html>` with no `lang`** (no `pages/_document.js`). `lang` and `dir` are set only after hydration (`LangContext.js:29-30`). Arabic users get an LTR first paint, then a flip | `curl` of `/`, a product page and `/account/login` |
| robots.txt | **404** | — |
| sitemap.xml | **404** (about 190 static URLs, including 167 product pages, that could be listed) | — |
| favicon / manifest | **404 / 404** | — |
| `noindex` | Set on account pages via `AccountLayout`. **Not set** on `/account/login`, `/signup` or `/reset`, which use `AuthCard` | `AccountLayout.js:41` |
| Structured data | **None.** No `Product`/`Offer` (prices and stock exist in the catalog), no `AggregateRating`/`Review` (`productStats` exists but loads client-side only, so it cannot appear in SSR JSON-LD without a build-time snapshot), no `LocalBusiness`/`Organization` (address and phone are on the home page), no `BreadcrumbList` | 0 `application/ld+json` |
| Product URL format | `/products/<categorySlug>/<p_xxxxxxxx>`. These are stable but **contain no keywords**. One slug contains an `&`: `/products/powertools&parts/...` gets encoded as `powertools%26parts`, which is ugly and risky for sharing. Legacy URLs 301-redirect (OK) | `next.config.js` |
| Headings | Category page has no h1. Other pages have exactly one h1 | axe |
| Internal anchors | Header and footer nav use `/#about` and similar hash links. Footer links on non-home pages are `#home`, `#about`, … (relative hashes) and go nowhere off the home page | `Layout.js` footer `<a href="#about">` |

---

### 7. Top issues per page

| Page | Top issues |
|---|---|
| **All pages** | Render-blocking Tailwind CDN plus Google Fonts (−2 to −2.7 s mobile). Hidden category dropdown downloads about 3.9 MB of images. `products.json` fetched on every view. Unlabeled language select. Nested `<main>`. No skip link. Invisible focusable dropdown links. Title "SOFRACOM", no description, no OG/canonical/hreflang/JSON-LD. No `lang` in SSR. **Signed-in mobile header overflows (EN/FR)**. 15.2 px inputs. Footer tap targets of 17 px |
| **Home** | Mobile perf 68, LCP 10.2 s (hero render delay plus CSS). 8 unsized brand logos (up to 203 KB). Duplicated i18n chunk (+20 KB gz). Contact form missing autocomplete, and phone field is `type=text` |
| **Category** | Mobile perf 60. **95 MB of full-size PNGs, none lazy**, LCP 275 s simulated. No h1. Unlabeled sort and brand selects. 82 tap targets under 24 px ("Read more", "View details"). "On order" badge at 2.47:1. Closed cart drawer still focusable |
| **Product** | Mobile perf 60, LCP 16.1 s (1.3–1.9 MB PNG main and second image). Variant select 13.6 px. `text-orange-400` at 2.26:1. Datasheet and breadcrumb tap targets 20 px tall |
| **Cart drawer** | Not a dialog. No focus move, trap, Escape or focus return. Stays focusable when closed. Close and ± targets 16–20 px. Body scroll not locked |
| **Checkout modal** | **Signed-in new-address submit is unreachable on phones and 1366×768 laptops.** No accessible name, no focus management, no Escape. Guest fields have no autocomplete. Errors carry no `aria-invalid` and no field link |
| **Auth pages** | "or" divider at 2.56:1. No `noindex`. 15.2 px inputs. Generic error with no per-field `aria-invalid`. Small text-link targets |
| **Account pages** | Heading order (footer h3). Timeline "todo" labels at 2.56:1 on quote detail. Horizontal scroll at 390 when signed in (EN 409, FR 414) |
| **Gallery** | YouTube iframe ARIA errors (third party). Otherwise clean |

### A5.x i18n / RTL

#### 2.1 Hard-coded English strings (client code)

There are no i18n keys for any product-card / product-page UI (en.js has none for add-to-cart, details, datasheet or stock). The pages below render these literals in FR and AR. A runtime scan of an AR page found **~50 English text nodes on `/`**, ~13 on `/products` (plus the catalog data on category pages), and 16 on a product page.

| File:line | String / attribute | Kind |
|---|---|---|
| pages/_app.js:17 | `<title>SOFRACOM</title>`: same title on every page; no `meta description` anywhere | document title/meta |
| components/Layout.js:287 | `alt="SOFRACOM Logo"` | alt |
| components/Layout.js:338 | ``alt={`${category.name} category`}`` | alt |
| components/Layout.js:343, 481 | `category.name` (untranslated; nav dropdown + mobile menu show English category names in FR/AR) | catalog |
| components/Layout.js:373, 435 | `placeholder="Search products…"` (key `products.controls.searchPlaceholder` exists but is unused here) | placeholder |
| components/Layout.js:382, 445 | sr-only button "Search" | a11y text |
| components/Layout.js:415 | `aria-label="Toggle navigation"` | aria-label |
| components/Layout.js:53-57, 261 | `Intl.NumberFormat('fr-TN')` fixed; `text-left` in the suggestion list | format/RTL |
| components/Layout.js:497-498 | "Marine coatings & supplies in Monastir. Products, expertise, and partner yard…" | text |
| components/Layout.js:541-542 | "© … SOFRACOM. All rights reserved." | text |
| components/Layout.js:549 | "Back to top" | text |
| pages/index.js:19-47 | SERVICE_CARDS: 6 titles + 6 descriptions | text |
| pages/index.js:52-66 | TIMELINE: 4 titles + 4 descriptions | text |
| pages/index.js:71-80 | TESTIMONIALS: 3 quotes + 3 authors | text |
| pages/index.js:129, 135, 143, 156 | Quote form status: "Please provide name, email, and a message.", "Sending quote…", "Quote received! We will reply within a day.", fallback "Unable to send quote right now." (and line 156 shows the raw server `error.message`) | error/toast |
| pages/index.js:173 | `alt="Monastir Marina"` | alt |
| pages/index.js:234-258 | About paragraph + 4 bullet items | text |
| pages/index.js:267-294 | 4 feature tiles (Antifouling / Gelcoat Repair / Deck Renewal / Haul-out + subtitles) | text |
| pages/index.js:352-354 | Services intro paragraph | text |
| pages/index.js:504, 510 | "Phone:", "Email:" labels in contact block | label |
| pages/index.js:564 | Quote form label "Phone" | label |
| pages/products/index.js:33, 35, 38 | "SOFRACOM Catalog", "Explore categories & products", intro paragraph | text |
| pages/products/index.js:55-56 | "{n} products", "View" | text |
| pages/products/[categorySlug]/index.js:49 | ``aria-label={`View ${product.title}`}`` | aria-label |
| …/index.js:77 | "Show less" / "Read more" | button |
| …/index.js:88 | "Download datasheet" | link |
| …/index.js:94 | sr-only "Choose variant" | label |
| …/index.js:104 | `` `Variant ${idx + 1}` `` | fallback |
| …/index.js:116 | `STOCK_LABEL` + "Unknown" | badge |
| …/index.js:134, 142 | "View details", "Add to cart" | button |
| …/index.js:232 | Breadcrumb "Catalog" | nav |
| pages/products/[categorySlug]/[productId].js:82, 86 | "Product detail", "Catalog" | text/nav |
| …/[productId].js:120 | ``alt={`${title}-${index}`}`` | alt |
| …/[productId].js:163, 168 | stock label/"Unknown"; "This item is on order; delivery will take longer." | badge/text |
| …/[productId].js:203, 215, 225 | "Show less/Read more", "Download datasheet", "Add to cart" | button/link |
| pages/search.js:22, 95-135 | fixed `fr-TN` format; "Product search", "Find the right product", subtitle, sr "Search products", placeholder "Search by name, brand, or usage", "Search", `{n} result(s) for "…"` (manual English plural), "Start typing…" | text |
| pages/search.js:150, 172, 181, 199, 209 | `aria-label "View …"`, "Category:", stock label, "View details", "No matches yet. Try another keyword or brand." | text |
| pages/gallery/index.js:17 | dates formatted `en-US` ("Jun 12, 2026" in AR) | date |
| pages/gallery/index.js:69, 74 | "View video", badge "Image"/"Video" | text |
| lib/stock.js:2-4 | `STOCK_LABEL` In stock / Out of stock / On order | badge |
| lib/localize.js:21 | `` `Variant ${index + 1}` `` | fallback |
| lib/localize.js:31 | `usage` is **never localized** (always `product.usage`) | catalog |
| lib/apiClient.js:24, 33, 48 | "Network error" / "Request failed"; `errorMessage` falls back to the **server's English message** when a code is unknown/absent (e.g. `cart/too-large` has no `errors.*` key; `Payload too large` / `Invalid JSON payload` / `Missing request body` have no code) | error |
| lib/i18n/en.js:144 | `errors.validation` says "check the **highlighted** information", but no form highlights fields | copy |
| lib/i18n/*: `orders.itemCount`, `reviews.count` | "{count} item(s)", "{count} review(s)": no `Intl.PluralRules`; Arabic needs 6 plural forms | plural |

**Catalog data** (`public/assets/data/products.json`, 167 products, 6 categories):

| Field | FR missing | AR missing |
|---|---|---|
| Product title | 0 (12 identical to EN) | **72 / 167** (16 more identical to EN) |
| Product description | 0 | **70 / 167** |
| Usage tags | **167 / 167** (not supported by code) | **167 / 167** |
| Variant labels (products with variants) | 22 / 22 | 22 / 22 |
| Category name / description | 0 | **2 / 6** (`powertools&parts` 18/18 AR titles missing, `pneumatic` 2/2) |

Usage tags are also mixed-language within one product (e.g. `Polyurethane primer`, `apprêt polyuréthane`; `primer`, `primaire`).

#### 2.2 RTL layout bugs (AR at 1440 and 390)

| Where | Problem | Evidence |
|---|---|---|
| Home "Services" timeline, pages/index.js:393, 397 | `border-l-2 pl-6` + dot `absolute -left-3`: in RTL, **dots and rail stay on the left edge (x=262)** while the text aligns to the right edge (x=1168), ~900 px apart. Bidi also moves the numbering to the end ("Share your project .1"). | `site-home-rtl-timeline-1440-ar.png` |
| Prices everywhere (lib/constants.js:5, search.js:22, Layout.js:54) | Always `Intl.NumberFormat('fr-TN')`. Inside RTL runs, "341,887 DT" renders as **"DT 341,887"** (currency jumps to the left). No `<bdi>`/`dir="ltr"` wrapper. Latin digits everywhere, which is acceptable for Tunisia but not a choice the code makes. | `site-checkout-rtl-1440-ar.png` (drawer totals) |
| Header search suggestions, globals.css:82, 94; Layout.js:261 | `text-align:left` + `margin-right` on the thumbnail: Arabic titles are left-aligned and the image gap is on the wrong side. | rtl.json `suggestion.textAlign = left` |
| Products dropdown, Layout.js:322 | `absolute left-0`: the menu opens to the right of the link (x 795→1019) instead of aligning to its right edge. | rtl.json |
| Cart drawer, globals.css:360-376 | `right:0; translateX(100%)`: still slides from the right in RTL (acceptable, but inconsistent with the mirrored layout). | – |
| Cart "Remove", CartWidget.js:161 | `ml-3`: the gap is on the wrong side in RTL. | rtl.json `removeMarginLeft 12px` |
| Category "Read more", globals.css:552 | `margin-left:.5rem` | – |
| Cart FAB, globals.css:321, 867 and back-to-top, Layout.js:557 | Both pinned `right` (physical). The **back-to-top button sits under the cart FAB** (overlap 45×40 px at 1440 and 390; `elementFromPoint` at its centre returns `#cartFab`), so it can't be clicked on catalog pages. | rtl.json `fabTop`, overflow.json |
| Gallery badge, gallery/index.js:73 | `absolute top-4 right-4` (also `bg-white/80`, v3 syntax that doesn't exist in v2) | – |
| Hero decorative blobs, index.js:177-178 | `left-16` / `right-24` (cosmetic only) | – |
| Breadcrumbs (category/product) | Separator "/" and the English "Catalog" mix with Arabic, e.g. "Catalog / مضاد الترسّبات…". | `site-category-overflow-390-ar.png` |
| Phone inputs | OK: render LTR (`+216 20 123 456` reads correctly). Email/identifier inputs set `dir="ltr"`. | `site-checkout-rtl-1440-ar.png` |
| Star input / rating bars | OK: forced `direction:ltr` (account.css:658, 697). | – |
| account.css | Correctly uses logical properties (`margin-inline-start`, `inset-inline-start`). globals.css has none. | – |

**Physical-direction CSS/classes to convert** (complete list):
- globals.css:68 `left:0` (.search-dropdown), :82 `text-align:left`, :94 `margin-right`, :172-173 `left/right:0` (wave, harmless), :321 `right:1.5rem` (.cart-fab), :363/:368/:376 drawer `right`/`translateX`, :552 `margin-left`, :867 `right:1rem`.
- Tailwind: index.js:177 `left-16`, :178 `right-24`, :393 `border-l-2 pl-6`, :397 `-left-3`; Layout.js:261 `text-left`, :322 `left-0`, :557 `right-6`; gallery/index.js:73 `right-4`; CartWidget.js:161 `ml-3`.
- Tailwind v3-only syntax that silently does nothing on the v2.2.19 CDN: `lg:grid-cols-[1.1fr,0.9fr]` ([productId].js:98, which is what makes the product page single-column), `bg-[rgba(11,32,80,0.92)]` (Layout.js:424; the mobile menu still looks dark because it inherits the header background, but this class does nothing), `border-white/30`, `bg-white/15`, `bg-white/80`, `tracking-[0.3em]`.

#### 2.3 Text overflow (FR/AR, 390 and 1440)

I scanned `/`, `/products`, a category, a product, `/search?q=sika`, `/gallery`, login and signup (`$S/scripts/overflow.mjs` → `out/overflow.json`):
- **No horizontal page scroll** on any page (documentElement.scrollWidth == viewport in all 32 runs).
- **No clipped visible text** (`scrollWidth > clientWidth` hits were all `sr-only` elements).
- **Real collisions:** (1) header logo text vs "Se connecter"/"تسجيل الدخول" pill, **40 px overlap at 390 in every language** (`site-category-overflow-390-ar.png`, `site-journey1-step2-390-en.png`); (2) cart FAB vs back-to-top (above).
- AR/FR strings fit at 1440. The longest FR category ("Electroportatifs et Pièces de Rechange") wraps without clipping.

---

## A6. UX problems (prioritized)

This table merges A1, A2–A5 and the journey findings. Severity reflects impact on customers. Evidence names a screenshot (in `screenshots/` or on a contact sheet) or a metric.

| # | Issue | Where | Evidence | Impact on users | Severity |
|---|---|---|---|---|---|
| 1 | Signed-in checkout with "Use a new address": the modal is 1040 px tall and doesn't scroll, so **the Order button can't be reached** | `globals.css:720-739`, `CheckoutModal.js` | `site-product-checkout-signedin-newaddr-375x667-en.png`; Playwright can't click it at 375×667, 390×844 or 1366×768 | Logged-in customers adding an address can't buy | **High** |
| 2 | Full-resolution product photos (391 MB total) with no resizing, lazy loading or `next/image`. The hidden header dropdown loads every category image (~3.9 MB) on every page | `public/assets/products`, `Layout.js:325` | 57–96 MB per category page; mobile perf 60–68; LCP 16 s (product) and 275 s (category), simulated | Very slow pages on 4G, heavy data use, people leave | **High** |
| 3 | Guests can't track orders: no order number on the confirmation, no email/SMS, and the guest order isn't linked to a new account unless the email is verified (not explained) | `CheckoutModal.js:206-226`, `api/account/link.js:30` | `site-checkout-guest-confirmation-1440-en.png`, `site-journey5-step5-1440-en.png` | Phone calls to the shop; customers think the order was lost | **High** |
| 4 | Product page is a single column at desktop, so Add to cart is below the fold (y=1022 at 1440, y=1193 at 390) | `[productId].js:98` (`lg:grid-cols-[1.1fr,0.9fr]` doesn't exist in v2) | `site-product-variants-1440-en.png` | The main call to action is hidden on arrival | **High** |
| 5 | Signed-in mobile header overflows (409–414 px) and the logo collides with the account/Sign in pill. Hamburger and Checkout clicks get intercepted | `account.css:262` overrides `hidden` (`Layout.js:389`) | `site-header-signed-in-390-en.png`, `site-home-mobilemenu-390-en.png`, `site-home-hero-390-fr.png` | Mobile looks broken and sideways scroll appears | **High** |
| 6 | FR/AR half translated: home content, product/cart UI, stock badges, search page, footer and quote messages are English; 72 of 167 products have no AR title; usage tags are never translated; page HTML is always English (English flash, no `lang`/`dir` in SSR) | §A5 i18n list | ~50 English text nodes on AR home; `site-category-default-1440-ar.png` | Arabic and French visitors see a half-finished shop | **High** |
| 7 | Search, suggestions and price sort show the base price while the cart charges the variant price (51 products) | `Layout.js:266`, `search.js:176`, category sort | Sikaflex 291i: 55,568 → 57,414 DT | Customers feel misled at checkout | **High** |
| 8 | Cart drawer and checkout modal aren't accessible dialogs: focus isn't moved, trapped or returned, Escape does nothing, the closed drawer stays focusable, and the dialog has no name. The language select has no label (critical, every page) | `CartWidget.js:85`, `CheckoutModal.js:193`, `Layout.js:401` | axe `select-name` 31/31, `aria-hidden-focus`, `aria-dialog-name`; keyboard log | Keyboard and screen-reader users can't check out reliably | **High** |
| 9 | The cart exists only on catalog pages (not on home, search, gallery or account), and search results have no Add to cart | CartWidget mounting | `#cartFab` count 0 on those routes | Shoppers can't reach their cart from most pages | Med |
| 10 | Quote request only via the home contact form: the success message disappears after 6 s, is English-only, and has no reference number or link to My quotes. Message is required only in JS. No quote option from the cart | `index.js:124-162` | `site-home-quote-success-1440-en.png` | People are unsure the quote was sent; guests can't follow up | Med |
| 11 | A filter with zero matches shows the full category list with no message | `[categorySlug]/index.js:205` | `site-category-empty-filter-1440-en.png` | The filter looks broken | Med |
| 12 | Footer quick links (`#about` etc.) are dead on every page except home | `Layout.js:505-535` | any footer | Dead links site-wide | Med |
| 13 | Contrast failures: on-order badge 2.47, `#94a3b8` text 2.56, `text-orange-400` 2.26, focus ring 2.32 (the only focus cue on inputs), stars 2.15 | §A2.1 / §A5 | axe `color-contrast` on 16 pages | Hard to read; focus is hard to see | Med |
| 14 | Inputs are 15.2 px (13.6 px on the variant select), so iOS zooms on focus. 82 tap targets under 24 px on a category page; cart ×/± 14–20 px. Guest checkout fields have no `autocomplete` | `account.css:116`, `globals.css:488` | mobile log | Fiddly forms on phones | Med |
| 15 | SEO basics missing: title is "SOFRACOM" everywhere, no meta description, OG, canonical, hreflang, sitemap, robots, JSON-LD or favicon. FR/AR can't be indexed (language only in localStorage) | `_app.js:17`, no `_document.js` | Lighthouse SEO 91; curl | Poor search visibility and ugly shared links | Med |
| 16 | RTL bugs: home timeline rail stays left, prices render "DT 341,887", drawer/FAB/suggestions not mirrored, Inter has no Arabic so AR falls back to the system font, AR order detail 411 px with a clipped pill | §A5 RTL table | `site-home-rtl-timeline-1440-ar.png`, `site-checkout-rtl-1440-ar.png`, `site-account-order-detail-in-progress-390-ar.png` | Looks unpolished to Arabic readers | Med |
| 17 | Visual inconsistency: 5 primary-button looks (navy pill, navy 0.75rem, blue-900, blue-600), 14 blues, two gray scales, 24 font sizes, 20 radii, 14 one-off shadows. The header search and language select render as opaque white boxes | §A2 | `buttons.txt`; `site-home-default-1440-en.png` | The site feels assembled rather than designed; trust drops | Med |
| 18 | Motion: no `prefers-reduced-motion` anywhere; the 3D tilt is broken (no perspective) and cancels hover lifts; 34 home elements including the hero h1 are invisible until JS runs; fixed-background parallax repaints on scroll | §A4 | computed styles | Motion sickness risk, jank, blank page if JS fails | Med |
| 19 | After publishing a review via `#write-review`, the form pops up again in "Edit" mode | `ProductReviews.js:104-107` | `site-product-review-submitted-1440-en` (contact sheet 3) | Confusing; users think it didn't save | Med |
| 20 | Saving the profile while browsing in AR switches the site to EN | `pages/account/index.js:24-30,54` | `site-account-profile-saved-1440-ar` (contact sheet 4) | Surprise language switch | Med |
| 21 | Review prompts are discoverable only through My orders; the nav badge shows only on the Reviews page | `AccountLayout.js:16` | J6 | Few reviews get written | Med |
| 22 | Sign-up isn't offered in checkout (13 clicks via login), guest details typed before leaving are lost, two "notes" fields, and "Continue as guest" does nothing | `CheckoutModal.js` | J4, J1 step 8 | Fewer accounts; confusion | Low-Med |
| 23 | Back-to-top sits under the cart FAB; at 390 the full-width FAB covers the bottom 55 px of content | `globals.css:318-333`, `Layout.js:557` | `site-product-scrolled-fabs-1440-en.png` | Feature unusable; content hidden | Low |
| 24 | Empty cart shows a 7 DT delivery fee and a 7 DT grand total | `CartWidget.js:176-185` | `site-cart-empty-1440-en.png` | Confusing | Low |
| 25 | The on-order notice after an order renders inside the cart drawer, which has just closed | `CartWidget.js:57-60,94` | contact sheet 3 | Delay warning never seen | Low |
| 26 | Product page preselects variant 0 even when it's out of stock and another variant is in stock (the card picks the first in-stock one) | `[productId].js:45` | `site-product-firstvariant-out-1440-en` | Looks unavailable when it isn't | Low |
| 27 | Checkout errors are one generic sentence with no per-field highlighting or `aria-invalid` (the copy even says "highlighted") | `CheckoutModal.js:63`, `en.js:144` | `site-checkout-guest-errors-1440-en.png` | Slower to fix errors | Low |
| 28 | 404 is the default English Next page with no search or catalog link | no `pages/404.js` | `site-404-default-1440-en.png` | Dead end | Low |
| 29 | Structure: nested `<main>` on 29 pages, category page has no h1/h2, card titles h2 on search vs h3 on category, no skip link, invisible dropdown links in the Tab order | §A2.2, §A5 | axe landmarks | Screen-reader navigation and SEO suffer | Low |
| 30 | Service icons don't match their labels (envelope for "Antifouling", play triangle for "Haul-out") | `index.js:17-48` | `site-home-default-1440-en.png` | Small trust/quality signal | Low |
| 31 | `products.json` (383 KB) is fetched on every page view just for header search; the Firestore SDK (165 KB gz) loads on catalog pages; i18n dictionaries are bundled twice on home | `Layout.js:170` | Lighthouse network | Wasted data on mobile | Low |


Audited 2026-10-04 on branch `redesign` (HEAD `ce00448`). Product admin and `/ops` were checked on :5183 (emulator), gallery admin on :5184. **Nothing was saved in the catalog or gallery tools.** The screenshot script blocked every non-GET request to `/api/products|gallery|upload` at the browser level (`$S/scripts/b-admin-shots.mjs`). Actions in `/ops` ran against isolated "AUDIT" fixtures on the emulator, which were removed afterwards (`$S/scripts/b-admin-fixtures.cjs up|down`). `git status` was unchanged after every run.

Screenshots: 41 admin captures at 1440 px; 14 are kept in `screenshots/` and 20 appear on `contact-sheets/5-admin-tools.png`.

---

## B1. Inventory

### B1.1 Tools at a glance

| Tool | Start | Port / bind | Stack | Auth | Reads | Writes |
|---|---|---|---|---|---|---|
| **Product admin (catalog)** `tools/product-admin/{server.js,app.js,index.html,styles.css}` | `npm run admin` (or `admin:emulated`; the Firebase target doesn't affect the catalog) | 5173 on `127.0.0.1` (`HOST`/`PORT` env, server.js:9-10) | Node `http` server (CommonJS, no framework), vanilla JS UI with `<template>` cloning, its own CSS (856 lines) | **None.** It relies only on the loopback bind, and sends `Access-Control-Allow-Origin: *` on every JSON response and OPTIONS preflight (server.js:91-95, 431-438) | `public/assets/data/products.json`, `public/assets/**` (previews), `.env` (`PRODUCT_ADMIN_GITHUB_TOKEN`, `_USERNAME`) | `products.json` (whole file rewritten, server.js:476-477). Uploads go to `public/assets/{products,categories,datasheets}/<name>-<base36 time>.<ext>` and are **`git add`ed immediately** (server.js:377). Then `git commit` (of the **whole index**) and `git push <token-url> <current branch>` (server.js:201-263) |
| **Operations `/ops`** `tools/product-admin/{ops.html,ops.js,ops.css,ops-api.mjs}` | Same process as the catalog: `npm run admin` (PRODUCTION) / `npm run admin:emulated` (EMULATOR) | 5173/ops (5183 in this audit) | ESM module loaded lazily (server.js:46-55). Imports `lib/firebase/admin.js` + `lib/server/{http,devices,statusUpdates,reviewModeration,adminUsers}.js` with the Admin SDK. Vanilla JS UI | **None** (loopback only). Every write is recorded as `by: local-admin:<os user>` (ops-api.mjs:28) | Firestore `orders`, `quotes`, `reviews`, `users`, `devices`, `enrollCodes`. Firebase Auth users. `products.json` (for review product titles, ops-api.mjs:43-51) | `orders/quotes.status/statusHistory`, `reviews.status` + `productStats` (transaction), `devices.active` + revoked refresh tokens, `enrollCodes`, `deviceEvents`/admin events, Auth password + `mustChangePassword` |
| **Gallery admin** `tools/gallery-admin/{server.js,app.js,index.html,styles.css}` | `npm run gallery-admin` | 5174 on `127.0.0.1` | Copy-paste fork of the product-admin server (same `loadEnvFile`, git, upload and CORS code) | **None**, CORS `*` (server.js:67-73, 362-369) | `public/assets/data/gallery.json` (1 entry today), `.env` (`GALLERY_ADMIN_GITHUB_TOKEN`, falling back to `PRODUCT_ADMIN_*`, then `GITHUB_*`) | `gallery.json`, `public/assets/gallery/*` (uploads `git add`ed at once, server.js:308), then commit of the whole index + push of the current branch (server.js:139-204) |
| `scripts/seed-emulator.js` | `npm run seed:emulator` | n/a | Node CJS + Admin SDK | Refuses to run without emulator env vars (lines 15-18) | `products.json` | Recreates `buyer@`/`staff@example.test` (deletes and recreates them in Auth), 2 orders, 1 quote, user profiles. It sets no `nameLower`, so a **name search in /ops finds nobody** (see B3) |
| `scripts/assign-product-ids.js` | `node scripts/assign-product-ids.js` | n/a | Node CJS, `lib/productIds.js` | none | `products.json` | `products.json` (adds `id`/`legacyId`). Not committed by itself |
| `scripts/migrate-statuses.mjs` | `node scripts/migrate-statuses.mjs [--apply]` | n/a | Node ESM, `lib/status.js` | Service-account key. Prints `Target: PRODUCTION/EMULATOR` (line 59) | `orders`, `quotes` | `status`, `legacyStatus`, `statusHistory` (batches of 400) |
| Firestore rules/indexes | `firebase deploy --only firestore:rules,firestore:indexes --project sofracom` (DEPLOY.md §6) | n/a | firebase-tools (Java 21+) | gcloud/firebase login | `firestore.rules`, `firestore.indexes.json` | Production rules and indexes |
| Website deploy | Push to GitHub, then Vercel builds (`vercel.json` only sets `maxDuration: 10` for `pages/api/**`) | n/a | Next.js 16 on Vercel | GitHub + Vercel accounts | repo | Live site. Catalog, category, product, search and gallery pages are SSG (`getStaticProps`, `fallback: false`): `pages/products/[categorySlug]/[productId].js:26`, `.../index.js:157`, `pages/gallery/index.js:106` |
| Staff phone app | APK sideloaded (DEPLOY.md §3) | n/a | Flutter, `../../IdeaProjects/sofracom_admin_pp` | Device enrolment (custom token) | `orders`, `quotes` (live snapshots) | `PATCH /api/admin/{orders,quotes}` (website API) |
| Manual console work | Firebase console, GCP IAM, Vercel env, `gcloud firestore export` | n/a | web consoles + CLI | owner accounts | n/a | rules backups, keys, env vars, backups (DEPLOY.md §1, 5, 6a) |

There are no upload/deploy scripts besides these. Images and datasheets reach the live site only by being committed to `public/assets/**` and deployed by Vercel. There is no image processing: `public/assets/products` is **391 MB / 289 files, 197 of them over 500 KB** (AGENTS.md asks for under 500 KB). **74 files under products/datasheets/categories aren't referenced by `products.json`**. `assets/products/placeholder.png` and `assets/categories/placeholder.png`, used as defaults for new items (app.js:439, 445, 479), **don't exist**, so every new product shows a broken image (`admin-catalog-product-new-unsaved-1440-en.png`).

Git history: **303 commits** are titled "Update products via admin tool (ISO date)". The latest is `677981f` from 2026-10-02.

### B1.2 Product admin: features and screens

| Feature | Screen / element | Code | Screenshot |
|---|---|---|---|
| Header: title, "Saving will commit and push automatically", links | Navy header. Buttons: "Orders, reviews & devices →", **Reload Data**, **Save & Deploy** | index.html:10-22 | `admin-catalog-default-viewport-1440-en.png` |
| Inline status line ("Products loaded", "Uploading…", errors) | `#status` text, green or red | app.js:45-48 | same; `admin-catalog-load-error-1440-en.png` |
| Category tabs (pill nav). One category shown at a time | `.category-tab` (6 tabs) | app.js:637-655 (`renderNav` is **defined twice**, at 518 and 637; the second one wins) | `admin-catalog-category-small-full-1440-en.png` |
| Category meta: name, slug, image path + drag-and-drop, description, FR/AR name+description (`<details>`) | Category card | index.html:54-133; app.js:669-756 | `admin-catalog-default-viewport-1440-en.png` |
| Add category (local until save; placeholder image is missing) | "Add Category" | app.js:475-489 | `admin-catalog-category-new-unsaved-1440-en.png` |
| Delete category (native `confirm`) | "Delete Category" (red outline) | app.js:491-502 | n/a (native dialog; dismissed) |
| Product card: title, brand, usage tags (CSV), price (`step=1`, though **320 prices have decimals**), stock (`in/on-order/out`), description, images (one path per line + drag-and-drop + preview grid), datasheet path + PDF drop, variants (label, price, stock, Remove), FR/AR title+description | Product card, 4-column grid | index.html:135-267; app.js:758-988 | `admin-catalog-product-editor-1440-en.png`, `admin-catalog-product-variants-1440-en.png`, `admin-catalog-product-translations-ar-1440-en.png` |
| Hide/Show details per product | "Hide details" pill | app.js:883-887 | `admin-catalog-product-collapsed-1440-en.png` |
| Add product (new `p_` id generated client-side, re-checked by the server) | "Add Product" | app.js:428-463; server.js:469 | `admin-catalog-product-new-unsaved-1440-en.png` |
| Delete product (native `confirm`) | "Delete" | app.js:465-473 | dialog text logged: `Delete "Jotun SeaForce Active 2.5L Black / Noir"?` |
| Add / remove variant | "Add variant" / "Remove" | app.js:540-623 | `admin-catalog-variant-added-unsaved-1440-en.png` |
| Upload images / PDF (drop or click, 8 MB image / 12 MB PDF) | Dashed dropzones, `dragover` state | app.js:122-256; server.js:266-387 | `admin-catalog-dropzone-dragover-1440-en.png` |
| Save & Deploy (button **or Cmd/Ctrl+S**) → write JSON → commit → push | header button | app.js:1020-1067; server.js:464-485 | not exercised (forbidden) |
| Jump to top / bottom | floating ↑ ↓ buttons | index.html:37-52 | visible in every catalog shot |
| **Not editable in the UI:** variant translations (`translations.{fr,ar}.variants`; 40 products have FR variant translations; kept on save but can't be edited), `usage` translations, category order, product order and moving a product between categories, `legacyId`. There is also no search or filter across 167 products (Hardware Tools alone has 88, all expanded on one page) | n/a | n/a | n/a |

### B1.3 /ops: features and screens

| Tab | Feature | Code | Screenshots |
|---|---|---|---|
| (all) | Sticky target banner: red `PRODUCTION · <project> — changes affect real customers`, green `EMULATOR · demo-sofracom — local test data`, grey `Firebase not available: …`. Tab title prefixed `🔴 PROD`/`🟢 EMU` | ops.js:51-67, ops.css:11-32 | `admin-ops-orders-list-1440-en.png`, `admin-ops-orders-error-banner-unknown-1440-en.png` |
| Orders | Table: ref/date, customer (name, phone, email, "has account"), total + `<details>` (address, notes, lines, status history), status badge, inline editor (select + note + **Update**) per row. Filter by status, Refresh | ops.js:70-136 | `admin-ops-orders-list-…`, `…-details-open-…`, `…-status-editing-…`, `…-status-updated-toast-…`, `…-status-unchanged-error-…` (raw server message "Status is unchanged" in the red toast), `…-filter-confirmed-…`, `…-filter-empty-…` ("Nothing to show.") |
| Quotes | Same table: subject + details (`white-space:pre-line`) | same | `admin-ops-quotes-list-…`, `admin-ops-quotes-status-updated-toast-…` |
| Reviews | Table: date, product title (falls back to the raw product id), name + stars + comment, Published/Hidden badge, **Hide** (red) / **Unhide**. Filter All/Published/Hidden | ops.js:139-181 | `admin-ops-reviews-list-…`, `…-hidden-toast-…` ("Review updated; product rating recalculated"), `…-filter-hidden-…` |
| Customers | Search by phone (any format), email, or name prefix. With an empty query: latest users. Table + **Open** | ops.js:184-210 | `admin-ops-customers-list-…`, `…-search-empty-…` ("No customer found."), `…-search-phone-…`, `…-search-name-nomatch-…` |
| Customer detail | Name, sign-in type, phone/email/verified, created/last sign-in. **Set temporary password** → inline warning confirm → password shown once. Orders table, quotes list | ops.js:212-257 | `admin-ops-customers-detail-…`, `…-detail-orders-…`, `…-temppw-confirm-…`, `…-temppw-shown-…` |
| Devices | **Add device** → 6-digit code + `Expires in mm:ss` countdown (1 s), polling every 5 s → "Code used: the device is enrolled." / "burned" / "expired". Enrolled devices table (name, enrolled, last seen, Active/Revoked) → **Revoke** → inline "Yes, revoke / Cancel" | ops.js:260-348 | `admin-ops-devices-empty-…`, `…-code-issued-…`, `…-code-used-…`, `…-revoke-confirm-…`, `…-revoked-toast-…` |

Limits: `listForStaff` reads only the **latest 100** orders/quotes and filters by status in memory (lib/server/statusUpdates.js:18-30), so older orders never appear and there is no paging. Reviews are capped at 150 (reviewModeration.js:60-67). There is no search by order ref or phone in Orders/Quotes.

### B1.4 Gallery admin: features and screens

| Feature | Code | Screenshot |
|---|---|---|
| Header "Gallery Admin … Saving commits and pushes automatically", Reload Data, Save & Deploy (no link to the other tools; no keyboard save) | index.html:10-22 | `admin-gallery-default-1440-en.png` |
| Entry card: title, type (image/video), source path or video link, date, tags (CSV), description, preview (`<img>` or an "Open video" link on a navy block), image dropzone (10 MB) | index.html:34-84; app.js:162-236 | same, `admin-gallery-dropzone-dragover-1440-en.png` |
| Add entry (prepended), move up/down, **Delete (no confirm)** | app.js:215-231, 295-298 | `admin-gallery-entry-new-unsaved-1440-en.png` |
| Load error state | app.js:238-255 | `admin-gallery-load-error-1440-en.png` |
| **Missing:** translations (gallery copy is English-only although the site is en/fr/ar), validation of YouTube links. The "Delete" label overflows its button (visible in the default shot) | n/a | n/a |

### B1.5 Shared vs duplicated code

| Concern | Website | Admin tools | Verdict |
|---|---|---|---|
| Firestore writes (status, reviews, devices, users) | `lib/server/{statusUpdates,reviewModeration,devices,adminUsers}.js` | `ops-api.mjs` imports the same modules | **Shared** (good) |
| Product id generation | `lib/productIds.js` (`ensureProductIds`, `slugify`, `computeLegacyId`) | server.js:7 uses it. app.js:428-432 **re-implements** `generateProductId` | partly duplicated |
| Stock states and normalization | `lib/products.js:9-14`, `lib/stock.js` (labels) | app.js:3-11, hard-coded `<option>`s twice (index.html:167-171, app.js:563-567) | duplicated |
| Status list, labels, tones | `lib/status.js` + `lib/i18n/*` `status.*` keys + `components/account/Status.js` tones | ops.js:11-23 hard-codes `STATUSES`, `LABELS`, `TONE`. Flutter `statuses.dart` is a third copy | **triplicated** (labels match today; tones differ, see C) |
| `shortId`, TND money format | `lib/status.js:66`, `lib/constants.js:5` | ops.js:27, 29 | duplicated |
| Error messages | `errors.<code>` i18n (`lib/apiClient.js`) | ops shows raw English server text | not reused |
| `.env` loader, git commit/push, upload handler, MIME map, static server, CORS | n/a | product-admin/server.js and gallery-admin/server.js: ~250 identical lines | **copy-paste fork** |
| CSS | `styles/globals.css`, `styles/account.css` (`--deep-navy`, `--sea`, `--sky`, `--accent` tokens), Tailwind 2 CDN | 3 standalone sheets with hard-coded hex values and no variables | duplicated palette, no tokens |
| Catalog normalization | `lib/products.js` | app.js `ensureStateShape` (291-346) | duplicated logic |

---

## B2. Workflows today

Counts: **steps** are discrete user actions; **tools** are distinct apps/windows; **commands** are terminal commands.

| # | Workflow | Steps (today) | Steps | Tools | Commands | Pain points |
|---|---|---|---|---|---|---|
| 1 | **Add a product with variants, photos and a datasheet** | 1 `git pull` (CLAUDE.md asks for this) · 2 `npm run admin` · 3 open :5173 · 4 pick the category tab · 5 Add Product (scrolls to the bottom of the category; 88 cards in Hardware Tools) · 6 type title, brand, usage CSV, price, stock, description · 7 delete the `placeholder.png` line in Images · 8 drop each photo (each is `git add`ed immediately) · 9 drop the PDF · 10 Add variant × n (label, price, stock) · 11 open FR/AR, type the translations · 12 Save & Deploy · 13 wait for push · 14 wait for the Vercel build · 15 check the live page | ~15 + 2/photo + 3/variant | terminal, admin UI, file manager, Vercel/live site | 2 | Default image is a missing file. Price field `step=1` vs decimal prices. Variant price/label inputs have no visible labels (placeholders only). Variant translations can't be edited. No image resizing (8 MB allowed). Uploads are staged even if you never save, so they leak into the next unrelated commit. No search. No unsaved-changes warning. Product order can't be chosen |
| 2 | **Edit a price / stock status** | pull · start tool · find the category · scroll or Cmd+F through the cards · change the field (product-level stock vs per-variant stock are separate) · Save & Deploy · wait for the build | ~7 | terminal, admin UI, browser | 2 | **A full redeploy for a one-field change** (SSG `fallback:false`). The product-level vs variant-level stock relationship is unclear (a new variant inherits the product stock, then they diverge). Cmd+S pushes immediately |
| 3 | **Add a category** | start tool · Add Category · type name, **slug by hand** (default `new-category`; not slugified from the name) · image · description · FR/AR · Save | ~8 | terminal, admin UI | 1-2 | Slug collisions aren't checked. Placeholder image missing. Category order = array order, which can't be changed. A new category with 0 products still gets a static page |
| 4 | **Add a gallery entry** | pull · `npm run gallery-admin` · :5174 · Add Entry · title/type/src or drop an image/date/tags/description · Save & Deploy · wait for the build | ~8 | terminal, gallery UI | 2 | A second server and port. No FR/AR. Delete has no confirm. Videos only show a link preview |
| 5 | **Publish changes to the live site** | Save & Deploy → `git add products.json` → `git commit` (**everything staged**) → `git push` of the **current branch** with the token in `.env` → Vercel builds that branch | 1 click + build wait | admin UI, Vercel | 0 | Only reaches production when the checkout is on `main`. On `redesign` (current) it makes a preview deploy, and the button still says "Deploy". **Right now the index has `SOFRACOM Website Overview.md` staged, so a save would commit it too.** A diverged remote makes the push fail after the local commit has been made. A missing token gives "committed but not pushed". No build status feedback. No preview before publishing. Rollback = `git revert` + push, by hand |
| 6 | **Process a new order end to end** | 1 customer checks out → `orders` doc `pending` + FCM push to topic `sofracom-orders` · 2 phone snackbar / notification · 3 staff opens the app → Orders card → "Update status" → dialog → Confirmed (+ note) → Save · 4 repeat for Preparing → Out for delivery → Delivered (each one dialog) · 5 customer sees the timeline in `/account/orders/<id>`; Delivered unlocks reviews. Alternative: /ops row select + Update | 4 status changes × 3 taps ≈ 12 taps | phone app (or /ops) | 0 | No order detail screen in the app; `customer_notes` isn't shown. No ref `#XXXX` in the app (customers see it). Notifications only work if the FCM topic subscription succeeded. /ops shows only the latest 100 orders. Changing status in /ops gives no confirmation for `cancelled` |
| 7 | **Handle a quote** | push notification → app Quotes tab (no filter) → read subject/details → Update status Received → In review → Quote sent (the quote itself is sent outside the system: phone/email) → Accepted/Declined → Completed | ~5 status changes | app or /ops + email/phone | 0 | The quote amount and the reply aren't stored. No reply channel. No quote filter in the app |
| 8 | **Hide a review** | `npm run admin` (check the red banner) → /ops → Reviews → find it (no search; up to 150 rows) → Hide | 4 | terminal, /ops | 1 | Not possible from the phone. No confirm (reversible). No link to the product page |
| 9 | **Enrol / revoke a phone** | `npm run admin` → /ops → Devices → Add device → read the 6-digit code to the person with the phone → they type the code + device name → the tool polls "Code used". Revoke: Devices → Revoke → Yes, revoke | 6 / 3 | terminal, /ops, phone | 1 | Needs the laptop and the phone together within 15 min. "Generate a new code" silently invalidates the previous one |
| 10 | **Customer forgot their password** | *Email account:* the customer uses "Forgot password?" on the site (Firebase email); staff aren't involved. *Phone account:* the site tells them to contact the shop (`auth.resetPhoneBody`) → staff `npm run admin` → /ops → Customers → search by phone → Open → Set temporary password → Yes → read the 10-character password aloud → the customer signs in and must change it | 7 (phone) | terminal, /ops, phone call | 1 | Identity check is up to the staff member. Name search is broken in the emulator because seeded users have no `nameLower` (production profiles created after the migration have it; older ones only get it when the profile is touched, users.js:47). The temporary password alphabet already leaves out 0/O/1/l/I (adminUsers.js:110-111), but mixed case is still hard to read aloud ("jvtVw4bZFz" in `admin-ops-customers-temppw-shown-1440-en.png`) |

Cross-cutting: the owner has to remember **3 npm scripts, 2 ports, and which mode (prod/emulated) applies to which page**. The catalog and gallery always act on git/live whatever the mode.

---

## B3. Admin UI state

### B3.1 Visual consistency

| Aspect | product-admin `styles.css` | ops `ops.css` | gallery `styles.css` | Website |
|---|---|---|---|---|
| Font | `'Inter', system-ui…` declared, **never loaded** (no Google Fonts link) → falls back to the system font | same | same | Inter loaded from Google Fonts |
| Page bg | `#f5f7fb` | `#f5f7fb` | `#eef2fb` + gradient `#f8fafc → #d9e4f8` | `#F8FAFC` |
| Text | `#0b1f3a` | `#0b1f3a` | `#0b2050` | `#0F172A` |
| Header | `#0b2050` navy | `#0b2050` | `#0b2050` | `#0B2050` |
| Primary button | **cyan `#24b4ff`** ("Save & Deploy") | **navy `#0b2050`** ("Update", "Add device") | cyan `#24b4ff` | navy pill |
| Secondary button | white, navy 1px border, radius 0.5rem | white pill (999px) | white, radius 0.6rem | pill |
| Danger | outline `#d72638` | `.btn-danger` `#b91c1c` | outline `#d72638` | `#D72638` |
| Card radius | 1.25rem | 1rem | 1.25rem | 16-24px |
| Status feedback | inline `#status` text line (green/red) at top of page | bottom-right toast (3.5 s) + inline `.notice` boxes | inline `#status` line | toasts/notices in account.css |
| Tabs | category pill nav in a tinted track | pill buttons | none | n/a |
| Tables | none (cards only) | uppercase grey `th` tables | none | n/a |
| CSS variables | none | none | none | `:root` tokens in globals/account.css |

The three tools look like siblings (same navy header) but don't share a stylesheet, tokens, button shapes, primary colour or feedback pattern. ops badges reuse the website's tones (`#0f7a2e`, `#b91c1c`, `#c2410c` on `#fff7ed`, `#e6f0ff`/`#0f3d72`), so ops and the website account pages agree, but not with the phone app (section C).

### B3.2 Missing feedback

| Where | Gap | Ref |
|---|---|---|
| Catalog Save | Only a text line (`Saving changes and pushing to origin…` → the git message). No progress, no list of what changed, no link to the commit or the Vercel build, no "is it live yet". If the commit succeeded but the push failed, the UI only shows the error string; the local commit is left behind | app.js:1020-1056; server.js:224-257 |
| Catalog edits | **No dirty/unsaved indicator and no `beforeunload` guard.** Reload Data and closing the tab lose edits silently | app.js:1059 |
| Catalog validation | None: empty title, duplicate slug, negative or decimal price (`step=1`), missing image file and broken paths are all accepted. Variant label is injected unescaped into `innerHTML` (a quote in a label breaks the field) | app.js:556-559 |
| Uploads | Only a status line; no per-file progress; the client-side 8 MB check for images exists, the gallery client has none | app.js:72-97; gallery app.js:95-115 |
| Ops lists | Loading is "Loading…" text only. Errors appear inline (good). Server messages are English/raw (`Status is unchanged`), not the friendly `errors.*` copy | ops.js:112-116 |
| Ops toast | Bottom-right, covers the last row's Update button (`admin-ops-orders-status-unchanged-error-1440-en.png`). It disappears after 3.5 s and has no persistent success state on the row | ops.css:236-259 |
| Gallery | Same as catalog plus delete without confirm; "Delete" text overflows its button | gallery app.js:215 |

### B3.3 Dangerous actions without (adequate) confirmation

| Action | Effect | Confirmation | file:line |
|---|---|---|---|
| **Cmd/Ctrl+S** in the catalog | write + commit (whole index) + push → deploy | **none**; a habitual keystroke deploys | tools/product-admin/app.js:1062-1067 |
| **Save & Deploy** (catalog) | same | none, no diff preview | app.js:1058, 1020 |
| **Save & Deploy** (gallery) | same for gallery | none | tools/gallery-admin/app.js:301, 257 |
| Commit scope | `git commit -m` with no pathspec commits **everything staged** (unrelated work, stray uploads) | none | product-admin/server.js:219; gallery-admin/server.js:167 |
| Push target | pushes the **currently checked-out branch** (feature branches included) | none; the label says "Deploy" | product-admin/server.js:244-254; gallery-admin/server.js:188-194 |
| Upload | file written and `git add`ed before any save | none | product-admin/server.js:371-381; gallery-admin/server.js:298-312 |
| Delete category | removes N products → their ids disappear (reviews/ratings orphaned, product URLs 404 with no redirect) | native `confirm` with no product count and no mention of reviews | app.js:491-502 |
| Delete product | same for one product | native `confirm` | app.js:465-473 |
| Remove variant | changes prices/ordered variant indexes (`variantIndex` in orders) | none | app.js:596-602 |
| Reload Data | discards all unsaved edits | none | app.js:1059 |
| Gallery delete entry | removes the entry | **none** | gallery-admin/app.js:215-218 |
| Ops status Update to `cancelled`/`delivered` | customer-visible. Delivered unlocks reviews | none (inline per row; easy to hit the wrong row's button) | ops.js:103-118 |
| Ops Hide review | product rating recalculated | none (reversible) | ops.js:165-176 |
| Ops "Generate a new code" | invalidates the outstanding code | none (reversible) | ops.js:275-281 |
| Cross-site requests | `Access-Control-Allow-Origin: *` + permissive OPTIONS lets **any web page open in the same browser POST to `127.0.0.1:5173/api/products`** (overwrite the catalog + push) or to `/api/ops/*` (status changes, revokes, password resets, blind). No Host/Origin check (DNS rebinding) | none | product-admin/server.js:91-95, 431-438; gallery-admin/server.js:67-73, 362-369 |
| Good: Revoke device, Set temporary password | inline two-step confirm | yes | ops.js:236-251, 330-342 |

### B3.4 PRODUCTION vs EMULATOR clarity

| Surface | Indicator | Assessment |
|---|---|---|
| `/ops` | Sticky full-width banner (red PRODUCTION / green EMULATOR / grey unknown), title emoji, console line at startup | Clear. The grey "unknown" state still allows actions |
| Catalog page `/` (same server!) | **None.** The banner isn't shown there | The process can run in emulator mode while the catalog still **pushes to the real git remote → live site**. "EMULATOR" in `/ops` may give a false sense of safety one click away ("← Product catalog") |
| Gallery admin | **None; it has no test mode at all** | Every save is real (git push) |
| Scripts | `migrate-statuses` prints the target. `seed-emulator` refuses production. `assign-product-ids` writes the real `products.json` silently | mixed |

### B3.5 `.env` usage

`.env` (git-ignored; present locally) holds `PRODUCT_ADMIN_GITHUB_TOKEN`, `PRODUCT_ADMIN_GITHUB_USERNAME`, `NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID}` (only key names inspected). Both servers parse it with a hand-written loader (product-admin/server.js:17-34, gallery-admin/server.js:35-50) that never overrides existing env vars. The GitHub token is put into the push URL (`https://user:token@…`, server.js:182-189). It isn't persisted to the remote config, but it is visible in the process list during the push. Firebase Admin credentials come from `lib/firebase/admin.js` (env → base64 → path → the git-ignored `sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json` in the repo root; DEPLOY.md §1 says this key leaked and must be rotated). `next.config.js:46-50` bundles that exact filename into API functions (`outputFileTracingIncludes`). That's out of scope here, but it ties the admin key and the website build together.

---

## B4. Merge analysis (analysis only)

### B4.1 Draft IA for one local admin app

```
SOFRACOM Admin (local only)        [env pill: PRODUCTION · sofracom | EMULATOR]  [git: branch · ahead/behind · unpublished changes]
├─ Today (dashboard): new orders, quotes awaiting reply, hidden/new reviews, unpublished catalog changes, last deploy
├─ Orders              list (search ref/phone/name, status filter, paging) → order detail (lines, address, notes, timeline, status change + note)
├─ Quotes              list → quote detail (details, timeline, status change + note)
├─ Catalog
│   ├─ Products        searchable table across categories (stock, price, missing translations/images) → product editor (general, images, datasheet, variants, translations incl. variants, preview)
│   ├─ Categories      list (reorder) → category editor (name, slug, image, description, translations)
│   └─ Media library   products/categories/datasheets/gallery files, sizes, unused files
├─ Gallery             entries (reorder) → entry editor (+ translations)
├─ Publish             diff of catalog/gallery JSON + new files → commit message → push to main → Vercel build status → rollback (revert)
├─ Reviews             list (search, product link) → hide/unhide
├─ Customers           search → detail (orders, quotes, temporary password)
├─ Staff phones        add device (code + countdown) · enrolled list · revoke · device events
└─ Settings / About    Firebase target, git remote + token status, Node/Java checks, links to DEPLOY.md steps
```

Every B1 feature maps to this tree: catalog CRUD, uploads, translations, save/push → Catalog + Publish; gallery CRUD/reorder/upload → Gallery + Publish; ops tabs → Orders, Quotes, Reviews, Customers, Staff phones; target banner → global env pill.

### B4.2 Data-layer differences to reconcile

| Dimension | Catalog / gallery | Ops data |
|---|---|---|
| Store | JSON files in git + binary files in `public/assets` | Firestore + Firebase Auth |
| Write unit | whole file, rewritten on every save | single document, transactional |
| Concurrency | last write wins locally; git push fails on divergence | Firestore transactions (`statusHistory`, `productStats`) |
| Publish latency | commit → push → Vercel build (minutes) | immediate |
| History / rollback | git log/revert (303 auto-commits, no meaningful messages) | `statusHistory`, `legacyStatus`, events; no general undo |
| Env modes | none (always real git) | emulator vs production |
| Identity of editor | git author of the machine | `local-admin:<os user>` |
| Keys | `p_xxxxxxxx` ids referenced by Firestore (`reviews/{productId}_{uid}`, `productStats/{productId}`, `orders.productIds`) | n/a |
| Validation | none (client) / shape-only (server) | `lib/server/validate.js`, HttpError codes |

A merged app needs one save model per domain: "Draft → Publish" for git-backed content, "Apply now" for Firestore. It also needs a visible distinction between the two, plus an emulator-equivalent for content (e.g. a "dry run / local only, don't push" mode).

### B4.3 Catalog: JSON-in-git vs Firestore

| Criterion | Stay JSON in git | Move to Firestore (+ Storage for files) |
|---|---|---|
| Deploys / static pages | Needs a rebuild per change (SSG `fallback:false`); fast pages, zero reads | Needs ISR/on-demand revalidation (`res.revalidate`) or client fetch; adds a revalidate API and secret; pages stay static between edits |
| Speed of an edit going live | minutes (build) | seconds (with on-demand revalidation) |
| History / rollback | Free and complete (git), but today's auto-commit messages are useless | Must be built (version docs / audit log); Firestore PITR on Blaze |
| Images & datasheets | 391 MB in the repo now, growing every clone/deploy; served by Vercel CDN; no cost per GB at this scale on Hobby/Pro limits | Firebase Storage: ~0.4 GB stored is near-free, egress billed (~$0.12/GB beyond free tier) and needs a resizing pipeline; moves the bulk out of git |
| Reviews keyed by `id` | Works (stable ids already) | Works (doc id = `p_…`); migration must keep ids |
| Offline / resilience | Site never depends on DB for catalog; admin edits work offline until push | Catalog availability tied to Firestore (mitigated by ISR cache) |
| Edits by non-developers | Git token on the laptop; branch/index pitfalls (B3.3) | No git; rules + Admin SDK; same local-only tool |
| Search / filtering in admin | Must load the whole 167-product file (fine at this size) | Queries/indexes |
| Cost / complexity for a 167-product shop | lowest | moderate (rules, indexes, migration, revalidation, Storage) |
| Server functions bundle | `lib/products.js` imports JSON into functions (priceCart) | priceCart would read Firestore (latency, quota) or a cached copy |

For this shop, the evidence favours **keeping JSON-in-git for now and fixing the pipeline**. That means path-limited commits, pushing to `main` explicitly, meaningful commit messages, image optimisation and removing orphans, plus a publish screen with build status. Moving files (not the JSON) out of git, to Storage or Vercel Blob, is the separable change with the biggest payoff (391 MB). Firestore + on-demand ISR is the option to choose if near-instant price/stock edits become a business need. A middle path is possible too: stock and price overrides in Firestore read client-side or via ISR, with the rest of the content in git. This is the auditor's reading; the decision belongs to the owner.

### B4.4 Technical options for one local-only admin app

| Option | How | Pros | Cons / risks |
|---|---|---|---|
| A. Next.js route group in the website (`pages/admin-local/*` or `app/(admin)`) gated by env, excluded from Vercel builds | `pageExtensions`/env switch or a build-time `ignore`, run with `next dev` locally | Direct reuse of React components, `lib/status.js`, i18n, CSS tokens, `lib/server/*`; one dev server | Highest risk of **accidentally shipping admin code/routes** to Vercel (DEPLOY.md requires `/admin` to 404); Admin SDK + git/fs code in the website bundle graph; build exclusions are easy to break; dev server against PRODUCTION Firebase is what `npm run dev` already does |
| B. Separate local app in `tools/admin` (Vite + React, or a second Next app) with a small Node API (current `server.js` style) | own `package.json`/scripts, imports `../../lib/*` | Clear deploy boundary (never in the Vercel build); can reuse `lib/server/*` (already ESM-safe), `lib/status.js`, i18n strings, and copy CSS tokens; modern components | Two build toolchains; must keep shared modules free of catalog JSON imports (already a rule); needs real auth/Origin checks even on loopback |
| C. Keep vanilla `http` server + vanilla JS, just merge the three UIs | minimal change | No new deps; fastest | Keeps duplication (status labels, CSS); hard to scale the catalog editor (167 products in one DOM) |
| D. Electron / Tauri desktop app | package B as a desktop app | Real app icon, no port, OS-level file dialogs, can hold the git token/service key in the keychain | Packaging/signing/updates for a one-person shop; Electron size; Tauri needs Rust toolchain; still needs Node for Admin SDK (sidecar) |

Constraints for any option: bind to loopback; **check `Origin`/`Host`** (or use a per-session token) to close the CSRF/DNS-rebinding hole; show the env pill on every page; and give content publishing its own explicit target (`main`), separate from the Firebase target.

---

## C. Staff mobile app (Flutter, `sofracom_admin_pp/lib`), light pass

### C1. Screens

| Screen | File | Components | Wording (exact) |
|---|---|---|---|
| Boot | main.dart:64-98 | `CircularProgressIndicator`; raw error text on failure | (error `toString()`) |
| Enrolment | enroll_screen.dart:57-143 | `Icons.phonelink_lock` (48, primary), title, grey help text, revoked banner (amber `#B45309`), code field (digits, 28 pt, letter-spacing 10), device-name field, error banner (`#DC2626`), `FilledButton` with spinner | "Set up this phone" · "On the office computer, open the SOFRACOM admin tool (Operations → Devices) and click "Add device". Enter the 6-digit code here within 15 minutes. You only do this once." · "Enrolment code" · "Device name" / "e.g. Shop counter phone" · "Enrol this phone" · "This phone was removed from the staff devices. Enrol it again to continue." · errors "That code is invalid or has expired. Add the device again in the admin tool to get a new code." / "No connection to … Check the internet connection." / "Give this phone a name (2+ characters)" / "Enter the 6-digit code" |
| Home shell | main.dart:166-226 | AppBar "SOFRACOM Admin" (gradient `#0B2050 → #101F47`), page gradient `#FDFDFF → #EBF3FF`, floating rounded (28) bottom nav with gradient `#0B2050 → #2A3B9F → #0B2050`, 2 items | "Orders" (`Icons.shopping_bag`), "Quotes" (`Icons.comment_bank`) |
| Orders tab | main.dart:228-310, 500-706 | `_PageHeader` (52 px gradient icon tile `#0B2050 → #25B4FF`), `_FilterPanel` (FilterChips, selected cyan `#25B4FF` @20%), card list (white, radius 20, shadow `#0B2050` @10%), avatar initial tinted by status colour, `_StatusBadge` (dot + label on colour @15%), contact rows (phone/email/address icons), item rows (avatar, title, variant, price × qty), Total, `_StatusSelector` (outlined "Update status") | "Orders" · "Track and prioritize recent client requests." · "Filter by status" · "All orders" · "No orders yet." · "No orders match the selected filter." · "Unknown customer" · "No contact details recorded." · "No items listed yet." · "Total" · "Qty: n" |
| Quotes tab | main.dart:948-1086 | Header, card list (**no filter**), name + badge, contact, subject, details, date, "Update status" | "Quotes" · "Stay on top of incoming project requests." · "No quotes yet." · "Guest" · "Project request" · "No details provided." · "No contact info provided." |
| Change status dialog | main.dart:837-901 | `AlertDialog` with `RadioListTile`s (coloured dot icon per status), note field (500), Cancel / Save (disabled when unchanged and no note) | "Change status" · "Note for the customer (optional)" · snackbars "Marked {label}." / "Unable to update status: …" · button "Updating..." |
| Stream error | main.dart:905-946 | `Icons.cloud_off` red, title, caption, "Retry" | "This phone is not allowed to read {orders}." · "**It may have been removed in /admin → Devices.**" (stale: there is no web /admin any more; see also comments main.dart:179, enroll_screen.dart:8) · "Could not load {orders}." |
| Notifications | notification_service.dart | FCM topics `sofracom-orders`, `sofracom-quotes`; foreground SnackBar | "New notification" / "New order received" · "Notification opened" |

Notable data differences: the app reads `customer_email` only. It doesn't show `customer_notes`, the `#XXXXXXXX` short ref (customers and /ops use it), or the status history. Orders filter client-side over all docs; Quotes have no filter.

### C2. Status palette across the three surfaces

Website = `components/account/Status.js` tones + `styles/account.css:501-530` (text colour / background). ops = `ops.js:20-23` + `ops.css:172-195`. Staff app = `statuses.dart:18-34` (one solid colour, used as text/dot plus a 15% tint background).

| Status | Kind | Label (all 3) | Website tone → colours | ops tone → colours | Staff app colour |
|---|---|---|---|---|---|
| pending | order | Pending | waiting → `#c2410c` on `#fff7ed` | badge-wait → `#c2410c` on `#fff7ed` | `#F59E0B` amber |
| confirmed | order | Confirmed | default → `#0f3d72` on `#e6f0ff` | default → `#0f3d72` on `#e6f0ff` | `#2563EB` blue |
| preparing | order | Preparing | default → `#0f3d72` on `#e6f0ff` | default | `#0EA5E9` sky |
| out_for_delivery | order | Out for delivery | default → `#0f3d72` on `#e6f0ff` | default | `#7C3AED` violet |
| delivered | order | Delivered | done → `#0f7a2e` on `rgba(15,122,46,.10)` | badge-good → `#0f7a2e` on `rgba(15,122,46,.12)` | `#16A34A` green |
| cancelled | order | Cancelled | stopped → `#b91c1c` on `rgba(215,38,56,.08)` | badge-bad → `#b91c1c` on `rgba(215,38,56,.10)` | `#DC2626` red |
| received | quote | Received | waiting → `#c2410c` on `#fff7ed` | badge-wait | `#F59E0B` amber |
| in_review | quote | In review | default → `#0f3d72` on `#e6f0ff` | default | `#2563EB` blue |
| quoted | quote | Quote sent | default → `#0f3d72` on `#e6f0ff` | default | `#0EA5E9` sky |
| accepted | quote | Accepted | **done** → green `#0f7a2e` | **badge-good** → green | **`#7C3AED` violet** |
| declined | quote | Declined | stopped → `#b91c1c` | badge-bad | `#DC2626` red |
| completed | quote | Completed | done → `#0f7a2e` | badge-good | `#16A34A` green |
| (review) published / hidden | review | Published / Hidden | n/a | badge-good / badge-bad | n/a |
| (device) active / revoked | device | Active / Revoked | n/a | badge-good / badge-bad | n/a |

What should stay consistent: (1) the English labels already match across all three and the website i18n (fr/ar exist only on the website); (2) the semantic grouping waiting / in progress / done / stopped is shared by website and ops but **the app uses six distinct hues** and paints `accepted` violet where the others paint it green; (3) the brand primaries agree (`#0B2050` everywhere; the app's cyan is `#25B4FF`, the website/admin's `#24B4FF`); (4) the status source of truth is `lib/status.js` but labels/tones are copied in `ops.js` and `statuses.dart`; (5) legacy-status normalization tables are identical in `lib/status.js:28-42` and `statuses.dart:36-50`.

---

## Keep (should survive the redesign)

| What | Why |
|---|---|
| Brand navy `#0b2050` (+ sea `#0f3d72`, sky `#e6f0ff`, accent cyan `#24b4ff`) | Already shared by the site, all admin tools and the staff app; strong contrast with white (15.7:1). Accent needs a darker variant for text/focus |
| The real Monastir photography (hero, marina parallax bands) and real product photos | Authentic and local; just needs resizing/responsive delivery |
| Trilingual en/fr/ar with RTL, `t()` + `npm run test:i18n` key parity, logical properties in `account.css` | Rare for a shop this size; the base mechanism is sound, coverage is the gap |
| The `ui-*` account system: `AccountLayout`, `AuthCard`, `AddressFields`, `StatusBadge`/`StatusTimeline`, `Stars`/`StarInput`, `.ui-btn/.ui-field/.ui-alert/.ui-card` | Coherent, accessible-ish, RTL-aware: the best seed for a design system |
| Status model (`lib/status.js`), labels identical on all three surfaces, and the waiting / in progress / done / stopped grouping | Clear for customers and staff |
| Stable product ids + legacy redirects; server-side pricing (`priceCart`); API-only writes; rules + API tests | Solid foundations that a redesign must not break |
| Optional accounts, phone-number sign-in, cart that survives sign-in, `next=` return to where you were | Matches the local customer base |
| Cart drawer opening on add with a live count | Good feedback |
| Delivered order → "Rate your items" → verified-buyer reviews | Trustworthy review flow |
| `/ops`: red/green environment banner, two-step confirm for revoke and temporary password, enrol code with countdown | Patterns to reuse across the merged admin |
| Low JS cost (TBT ≤ 40 ms, first-load JS 141–166 KB gz) and CLS ≈ 0 | Don't lose it with a heavy UI framework |

## Questions for Mohamed

1. **Brand direction.** Keep navy + cyan and Inter, or refresh? `modern_logo.svg` exists but isn't used; is it the new logo, replacing `logo.jpeg`? Which Arabic typeface (e.g. IBM Plex Sans Arabic, Noto Kufi, Cairo) should pair with the Latin font?
2. **What is the site mainly for:** online orders (shop-first), service leads (quote-first), or both equally? That decides the home page, the nav order and where "Request a quote" lives (its own page, from the cart, from a product).
3. **Home page.** Which sections stay? Hero, Monastir band, About, Brands, 6 Services + process timeline, Haul-out band, Testimonials, FAQ, Contact/quote. Are the testimonials real? Should home show featured categories and products?
4. **Catalog storage.** Stay JSON-in-git with a fixed publish flow, or move to Firestore for instant price/stock edits? How often do prices and stock change in practice (daily, weekly)?
5. **Images.** OK to move product photos out of git (Vercel Blob or Firebase Storage) with automatic resizing? OK to delete the 74 unreferenced files?
6. **Order tracking for guests.** Show an order number and allow lookup by ref + phone? Send email/SMS confirmations (SMS has a cost)? Should guest orders link to an account by phone as well as verified email?
7. **Languages.** Put the language in the URL (`/fr/…`, `/ar/…`) for SEO and sharing? Which is the default? Who will write the 72 missing Arabic titles, the usage tags and the variant labels?
8. **Prices.** Show "from X DT" when variants differ? Should millimes show (3 decimals; 320 prices have decimals)? Is the delivery fee always a flat 7 DT, and is there a free-delivery threshold?
9. **Admin app.** Who uses it: only you, or staff on the shop laptop too? Is a separate local app in `tools/admin` acceptable (recommended over a route group in the website)? Should "Publish" always push to `main`, with a preview first?
10. **Staff app colours.** Align the phone app to the website's 4-tone grouping, or adopt six distinct status colours everywhere? (`accepted` is violet in the app and green elsewhere.)
11. **Gallery.** Keep it (one entry today)? Does it need translations, and should images and videos open in a lightbox?
12. **Security follow-ups found during the audit.** These aren't redesign work, but are they OK to fix soon? The admin servers' `Access-Control-Allow-Origin: *`; the whole-index commit / current-branch push; rotating the service-account key that DEPLOY.md says leaked.
