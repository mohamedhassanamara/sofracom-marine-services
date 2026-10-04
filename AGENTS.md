# Repository Guidelines

## Project Structure & Module Organization
The repo is a static site served from the project root. `index.html` is the landing page, while `products.html` lists catalog content, renders the cart workflow, and shares styling via `styles.css`. Behaviour is centralized in `script.js`; keep additional scripts modular by creating new files and linking them explicitly. Serverless handlers live under `api/` (for example `api/create-order.js`). Store imagery and downloadable assets under `assets/`, using descriptive, kebab-case filenames (for example `assets/monastir-harbor.jpg`). Global resources such as `logo.jpeg` live at the root to simplify relative paths.

Product data lives in `assets/data/products.json` and each product expects `title`, `brand`, `image`, `usage`, `price`, `description`, and a `stock` flag (`in` or `out`).

## Build, Test, and Development Commands
There is no build pipeline; edits become live once the HTML/CSS/JS is saved. For local preview run a static server, e.g. `npx serve .` or `python3 -m http.server 8000` from the repo root. Use `npm run admin` to launch the local product management console (plus the operations page at `/ops` for orders, quotes, reviews, customers and staff phones; `npm run admin:emulated` targets the emulators) that edits `assets/data/products.json`, handles drag-and-drop image uploads into `assets/products` or `assets/categories`, toggles product stock status, and auto-commits/pushes changes (set `PRODUCT_ADMIN_GITHUB_TOKEN` and optionally `PRODUCT_ADMIN_GITHUB_USERNAME` in your shell or `.env`). Cart state is stored in `localStorage`; clear it between test sessions to start fresh. The default `npm test` script is a placeholder—replace it with meaningful checks when you introduce automation.

## Coding Style & Naming Conventions
Use four-space indentation in HTML and CSS to match existing files, and prefer semantic HTML5 elements. Tailwind utility classes are loaded from CDN; cluster related utilities together (layout → spacing → color) to keep markup readable. Name CSS classes in lowercase kebab-case and reserve inline styles for one-off overrides. JavaScript should stay vanilla ES6+, with const/let, arrow functions, and early returns; place reusable helpers at the top of `script.js` and avoid polluting `window`.

## Testing Guidelines
`npm test` runs three suites: `test:i18n` (every UI string exists in EN/FR/AR), `test:rules` (Firestore security rules on the emulator) and `test:api` (spawns `next dev` against the Auth/Firestore emulators and calls the API directly). firebase-tools needs Java 21+. For manual QA run `npm run emulators`, `npm run seed:emulator` and `npm run dev:emulated`, then check Chromium and WebKit in all three languages (Arabic is right-to-left).

## Commit & Pull Request Guidelines
Commit messages follow an imperative style (`add products grid`, `fix navbar blur`) as seen in `git log`. Keep the subject under 72 characters and expand with bullet points in the body if context is required. Pull requests should include: a concise summary of changes, before/after screenshots for visual tweaks, reproduction steps for bug fixes, and links to relevant issues or stakeholder notes.

## Order & Checkout Flow
The cart (`contexts/CartContext.js`, localStorage) and checkout (`components/cart/`) post to `pages/api/create-order.js`, which prices every line from the catalog and writes `orders` with the Firebase Admin SDK. Accounts are optional: signed-in customers get `uid` attached from their verified ID token, can reuse saved addresses and track orders under `/account`; guests may leave an email so the order links to an account later.

- Order/quote statuses and their history are defined in `lib/status.js`. There is no admin page on the website: staff change statuses from the enrolled phone app (device tokens only) or the local admin tool (`npm run admin` → http://127.0.0.1:5173/ops, red PRODUCTION / green EMULATOR banner), which share `lib/server/statusUpdates.js`.
- Only customers with a delivered order can review a product (`reviews`, `productStats`).
- All Firestore writes happen server-side; `firestore.rules` only allows reading your own data and published reviews.
- Place the Firebase service account JSON in the project root (local dev) or set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`; the browser needs `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Mirror them in Vercel. Keep service account files out of version control.

## Security & Asset Hygiene
Do not commit secrets or API keys—store environment-specific values in deployment platforms instead. Optimize imagery before adding it to `assets/` (target <500 KB) and prefer SVG for logos. Remove unused media to keep load times low and avoid shipping confidential materials.
