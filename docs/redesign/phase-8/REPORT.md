# Phase 8: QA

All checks were run against a **production build** (`npm run build`, served with `next start`). That build was wired to the Firebase emulators with demo data, so no production data was read or written.

## Performance fixes made in this phase
- **Firebase Auth is no longer downloaded by guests.**
  - It loads on page load only when one of these holds:
    - this browser has a session (a `sofracom.signedIn.v1` hint, or Firebase's own IndexedDB);
    - the page is an account page or `/checkout`.
  - Otherwise it loads on first use, for example on the sign-in form.
  - `initializeAuth` without the popup resolver saves another ~40 KB. `signInWithPopup` passes the resolver itself.
- **Only one language's dictionary is sent to the browser.** `lib/i18n/messages.js` handles this:
  - the server has all three dictionaries;
  - the page inlines its own (`#__I18N__`);
  - switching language fetches the other one first, then navigates.
- **Lazy-loaded UI:** the cart drawer and mobile menu are `next/dynamic`.
- **No prefetching** from the header and footer links. Before, every category page's JS was prefetched on load.
- **LCP image**
  - It is preloaded from `<head>` with `fetchpriority=high`.
  - The `sizes` hints for the hero and cards now match the real widths. Phones download the 400/800 files, not the 1600 one.
- **Build uses webpack** (`next build --webpack`). Turbopack produced duplicated shared chunks: the same code shipped twice on every page.
- **Result:**
  - `_app` JS went from 63 KB to **27 KB gzip**.
  - JS transferred on the home page went from ~330 KB to **~150–177 KB**.

## Lighthouse (mobile, Lighthouse default simulated throttling)
| Page | Performance | Accessibility | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| Home | 95–96 | 100 | 96 | 100 | 2.8–2.9 s |
| Category (`/products/antifouling-coatings`) | 95 | 100 | 96 | 100 | 2.9–3.0 s |
| Product | 95 | 100 | 96 | 100 | 2.9 s |

- **Best practices 96:** the only failing audit is the `/_vercel/insights` 404. Those scripts exist only on Vercel, not on localhost.
- **With DevTools throttling** (a real slow phone instead of Lighthouse's simulation): performance 98–99, LCP 1.6–2.0 s.
- **Desktop:** performance 100, accessibility 100, SEO 100, LCP 0.6–0.8 s.
- **Target missed: simulated mobile LCP is still above 2.5 s.**
  - The LCP image (≤ 60 KB) is requested first.
  - On Lighthouse's simulated 1.6 Mbps link it shares bandwidth with the Inter font and the Next.js runtime.
  - Getting under 2.5 s in that simulation would mean dropping the web font or inlining the hero image. Both are design changes, so I left them.
  - On Vercel's CDN, with HTTP/2 and Brotli, real-device field data should be better than this localhost figure.

## Accessibility
- **axe:** **0 violations of any severity** on 14 page and language combinations, each at 1440 px and 390 px:
  - home, category, product, search, cart, checkout, track, quote, gallery, login, account, 404;
  - in EN and AR.
- **Keyboard-only pass:** focus was visible at every step (`keyboard-01…09.png`). The path covered:
  1. skip link
  2. header search suggestion
  3. product page, then Add to cart
  4. cart drawer (focus trapped, Escape returns focus)
  5. checkout, focusing the first field
  6. order placed
  7. confirmation
  8. quote form: service radio group with arrow keys, then submit
  9. quote success
- **Fixed while testing:** after it became lazy-loaded, the cart drawer closed itself when it first mounted. It now closes only on a real route change.

## Before / after
`compare/*.png` shows 20 views side by side: the audit screenshot (`docs/ui-audit/screenshots`) next to the same view now. They cover:
- home (EN/FR/AR)
- catalog, category (incl. the empty filter)
- product with options
- search, gallery, 404, login
- cart, checkout (guest, AR)
- signed-in header, account orders

The raw "after" captures are in `compare/after/`.

## Final screenshots
`final/{home,category,product,checkout,track,quote}-{desktop,mobile}-{en,ar}.png`

## Tests
`npm test`: **68 unit, 19 rules, 63 API, all green.**

New API test: `tests/api/routing.test.mjs`. It covers:
- `/`, `/fr` and `/ar` render with server-side `lang`/`dir`;
- `/` goes to the language remembered in `NEXT_LOCALE`, and deep links are never redirected;
- legacy product URLs redirect permanently in every locale;
- old image paths redirect permanently (308) to their WebP;
- canonical and hreflang tags are present, and `/sitemap.xml` and `/robots.txt` are served;
- private pages are `noindex`.

Existing coverage requested by the plan:
- `/track`, order refs and `/quote`: `tests/api/refs-track-quote.test.mjs`, `tests/unit/refs.test.mjs`
- publish commit scope and rollback: `tests/unit/admin-app.test.mjs`, `tests/unit/admin-publish.test.mjs`
- i18n completeness and routing helpers: `tests/i18n.test.mjs`, `tests/unit/i18n-routing.test.mjs`

**Admin app re-checked after the dictionary split:**
- every page renders against the emulators;
- Publish stays disabled on this branch, because it is main-only;
- the one test price edit the run saved to `products.json` was reverted.

## Known gaps
See `docs/redesign/CHANGES.md` → "Known gaps".
