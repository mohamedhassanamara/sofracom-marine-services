// The photos the home page uses, in one place. To change one: add the photo as WebP
// (`node scripts/optimize-images.mjs --apply` turns any JPEG/PNG under public/assets into
// <name>-400/-800/-1600.webp), then put its -800 path here.
//
// HERO: the full-bleed photo at the top of the home page. To change it, run
//   node scripts/hero-image.mjs path/to/photo.jpg --focus 0.6
// which rewrites the files below (same names), so this config only changes for `position`.
// `image`: landscape (tablets, desktop, social previews), with -400/-1600 siblings.
// `mobile`: 3:4 portrait crop for phones (≤ 640 px wide), 480 and 720 px wide.
// `position`: CSS object-position of the landscape photo (which part stays when cropped).
export const HERO = {
    image: '/assets/site/home-hero-800.webp',
    mobile: ['/assets/site/home-hero-mobile-480.webp 480w', '/assets/site/home-hero-mobile-720.webp 720w'],
    position: '50% 60%',
};

// Service cards: either a `photo`, or `products` (ids) drawn as cutouts on the neutral
// surface until real photos of the work exist.
export const SERVICE_CARDS = [
    { key: 'antifouling', products: ['p_519rad9s', 'p_bamzqzdm'] },
    { key: 'gelcoat', products: ['p_gkr56nwm', 'p_mz4veks5', 'p_x61fzhb6'] },
    { key: 'haulout', photo: '/assets/site/monastir-2-800.webp' },
];

// The quote form's service cards (every key in lib/quote.js QUOTE_SERVICES): a `photo` or
// `products` drawn as cutouts. "other" has no picture (an icon is shown).
export const QUOTE_SERVICE_ART = {
    antifouling: { products: ['p_519rad9s', 'p_bamzqzdm'] },
    gelcoat: { products: ['p_x61fzhb6', 'p_gkr56nwm'] },
    deck: { products: ['p_6wwkbkks', 'p_ehm947n6'] },
    electrical: { products: ['p_qa181ekl', 'p_rm1fv8je'] },
    polishing: { products: ['p_gkr56nwm', 'p_mz4veks5', 'p_kquftk2n'] },
    haulout: { photo: '/assets/site/monastir-2-800.webp' },
    products: { products: ['p_n6zc6cxm', 'p_bamzqzdm', 'p_qirv3ffx'] },
    other: {},
};
