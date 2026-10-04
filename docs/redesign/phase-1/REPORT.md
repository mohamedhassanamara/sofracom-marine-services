# Phase 1: foundations

## What changed
- **Tailwind v3.4 via npm/PostCSS** (`tailwind.config.js`, `postcss.config.js`) replaces the 251 KB render-blocking v2 CDN stylesheet (now ~11 KB, purged).
  - Theme = `lib/design/tokens.js` only: navy (brand #0b2050), accent (from #24b4ff, 600+ for text), slate, success/warning/danger/info; 8 font sizes; radii sm/md/lg/xl/full; 3 shadows; one easing + 3 durations; breakpoints sm/md/lg/xl.
  - Off-palette classes no longer exist. A codemod mapped ~230 class tokens (gray→slate, blue→navy, …; 2xl/3xl radii → xl; text-5xl/6xl → 4xl) and physical → logical utilities (ml/mr/pl/pr/left/right/text-left/border-l → ms/me/ps/pe/start/end/text-start/border-s).
  - v3-only classes that did nothing under the CDN now work (product page is two columns again, `border-white/30`, `bg-[…]`).
  - `styles/*.css`: all 211 raw colours, 62 font sizes, 43 radii, 11 shadows and 29 transitions snapped to the tokens via `theme()`; inputs are 16 px (no iOS zoom); remaining left/right → logical properties; the cart drawer now slides from the left in Arabic.
  - Status palette (orders, quotes, stock) defined once in the tokens (`tones` + `statusTone`), all badge pairs ≥ 4.5:1 (tested).
- **Fonts via next/font**: Inter (latin, preloaded) + IBM Plex Sans Arabic (loaded only when Arabic glyphs render). Arabic pages use Plex first. No Google Fonts `<link>`.
- **Motion**: CSS vars `--ease-*`/`--dur-*`; `prefers-reduced-motion` disables parallax, tilt (CSS + JS), float, fades and smooth scrolling. Visible `:focus-visible` ring (accent-600).
- **Images**: `scripts/optimize-images.mjs` (dry run by default, `--apply`, `--delete-unreferenced`, idempotent) + `tools/shared/images.js`.
  - 242 images → WebP at 400/800/1600 px, every file ≤ 200 KB; JSON points at `-800.webp`; originals deleted (git history keeps them).
  - Admin uploads (product + gallery tools) now go through the same pipeline: only the 3 WebP files are written.
  - `lib/data/image-redirects.json` → 308 redirects from every old image path (old orders, saved carts, outside links keep working).
  - `components/ui/ResponsiveImage` (srcset + sizes + lazy, `priority` for the LCP image) used on cards, product, gallery, search, home; thumbnails use the 400 px file.
  - `public/assets` 450 MB → 63 MB (products 391 MB → 43 MB).
- **i18n routing**: `next.config.js` `i18n` (en at `/`, `/fr`, `/ar`). `_document` renders `lang`/`dir` on the server. The language switcher keeps the current page and sets `NEXT_LOCALE` (remembered on the next visit to `/`); the old localStorage choice migrates once. All static pages are generated per locale.
  - Signing in or saving the profile no longer switches the page language (profile language = account preference only; fixes an audit item).
- **SEO**: `components/Seo.js` + `lib/seo.js` on every page: title, description, canonical, hreflang (en/fr/ar/x-default), OpenGraph/Twitter; `noindex` on account/auth/search.
  - JSON-LD: Store (LocalBusiness) on home; Product + Offer/AggregateOffer + AggregateRating (from Firestore at build, refreshed hourly with ISR; skipped without credentials or with `SEO_RATINGS=off`) and BreadcrumbList on product pages; BreadcrumbList on categories.
  - `/sitemap.xml` (528 URLs with alternates) and `/robots.txt` (blocks /api and private pages in every locale). `NEXT_PUBLIC_SITE_URL` overrides the default `https://sofracom-marine-services.vercel.app`.
  - Favicon set from `logo.jpeg` (`scripts/build-icons.mjs`): favicon.ico, apple-touch-icon, 192/512 icons, web manifest.
- Product pages no longer ship the whole category in their props (165 KB → ~10 KB).

## Measured (production build, localhost, before → after)
| Page | Transfer on load | After scrolling the whole page |
|---|---|---|
| Category `/products/hardware-tools`, desktop | 96.3 MB → **1.37 MB** | 2.95 MB |
| Category, mobile 390 (3× DPR) | → **1.11 MB** | 4.1 MB (60+ photos; Phase 3 adds "load more") |
| Home, desktop | 5.8 MB → **1.35 MB** | 1.35 MB |
| Product, desktop | 8.2 MB → **1.06 MB** | 1.06 MB |

Remaining weight on load is mostly JS (~450 KB) and the 77 KB `products.json` the header fetches for search suggestions; the header is rebuilt in Phase 3 with a slim index.

## Tests
`npm test`: 58 unit (new: `seo`, `images`, `tokens` contrast, `i18n-routing`), 19 rules, 49 API: all green.

## Screenshots
`home|category|product|login` × desktop 1440 / mobile 390 × EN / AR. They show the old page designs on the new foundations (pages are rebuilt in Phases 3–4); known leftovers visible: mobile header overlap (Phase 3), mixed English in AR (Phase 5).

## Deleted unreferenced files (74, 88 MB)
Not referenced by `products.json`, `gallery.json` or any code:
- `/assets/categories/bosch.png`
- `/assets/categories/striaform-mhhmd328.jpg`
- `/assets/datasheets/decapant_atilla-mi8v6h8l.pdf`
- `/assets/datasheets/en-gb-mliap29r.pdf`
- `/assets/datasheets/jotun-seaforce.pdf`
- `/assets/datasheets/plas6-tds-en-mj73o7m6.pdf`
- `/assets/datasheets/seaforce-active-gb-mhqigtp2.pdf`
- `/assets/datasheets/tds-735-tankguard-storage-euk-gb-mkcv1pml.pdf`
- `/assets/datasheets/tds-735-tankguard-storage-fra-fr-mkcv1tmy.pdf`
- `/assets/datasheets/trilux_prop_o_drev_eng_a4_20230607-mj0640p3.pdf`
- `/assets/products/1691502620863-mhgkqnod.jpg`
- `/assets/products/20251104_151642-mi4jcu90.jpg`
- `/assets/products/20251104_152315-mi5xejo1.jpg`
- `/assets/products/20251104_152315-mi60y47e.png`
- `/assets/products/20251104_152339-mi5x9chv.jpg`
- `/assets/products/20251104_152339-mi60y8rc.png`
- `/assets/products/20251104_163007-mhkt8n4o.jpg`
- `/assets/products/20251104_163524-mhks2j7m.jpg`
- `/assets/products/20251104_164917-mhktmyb1.jpg`
- `/assets/products/20251104_164929-mhkticul.jpg`
- `/assets/products/20251104_181151-mhku3t7w.png`
- `/assets/products/20251104_181151-mhku46uw.png`
- `/assets/products/20251112_162816-mhxi5hsh.png`
- `/assets/products/20251112_162816-mhxm6qzp.png`
- `/assets/products/20251114_115423-mhyrz0aa.jpg`
- `/assets/products/20251115_160924-mi0fl72f.png`
- `/assets/products/20251115_161208-mi0jwstr.png`
- `/assets/products/20251119_144156-mi64d07x.png`
- `/assets/products/20251119_144324-mi7obzra.png`
- `/assets/products/20251121_134511-mi8v0lvs.png`
- `/assets/products/20251122_173555-miaimv96.png`
- `/assets/products/20251216_173603-mj8uf1hf.png`
- `/assets/products/20260110_150643-mk8f0tic.png`
- `/assets/products/20260110_151419-mk8fm6r1.png`
- `/assets/products/20260110_151425-mk8fk5w4.png`
- `/assets/products/20260110_151425-mk8fm08c.png`
- `/assets/products/20260110_151508-mk8fmslp.png`
- `/assets/products/20260110_151512-mk8foy22.png`
- `/assets/products/20260112_173224-mkcu5i4n.png`
- `/assets/products/20260112_173316-mkcu5amp.png`
- `/assets/products/20260115_142901-mkqv7lgc.png`
- `/assets/products/20260115_143034-mkwsjp8o.png`
- `/assets/products/20260123_133815-mkqvdd4m.png`
- `/assets/products/20260211_175933-mlial9a8.jpg`
- `/assets/products/bosch.png`
- `/assets/products/eurosil-tape-mhyrsewj.jpg`
- `/assets/products/gp-tape-mhyol11t.jpg`
- `/assets/products/img-20251102-wa0035-mhqkjjou.jpg`
- `/assets/products/img-20251102-wa0036-mhqjeamb.jpg`
- `/assets/products/img-20251102-wa0037-mht3ka2d.jpg`
- `/assets/products/img-20251102-wa0039-mhyozp4v.jpg`
- `/assets/products/img-20251102-wa0040-mhsvjyhi-miaj0hw0.png`
- `/assets/products/img-20251102-wa0040-mhsvjyhi.jpg`
- `/assets/products/img-20251102-wa0041-mhyozmf6.jpg`
- `/assets/products/img-20251102-wa0044-mhsvehha.jpg`
- `/assets/products/img-20251102-wa0048-mhqj1nks.jpg`
- `/assets/products/img-20251102-wa0050-mhqkqz6f.jpg`
- `/assets/products/img-20251102-wa0053-mi0dj9o4.jpg`
- `/assets/products/img-20251102-wa0056-mhsxtls9.jpg`
- `/assets/products/img-20251102-wa0057-mhsvepow.jpg`
- `/assets/products/img-20251102-wa0058-mhsw40fp.jpg`
- `/assets/products/img-20251102-wa0061-mi1oy9ze.png`
- `/assets/products/img-20251102-wa0063-mht3sbov.jpg`
- `/assets/products/img-20251102-wa0064-mht4p7yw.jpg`
- `/assets/products/img-20251102-wa0075-mht46qor.jpg`
- `/assets/products/img-20251102-wa0076-mhsup940.jpg`
- `/assets/products/img-20251102-wa0077-mi62yiy1.jpg`
- `/assets/products/img-20251102-wa0078-mhsz9862.jpg`
- `/assets/products/img-20251102-wa0080-mhszkdn9.jpg`
- `/assets/products/img-20251102-wa0088-mhytwnq7.jpg`
- `/assets/products/img-20251102-wa0090-mhszv052.jpg`
- `/assets/products/img-20251102-wa0091-mht0g77i.jpg`
- `/assets/products/screenshot-2025-10-31-at-10.04.41-mhgjxmly.png`
- `/assets/products/screenshot-2025-10-31-at-10.04.41-mhgkrmwy.png`