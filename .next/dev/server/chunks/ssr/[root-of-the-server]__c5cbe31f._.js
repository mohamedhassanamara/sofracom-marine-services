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
"[project]/pages/products/[slug].js [ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

const e = new Error("Could not parse module '[project]/pages/products/[slug].js', file not found");
e.code = 'MODULE_UNPARSABLE';
throw e;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c5cbe31f._.js.map