// Site-wide switches, in one place. CommonJS so next.config.js can read it too.

// The Gallery link (header, phone menu, footer, sitemap) appears once the gallery has at
// least this many entries. The page itself always works at /gallery. 0 = always show.
const GALLERY_MIN_ENTRIES = 6;

const showGalleryLink = entryCount => entryCount >= GALLERY_MIN_ENTRIES;

module.exports = { GALLERY_MIN_ENTRIES, showGalleryLink };
