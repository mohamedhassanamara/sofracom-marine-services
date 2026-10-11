# Visual redesign v2 · Step 1: design lab

> **Images are not in git.** Screenshots and image files named here are kept, git-ignored, in `docs/_images/redesign-v2/step-1/` on the computer that made them (same file names).

Branch `redesign-v2`, created from `redesign`. Not pushed.

**Open the lab:** `npm run dev:emulated`, then go to http://localhost:3000/design-lab (or `/ar/design-lab`).
- The top bar switches the heading font and the language.
- The lab is dev only. In a production build it is a 404, unless `DESIGN_LAB=1` is set.
- It is `noindex` and blocked in `robots.txt`.
- It draws its own chrome: the page opts out of the site header and footer.

## What's in it (screenshots in this folder, `NN-<section>-{desktop,mobile}-{en,ar}.png`)
| # | Section | Notes |
|---|---|---|
| 01 | Header | Default, scrolled (translucent and blurred over the photo, shorter), Shop menu open (category image panel), search open (big input, popular categories, product thumbnails, live results once you type). Phones: menu · logo · search · account · cart. |
| 02 | Hero A, full-bleed | Marina photo edge to edge, with a light shade only behind the text. White primary pill on the photo, outline pill beside it. Trust bar below. |
| 03 | Hero B, split | Text on the start side, photo with rounded corners on the end side. Navy primary pill. |
| 04 | Heading font | Manrope / Plus Jakarta Sans / Inter Tight, side by side. Each shows the headline, a section title, a brand line and a card line. Arabic always uses IBM Plex Sans Arabic. |
| 05 | Product card | 8 real products: in stock, options ("from"), on order, out of stock (no +), no rating, tool, small pack. **The first two ratings are samples.** `05-cards-hover-*` shows the hover state (the + button, the 2nd photo). The last card has the option picker open; on phones it opens as a bottom sheet. A checkbox swaps in the cutout photos. |
| 06 | Category | Antifouling & Coatings with JOTUN active and the Brand popover open: use pills, a sticky toolbar (Brand / Use / Availability / Price · count · sort), chips with "Clear all", a 4/3/2 grid. Below that: the empty state, and the phone bottom sheet with "Show N products". |
| 07 | Product top | Large gallery (click opens a lightbox with prev/next) and a sticky info column: brand, title, rating, price, option chips each with its price, stock dot, a pill quantity control, a big Add to cart, Ask for a quote, and "Delivered to Marina Monastir · 7.000 DT". |
| 08 | Cutouts | The 10 samples, original next to cutout. |

## Design system changes (additive; the live pages look the same as before)
- **Tokens** (`lib/design/tokens.js`):
  - colours `ink` (#111 / muted #6B6B6B), `surface` (#F5F5F3 / strong), `line` (#EAEAEA / strong);
  - type sizes `title-2` 32, `title-1` 40, `display-2` 56, `display-1` 72 (with tracking), `body-lg` 17;
  - radius `2xl`; shadow `soft`.
- **Contrast:** a test checks that both ink colours pass AA on white and on the surface (5.3:1 and 4.9:1).
- **Tailwind:**
  - a `font-display` family (`--font-display`; Arabic uses Plex first);
  - a `max-w-wide` width (1320 px);
  - `can-hover:` and `touch:` variants. Hover-only controls stay visible on touch screens.
- **Kit:**
  - `Sheet` (a bottom-sheet variant of `Dialog`);
  - a `Popover` (lab, `components/lab/`);
  - three icons.
- **Card data** gains `image2`, the second photo used for the hover swap.
- **One trick worth keeping:** product photos use `mix-blend-multiply` on the neutral surface. White photo backgrounds melt into the well even without cutouts.

## Cutouts (`scripts/cutouts.mjs`)
- **How it works:**
  - The background is removed on this computer, with `@imgly/background-removal-node`. Nothing is uploaded anywhere.
  - Each image is trimmed and centred on a 1600 px square with an 8% margin.
  - The output is transparent WebP at 400/800/1600 (each ≤ 200 KB), in `public/design-lab/cutouts/`, with a `manifest.json` (`status: pending`).
  - The originals are untouched.
- **Speed:** about 1–2 s per photo, so the whole catalog takes roughly 5 minutes.
- **Quality:**
  - Clean on cans, tubes, tools and blister packs.
  - The Kodak/Maxell blister cards are kept whole, which is correct.
  - Photos that were already on white gain mostly consistency (the same size and margin).
- **The library is not a site dependency.** It is about 300 MB with its model. The script finds it through `BG_REMOVAL_PATH`, or through a `--no-save` install.
- **Approval:** per-image approve/reject in the admin comes in Step 2, if you want it.

## Checks
- **axe** on the lab, at 1440 and 390 in EN and AR: **0 critical, 0 serious.**
  - The 3–5 moderate items are lab-only: several header specimens on one page, and the lab bar sitting outside a landmark.
- **Unit tests:** 69/69. I haven't re-run the emulator suites in this step, because the site's routes and data didn't change.
- **Screenshot note:** Chromium's full-page screenshots drop touch emulation, so phone shots are taken section by section. On a real phone the "+" is always visible.

## Choices I need from you
1. **Hero:**
   - A (full-bleed) or B (split)?
   - My pick is **A**: it is the biggest change from "template", and the marina photo carries it.
2. **Heading font:**
   - Manrope, Plus Jakarta Sans or Inter Tight?
   - My pick is **Manrope**: it has the most character against the Inter body text, and still reads as calm. Inter Tight is the safest but closest to today's look.
3. **Cutouts:**
   - Should I build the admin approval step (before/after per image, approve or keep the original) and run it on the whole catalog?
   - It touches only new `-cut` files plus a flag per image, so it is reversible.
4. **Category artwork:**
   - The current category images are illustrated circles with text baked in ("ANTI FOULING"…). They clash with the new look in the Shop menu and the home tiles.
   - Options:
     - (a) use a cutout product, or a collage of 2–3 cutouts, per category on the neutral surface (no new photography needed);
     - (b) you supply photos;
     - (c) keep them.
   - My pick is **(a)**.
5. **Hero photo:** the best marina photo we have (`monastir-1`) is a wide view of the town and the marina. A closer photo of boats or berths would make Hero A much stronger. Do you have one?
6. **Small decisions I made, and will keep unless you say otherwise:**
   - The header keeps a compact EN/FR/AR switch.
   - On phones, "Get a quote" lives in the menu, not in the header bar.
   - The cart count badge is navy.
   - The option picker shows each option's price and disables out-of-stock options.
7. **Testimonials:**
   - The v2 spec says to show them only if they are real. Earlier you asked to keep the placeholders.
   - Should I **hide the section** in Step 2 until you have real ones?
