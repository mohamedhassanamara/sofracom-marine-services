const catalog = require('./public/assets/data/products.json');
const { slugify } = require('./lib/productIds');

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets tests and a second dev server run beside `next dev` without sharing its lock.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  async redirects() {
    return productRedirects();
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
