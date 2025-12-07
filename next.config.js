/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
