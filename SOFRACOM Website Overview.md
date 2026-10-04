# SOFRACOM Website Overview

Oct 4, 2026 · @Mohamed Hassen

## About

SOFRACOM's website is the storefront and service brochure of a marine supply store and boat-services business in Monastir, Tunisia. It sells marine paints, sealants, batteries and tools from 167 catalog products, and it promotes refit work arranged through a network of local professionals.

- **Who it serves:** boat owners and skippers berthed at Marina Monastir or hauling out at the Port de pêche, about 1 mile away. Many are visiting foreigners, which is why the site comes in three languages.
- **What it sells:** paints from JOTUN, HEMPEL, INTERNATIONAL and AKZONOBEL, plus SIKA sealants, SHELL oils, VARTA batteries and BOSCH machinery.
- **What it offers as services:** antifouling and painting, gelcoat and fiberglass repair, deck and hardware work, electrical and mechanical work, polishing, and haul-out coordination with a partner yard.
- **What it's meant to achieve:** online orders for delivery (no online payment), and free quote requests for service work. It also presents SOFRACOM as the local, well-stocked place to go.

## Site map and navigation

The site has one long home page and five other page types, all sharing the same header and footer.

| Page | URL | What it shows |
| --- | --- | --- |
| Home | `/` | The brand story, services, brands, testimonials, FAQ and the quote form, all on one scrolling page |
| Product catalog | `/products` | A card for each of the 6 categories, with a cart button |
| Category | `/products/<category>` | One category's products with filters, e.g. `/products/antifouling-coatings` |
| Product detail | `/products/<category>/<product>` | One product with its photos, variants, datasheet and add-to-cart |
| Search results | `/search?q=...` | Products matching a search term |
| Gallery | `/gallery` | Photos and videos of completed work |

**Header.** The header sticks to the top of the screen. It shows the logo and the SOFRACOM wordmark, then the links Home, About, Brands, Products, Gallery, Services and Contact. After that come a product search box and a language picker (EN, FR, AR).

- Over the hero image the header is translucent ("glass"). It turns solid navy after the visitor scrolls 40px.
- Hovering Products opens a dropdown that lists each category with its thumbnail.
- Typing in the search box shows live suggestions with each product's image and price. Pressing Enter opens the full results page.
- On mobile, the links collapse into a hamburger menu that has its own search box and category list.

**Footer.** The footer has three columns: a short brand blurb, quick links back to the home page sections, and a Monastir location line. Under them sit a copyright line and a "Back to top" link. A floating ↑ button also appears once the visitor has scrolled 500px down.

Open question: the footer's quick links are same-page anchors such as `#about`, so they do nothing on pages other than Home.

## Home page

The home page is a single scroll through nine sections. Its job is to get a visitor to either explore the services or ask for a quote.

1. **Hero** (`#home`): a full-screen photo of Monastir Marina under a dark blue overlay. It reads "Marine Supplies & Services in Monastir", followed by "Quick repairs and full projects: antifouling, polishing, gelcoat, deck renewal, hauling & more." Two buttons follow: **Explore Services** and **Get a Quote**. Blurred circles drift slowly behind the text, and a wave shape forms the bottom edge.
2. **Monastir band**: a parallax photo strip that reads "Monastir, Tunisia — Marina views • Ribat • Old town".
3. **About SOFRACOM** (`#about`): a short story of the business: a stocked store plus a services division, close to Marina Monastir and the Port de pêche, with deliveries throughout the day. It lists the paint brands, the products and tools, the network of tradespeople (carpenters, electricians, mechanics, upholsterers, welders) and the expert support on offer. Beside the text is a tilting card with four tiles: Antifouling, Gelcoat Repair, Deck Renewal and Haul-out.
4. **Trusted Brands** (`#brands`): a grid of 8 logo cards (AKZONOBEL, BOSCH, CROWN, HEMPEL, INTERNATIONAL, JOTUN, SIKA, VARTA). The cards tilt and grow when hovered.
5. **Services** (`#services`): six service cards, each with an outline icon:
   - Antifouling & Painting
   - Gelcoat & Fiberglass
   - Deck & Hardware
   - Electrical & Mechanical
   - Polishing & Protection
   - Haul-out Coordination

   Below the cards, a vertical timeline shows how a job runs: share your project → quote & scheduling → execution → delivery and after-care.
6. **Haul-out band**: a second parallax strip that reads "Haul-out near Port de pêche — 1 mile from Monastir Marina".
7. **What skippers say**: three short testimonials, from a 42ft sloop owner, a catamaran owner and a motor yacht owner.
8. **FAQ**: three questions that expand when clicked. They cover delivering to the marina, getting a free quote, and whether everything shown is in stock.
9. **Contact Us** (`#contact`): the store address (Remada Street, Monastir), phone +216 52 663 210, email sofracomtunisia@gmail.com and opening hours (Mon–Sat, 8:00–17:00). Next to these sits the quote form: name, email, phone, subject and project details.

## Product catalog

The catalog holds 167 products in 6 categories. Most are in stock: 158 are in stock, 5 are on order and 4 are out of stock. Prices are shown in Tunisian dinars (TND), formatted the French-Tunisian way.

| Category | Products | Example brands |
| --- | --- | --- |
| Hardware Tools | 88 | BOSCH, APT, ACEM, CLIMAX |
| Antifouling & Coatings | 29 | JOTUN, HEMPEL, INTERNATIONAL, AKZONOBEL |
| Sealants & Adhesives | 23 | BELZONA, PATTEX, KAPCI, QUICKLINE |
| Power Tools & Parts | 18 | BOSCH, APT, FEMI |
| Oils, Filters & Batteries | 7 | LIQUI MOLY, OCEANA, REVLINE |
| Pneumatic | 2 | APT |

**Catalog landing (`/products`).** Headed "Explore categories & products", this page shows one card per category. Each card has the category's image, description and product count, plus a "View" tag. Categories are sorted alphabetically in the visitor's language.

**Category page.** This page shows a grid of product cards, with a toolbar on top:

- a brand dropdown ("All brands" plus each brand in the category)
- a text search over title, description and brand
- a sort menu: name A–Z, name Z–A, price low to high, price high to low
- a "Reset controls" button

Each product card shows the image, title, brand, a shortened description with "Read more", and a datasheet link when a PDF exists. It also has a variant picker (for example 2.5L or 20L, each with its own price), the price, a colored stock badge and usage tags such as "Antifouling" or "Self-polishing". Two buttons sit at the bottom: **View details** and **Add to cart**. Out-of-stock products are greyed out and can't be added.

**Product detail page.** Breadcrumbs lead to a two-column layout:

- **Left column:** a large product image with clickable thumbnails underneath.
- **Right column:** the category, title and brand, then the usage tags and a large price with its stock badge. Variants appear as buttons that show their price. Below them come the description with Read more, an Add to cart button and a "Download datasheet" link.
- **On-order products** also show an orange note: "This item is on order; delivery will take longer."

Open question: when the category filters match nothing, the page shows the full product list rather than an empty-state message.

## Search and gallery

**Search (`/search`).** Headed "Find the right product", this page searches every category at once. It matches the title, description, brand, category, usage tags and price. Results are sorted alphabetically and come with a count line, such as "3 results for 'sika'". The header search box sends visitors here when they press Enter.

**Gallery (`/gallery`).** Titled "Work snapshots from Monastir", this page shows images and videos from recent refits, coating jobs and marina work. Filter pills switch between All, Images and Videos. YouTube links play inside the page, and other video links get a "View video" button. Each entry shows its title, date, description and tags, newest first. The gallery has 1 entry so far (a video).

## Cart, checkout and quotes

Visitors can order products without an account or online payment. They fill in a short delivery form, and SOFRACOM follows up.

**Ordering products**

1. The visitor clicks **Add to cart** on a product card or product page. Each variant (for example 2.5L and 20L) counts as its own cart line.
2. A floating "🛒 Cart" button with an item count opens a side drawer titled "Your order". There the visitor can change quantities with −/+ or remove items. The drawer shows Items total, a flat 7 TND delivery fee, and the Grand total.
3. **Checkout** opens a form asking for full name, phone, delivery address and optional notes.
4. **Order** sends it to the shop. A confirmation then says "Order received", or "Order received – delays expected" if the cart held on-order items. The cart is emptied afterwards.

The cart is saved in the visitor's browser, so it's still there when they come back to the site. Out-of-stock products can't be added. Adding an on-order product brings up an "On-demand items" notice warning of a delay.

**Requesting a quote**

The home page's Contact section has a form with name, email, phone, subject and project details. Name, email and details are required. After sending, the visitor sees "Quote received! We will reply within a day."

Every order and quote request alerts the SOFRACOM team with a push notification.

## Languages

The site is in English, French and Arabic, and visitors switch between them with the EN / FR / AR picker in the header. The site remembers the choice on the visitor's device. Choosing Arabic flips the whole layout to right-to-left.

The translation is only partial:

- **Translated:** the navigation, the hero, the section titles, the FAQ, the contact details and form labels, the gallery page and the category toolbar (brand filter, search, sort). Product and category names, descriptions and variant labels are also translated wherever the catalog provides a translation.
- **Still English only:** the About paragraph, the service cards, the process timeline, the testimonials, the footer blurb, the catalog and search page headings, and the whole cart and checkout flow.

English is the fallback: any text without a translation appears in English.

## Visual style

The look is clean and nautical: deep navy and sea blue on near-white, with rounded white cards, soft shadows, real Monastir photography, and gentle motion on scroll and hover.

**Color palette**

| Role | Color | Where it appears |
| --- | --- | --- |
| Deep navy | `#0B2050` | Header, cart button, primary buttons, breadcrumbs, photo overlays |
| Sea blue | `#0F3D72` | Headings in cards, links, secondary accents |
| Accent cyan | `#24B4FF` | The glow in the hero overlay |
| Sky | `#E6F0FF` | Light blue card gradients and tags |
| Sand (page background) | `#F8FAFC` | Body background; sections alternate between white and light grey |
| Ink | `#0F172A` | Body text |
| Footer | `#051836` → `#030B1D` | Dark gradient footer |
| In stock | `#0F7A2E` green | Stock badge |
| On order | `#F97316` orange | Stock badge and delay notices |
| Out of stock | `#D72638` red | Stock badge |

**Typography.** The site uses Inter from Google Fonts in weights 400–800. Headings are extra-bold (800) and large, 3xl–6xl, with the hero title at up to 6xl. Small uppercase labels with wide letter spacing ("SOFRACOM CATALOG", category names) sit above page titles. Body copy is grey (`gray-600`) with relaxed line height.

**Layout and components**

- Content is centered with a maximum width of about 1280px. Grids run 1 column on phones, 2 on tablets and 3–4 on desktop.
- Cards have white backgrounds, large rounded corners (16–24px), soft shadows and sometimes a white-to-pale-blue gradient.
- Buttons, tags, stock badges and the cart button are pill-shaped. Primary buttons are navy, and outline buttons are white-bordered over photos.
- Section dividers use wave shapes, at the bottom of the hero and the top of the Brands and Contact sections.
- The cart is a slide-in drawer over a blurred navy backdrop. Checkout and order confirmation open as centered pop-ups.

**Imagery.** Full-bleed photos of Monastir Marina and the old town appear in the hero and in two parallax bands. On phones, parallax turns off and the photos scroll normally. Brand logos sit on white cards. Product photos are shown whole (not cropped) on product pages, with a pale grey backdrop.

**Motion**

- Sections fade in as they scroll into view.
- Cards tilt in 3D toward the mouse pointer.
- Brand cards grow slightly when hovered.
- Category cards lift when hovered.
- Decorative blurred circles drift up and down in the hero.
- The header turns from translucent to solid navy once the visitor scrolls.

## Under the hood

The site is a Next.js (React) app hosted on Vercel, with pages generated ahead of time so they load fast.

- **Content:** products, categories and gallery entries come from two JSON files in the repo. Changes to them appear on the site after the next deploy.
- **Orders and quotes:** two small server functions store submissions in Firebase Firestore (the `orders` and `quotes` collections) and send a push notification to the team.
- **Styling:** Tailwind CSS 2 utility classes plus one custom stylesheet that holds the palette, cards, cart, badges and animations.
- **Analytics:** Vercel Analytics and Speed Insights are enabled on every page.
