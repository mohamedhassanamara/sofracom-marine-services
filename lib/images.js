// Responsive image paths. Optimized images are stored as <stem>-800.webp with -400 and
// -1600 siblings (see tools/shared/images.js); anything else is served as-is.
const OPTIMIZED = /-(400|800|1600)\.webp$/;
const WIDTHS = [400, 800, 1600];

export const ensureLeadingSlash = value => {
    if (!value) return '';
    if (/^(https?:|data:)/.test(value)) return value;
    return value.startsWith('/') ? value : `/${value}`;
};

export const isOptimizedImage = src => OPTIMIZED.test(src || '');

// The file closest to `width` (e.g. 400 for thumbnails), or `src` itself.
export const imageAt = (src, width = 800) => {
    const path = ensureLeadingSlash(src);
    if (!isOptimizedImage(path)) return path;
    const best = WIDTHS.reduce((a, b) => (Math.abs(b - width) < Math.abs(a - width) ? b : a));
    return path.replace(OPTIMIZED, `-${best}.webp`);
};

export const srcSetFor = src => {
    const path = ensureLeadingSlash(src);
    if (!isOptimizedImage(path)) return undefined;
    return WIDTHS.map(width => `${path.replace(OPTIMIZED, `-${width}.webp`)} ${width}w`).join(', ');
};
