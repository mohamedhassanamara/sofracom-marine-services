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

// Service cards: a `photo` under a navy shade with the text on top (`position`: the point of
// the photo the crop keeps, `zoom`: how much to enlarge around it), or `products` (ids) drawn
// as cutouts. Until photos of the work exist, all three are crops of the marina/port photos.
export const SERVICE_CARDS = [
    { key: 'antifouling', photo: '/assets/site/monastir-1-800.webp', position: '86% 62%', zoom: 1.8 },
    { key: 'gelcoat', photo: '/assets/site/monastir-1-800.webp', position: '30% 62%', zoom: 1.7 },
    { key: 'haulout', photo: '/assets/site/monastir-2-800.webp', position: '60% 55%', zoom: 1.15 },
];
