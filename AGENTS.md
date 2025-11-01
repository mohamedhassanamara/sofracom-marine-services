# Repository Guidelines

## Project Structure & Module Organization
The repo is a static site served from the project root. `index.html` is the landing page, while `products.html` lists catalog content, renders the cart workflow, and shares styling via `styles.css`. Behaviour is centralized in `script.js`; keep additional scripts modular by creating new files and linking them explicitly. Serverless handlers live under `api/` (for example `api/create-order.js`). Store imagery and downloadable assets under `assets/`, using descriptive, kebab-case filenames (for example `assets/monastir-harbor.jpg`). Global resources such as `logo.jpeg` live at the root to simplify relative paths.

Product data lives in `assets/data/products.json` and each product expects `title`, `brand`, `image`, `usage`, `price`, `description`, and a `stock` flag (`in` or `out`).

## Build, Test, and Development Commands
There is no build pipeline; edits become live once the HTML/CSS/JS is saved. For local preview run a static server, e.g. `npx serve .` or `python3 -m http.server 8000` from the repo root. Use `npm run admin` to launch the local product management console that edits `assets/data/products.json`, handles drag-and-drop image uploads into `assets/products` or `assets/categories`, toggles product stock status, and auto-commits/pushes changes (set `PRODUCT_ADMIN_GITHUB_TOKEN` and optionally `PRODUCT_ADMIN_GITHUB_USERNAME` in your shell or `.env`). Cart state is stored in `localStorage`; clear it between test sessions to start fresh. The default `npm test` script is a placeholder—replace it with meaningful checks when you introduce automation.

## Coding Style & Naming Conventions
Use four-space indentation in HTML and CSS to match existing files, and prefer semantic HTML5 elements. Tailwind utility classes are loaded from CDN; cluster related utilities together (layout → spacing → color) to keep markup readable. Name CSS classes in lowercase kebab-case and reserve inline styles for one-off overrides. JavaScript should stay vanilla ES6+, with const/let, arrow functions, and early returns; place reusable helpers at the top of `script.js` and avoid polluting `window`.

## Testing Guidelines
Until automated tests exist, validate changes manually in Chromium- and WebKit-based browsers, checking navigation anchors, scroll animations, and language toggles. When you add automated coverage, prefer lightweight tooling such as Playwright for UI smoke checks and eslint-style linters for static validation. Document new test commands in `package.json` and update this guide accordingly.

## Commit & Pull Request Guidelines
Commit messages follow an imperative style (`add products grid`, `fix navbar blur`) as seen in `git log`. Keep the subject under 72 characters and expand with bullet points in the body if context is required. Pull requests should include: a concise summary of changes, before/after screenshots for visual tweaks, reproduction steps for bug fixes, and links to relevant issues or stakeholder notes.

## Order & Checkout Flow
`products.html` exposes a cart + checkout form. Submissions hit `api/create-order.js`, which validates payloads and either logs orders (default) or persists them to Supabase when credentials are present.

- Configure persistence by adding `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env` (and to Vercel project settings). Create an `orders` table with columns: `id` (uuid primary key), `created_at` (timestamp default now), `customer_name`, `customer_phone`, `customer_address`, `customer_notes`, `items` (jsonb), `total` (numeric), `currency` (text), `status` (text).
- Without Supabase, the API returns `200 OK` and logs the order server-side—extend the handler to email or trigger webhooks if needed. Consider adding rate limiting or CAPTCHA before going live.
- Test the full flow with `vercel dev` so the serverless endpoint runs locally alongside the static site. Remember to reset `localStorage` to clear the cart during QA.

## Security & Asset Hygiene
Do not commit secrets or API keys—store environment-specific values in deployment platforms instead. Optimize imagery before adding it to `assets/` (target <500 KB) and prefer SVG for logos. Remove unused media to keep load times low and avoid shipping confidential materials.
