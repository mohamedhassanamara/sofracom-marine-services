module.exports = [
"[project]/lib/products.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCategories",
    ()=>getCategories,
    "getCategoryBySlug",
    ()=>getCategoryBySlug,
    "getCategorySlugs",
    ()=>getCategorySlugs,
    "getProductById",
    ()=>getProductById,
    "getProductPaths",
    ()=>getProductPaths
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
const DATA_PATH = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'public', 'assets', 'data', 'products.json');
const ensurePath = (value)=>{
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
};
const slugify = (value)=>(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normalizeProduct = (product, category)=>{
    const categorySlug = category.slug || slugify(category.name);
    const id = `${categorySlug}-${slugify(product.title)}`;
    const rawImages = Array.isArray(product.images) && product.images.length ? product.images : product.image ? [
        product.image
    ] : [];
    const images = rawImages.map(ensurePath).filter(Boolean);
    const fallbackImage = images[0] || ensurePath(product.image) || '/logo.jpeg';
    const variants = Array.isArray(product.variants) ? product.variants.map((variant)=>({
            label: variant.label || 'Variant',
            price: Number.isFinite(variant.price) ? variant.price : Number(variant.price) || 0
        })) : [];
    const price = Number.isFinite(product.price) && product.price > 0 ? product.price : variants[0]?.price || 0;
    return {
        ...product,
        id,
        categoryName: category.name,
        categorySlug,
        image: fallbackImage,
        images: images.length ? images : [
            fallbackImage
        ],
        datasheet: ensurePath(product.datasheet),
        variants,
        price,
        stock: product.stock || 'in',
        usage: Array.isArray(product.usage) ? product.usage : []
    };
};
const buildCategories = (rawCategories)=>(rawCategories || []).map((raw)=>{
        const slug = raw.slug || slugify(raw.name);
        return {
            ...raw,
            slug,
            image: ensurePath(raw.image),
            products: Array.isArray(raw.products) && raw.products.length ? raw.products.map((product)=>normalizeProduct(product, {
                    ...raw,
                    slug
                })) : []
        };
    });
function loadRawData() {
    const raw = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
}
function getCategories() {
    const parsed = loadRawData();
    return buildCategories(parsed.categories || []);
}
function getCategoryBySlug(slug) {
    if (!slug) return null;
    const categories = getCategories();
    return categories.find((category)=>category.slug === slug) || null;
}
function getCategorySlugs() {
    const categories = getCategories();
    return categories.map((category)=>category.slug);
}
function getProductById(productId) {
    if (!productId) return null;
    const categories = getCategories();
    for (const category of categories){
        const product = category.products.find((prod)=>prod.id === productId);
        if (product) {
            return {
                product,
                category
            };
        }
    }
    return null;
}
function getProductPaths() {
    const categories = getCategories();
    return categories.flatMap((category)=>category.products.map((product)=>({
                categorySlug: category.slug,
                productId: product.id
            })));
}
}),
"[project]/pages/products/index.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ProductsIndex,
    "getStaticProps",
    ()=>getStaticProps
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/products.js [ssr] (ecmascript)");
;
;
;
function getStaticProps() {
    const categories = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$products$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["getCategories"])();
    return {
        props: {
            categories
        }
    };
}
function ProductsIndex({ categories = [] }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
        className: "max-w-7xl mx-auto px-6 py-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "text-center mb-10",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        className: "text-sm text-gray-500 uppercase tracking-wide",
                        children: "SOFRACOM Catalog"
                    }, void 0, false, {
                        fileName: "[project]/pages/products/index.js",
                        lineNumber: 17,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                        className: "text-3xl sm:text-4xl font-extrabold text-gray-900",
                        children: "Explore categories & products"
                    }, void 0, false, {
                        fileName: "[project]/pages/products/index.js",
                        lineNumber: 18,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        className: "text-gray-600 mt-2 max-w-2xl mx-auto",
                        children: "Browse the latest antifouling systems, sealants, oils, batteries, and hardware supplied from Monastir."
                    }, void 0, false, {
                        fileName: "[project]/pages/products/index.js",
                        lineNumber: 21,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/products/index.js",
                lineNumber: 16,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-6",
                children: categories.map((category)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: `/products/${category.slug}`,
                        className: "product-card space-y-4 p-6 bg-white rounded-3xl shadow hover:shadow-xl transition transform hover:-translate-y-1",
                        "data-tilt": true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
                                src: category.image,
                                alt: category.name,
                                className: "card-img"
                            }, void 0, false, {
                                fileName: "[project]/pages/products/index.js",
                                lineNumber: 33,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                                        className: "text-lg font-semibold text-gray-900",
                                        children: category.name
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/index.js",
                                        lineNumber: 35,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-600 mt-2 leading-relaxed",
                                        children: category.description
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/index.js",
                                        lineNumber: 36,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/index.js",
                                lineNumber: 34,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between text-xs uppercase tracking-wide",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        children: [
                                            category.products.length,
                                            " products"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/products/index.js",
                                        lineNumber: 39,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "tag px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700",
                                        children: "View"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/products/index.js",
                                        lineNumber: 40,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/products/index.js",
                                lineNumber: 38,
                                columnNumber: 25
                            }, this)
                        ]
                    }, category.slug, true, {
                        fileName: "[project]/pages/products/index.js",
                        lineNumber: 27,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/pages/products/index.js",
                lineNumber: 25,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/products/index.js",
        lineNumber: 15,
        columnNumber: 9
    }, this);
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__5484a8b3._.js.map