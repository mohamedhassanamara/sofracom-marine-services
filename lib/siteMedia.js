// The photos the home page uses, in one place. To change one: add the photo as WebP
// (`node scripts/optimize-images.mjs --apply` turns any JPEG/PNG under public/assets into
// <name>-400/-800/-1600.webp), then put its -800 path here.
//
// HERO: the full-bleed photo at the top of the home page. `position` is the CSS
// object-position (which part stays visible when the photo is cropped).
export const HERO = {
    image: '/assets/site/monastir-1-800.webp',
    position: '50% 60%',
};

// Service cards: either a `photo`, or `products` (ids) drawn as cutouts on the neutral
// surface until real photos of the work exist.
export const SERVICE_CARDS = [
    { key: 'antifouling', products: ['p_519rad9s', 'p_bamzqzdm'] },
    { key: 'gelcoat', products: ['p_gkr56nwm', 'p_mz4veks5', 'p_x61fzhb6'] },
    { key: 'haulout', photo: '/assets/site/monastir-2-800.webp' },
];
