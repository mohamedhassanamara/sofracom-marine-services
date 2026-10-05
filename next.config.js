const catalog = require('./public/assets/data/products.json');
const { slugify } = require('./lib/productIds');
const { LOCALES, DEFAULT_LOCALE } = require('./lib/i18n/locales');
const { showGalleryLink } = require('./lib/siteSettings');
const gallery = require('./public/assets/data/gallery.json');

// Product URLs moved from title-derived ids to stable ids; keep old links working.
const productRedirects = () =>
  (catalog.categories || []).flatMap(category => {
    const categorySlug = category.slug || slugify(category.name);
    return (category.products || [])
      .filter(product => product.id && product.legacyId && product.legacyId !== product.id)
      .map(product => ({
        source: `/products/${categorySlug}/${product.legacyId}`,
        destination: `/products/${categorySlug}/${product.id}`,
        permanent: true,
      }));
  });

// Images replaced by optimized WebP (scripts/optimize-images.mjs): old paths still live in
// past orders, saved carts and outside links. (Not `locale: false`: with i18n that would
// require the locale prefix in the source.)
const imageRedirects = () => {
  let map = {};
  try {
    map = require('./lib/data/image-redirects.json');
  } catch {
    return [];
  }
  return Object.entries(map).map(([source, destination]) => ({
    source: source.replace(/[()[\]{}?+*:]/g, '\\$&'),
    destination,
    permanent: true,
  }));
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // English at /, French at /fr, Arabic at /ar. "/" redirects to the remembered locale
  // (NEXT_LOCALE cookie, then Accept-Language); deeper links are never redirected.
  i18n: {
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
  },
  // Lets tests and a second dev server run beside `next dev` without sharing its lock.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Built into the pages (the gallery changes only with a redeploy anyway): whether the
  // header/footer show the Gallery link (lib/siteSettings.js).
  env: {
    SHOW_GALLERY_LINK: showGalleryLink((gallery.entries || []).length) ? '1' : '0',
  },

  async redirects() {
    return [...productRedirects(), ...imageRedirects()];
  },

  // Optimize serverless functions by excluding large asset directories
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
    ],
    '/api/**': [
      'public/assets/products/**/*',
      'public/assets/datasheets/**/*',
      'public/assets/categories/**/*',
      'public/assets/gallery/**/*',
      'public/**/*.png',
      'public/**/*.jpg',
      'public/**/*.jpeg',
      'public/**/*.pdf',
      'public/**/*.svg',
    ],
  },
  // Explicitly include only necessary files for API routes
  outputFileTracingIncludes: {
    '/api/**': [
      'sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json',
    ],
  },
};

module.exports = nextConfig;
