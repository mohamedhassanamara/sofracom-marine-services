# Phase 5: translation and RTL pass

## UI strings
- Every UI string added in Phases 1–4 exists in EN/FR/AR (the parity test covers all 600+ keys). A scan of pages and components finds no hard-coded English left in JSX text, `aria-label`, `placeholder`, `title` or `alt`; the remaining English library fallbacks ("Variant", "Untitled gallery entry") are gone.
- FR values identical to EN were reviewed: all are correct French (Services, Message, Catamaran…).
- Fixed wording collisions (an old `checkout.signInPrompt`) and a mixed-language Arabic hero subtitle.

## Catalog content
- **Arabic drafts** for the **72** product titles and **2** category names (+ descriptions) that had none, marked `"needsReview": true` (`scripts/data/ar-drafts.json`, applied with `scripts/apply-translation-drafts.mjs`, which never overwrites). Brand and model names stay in Latin script; only descriptive words are translated.
- **14 existing Arabic titles that are just the English** were **not overwritten**: they got `needsReview: true` and a `suggestedTitle` (`scripts/data/ar-suggestions.json`) for one-click acceptance in the admin (Phase 6).
- FR titles were already complete (167/167). Now every product and category has FR and AR names (tested).
- **Use tags and option labels**: the data supports `translations[lang].usage` and `.variants[i].label`; where those are missing, `lib/catalogGlossary.js` (≈140 terms in EN/FR/AR) translates them at render time and **merges duplicates typed in both languages** ("noir"/"black", "érodable"/"erodable", "primer"/"primaire"), also on English pages; brand-name tags are dropped (the brand is shown already); unknown codes are kept. Ambiguous words (e.g. "mat") are left as typed.
- **Descriptions**: 70 products have no Arabic description (out of scope for drafts). The English fallback is now marked `lang="en" dir="ltr"` so it lays out and is read correctly inside Arabic pages (same for category descriptions and gallery text).

## RTL
- No physical left/right utilities remain (checked); drawers, toasts, breadcrumbs, chevrons/arrows, quantity steppers, the status timeline rail, select chevrons, the hero gradient and gallery arrow keys all mirror.
- Prices: one formatter, Arabic `‏341,887 د.ت.‏` with bidi marks; phone numbers and refs are isolated (`<bdi dir="ltr">`).
- **Bidi in mixed titles**: Arabic titles containing Latin/number runs ("M4 × 20", model codes) were reordered by the browser ("20 × M4"). `lib/bidi.js` wraps those runs in Unicode isolates on Arabic pages (titles, option labels, search index), verified in screenshots and unit-tested.
- A Latin-text scan of the Arabic pages now finds only brand/model names, the email address, and the untranslated English descriptions (marked, see above).

## Tests
`tests/unit/catalog-i18n.test.mjs`: every product/category has FR + AR names, drafts are flagged and originals untouched, tag translation/merging, own translations win over the glossary, bidi isolation. Full suite green: 71 unit, 19 rules, 54 API.

## Screenshots
`home|category|product|product-en-description|search-{desktop,mobile}-{fr,ar}.png`.

## For you to review
- The 74 drafted Arabic names and 14 suggestions (`needsReview: true`), and the glossary wording (FR/AR) in `lib/catalogGlossary.js`.
- 70 Arabic product descriptions to write when convenient (shown in English meanwhile).
