self.__BUILD_MANIFEST = {
  "/": [
    "static/chunks/pages/index.js"
  ],
  "/_error": [
    "static/chunks/pages/_error.js"
  ],
  "/products": [
    "static/chunks/pages/products.js"
  ],
  "/products/[categorySlug]": [
    "static/chunks/pages/products/[categorySlug].js"
  ],
  "/products/[categorySlug]/[productId]": [
    "static/chunks/pages/products/[categorySlug]/[productId].js"
  ],
  "__rewrites": {
    "afterFiles": [],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/",
    "/_app",
    "/_error",
    "/api/create-order",
    "/api/create-quote",
    "/api/firebase-service",
    "/products",
    "/products/[categorySlug]",
    "/products/[categorySlug]/[productId]"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()