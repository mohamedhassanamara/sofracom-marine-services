// The 1–3 products drawn on a category tile (home, shop menu, /products, 404, OpenGraph,
// admin preview). Categories have no picture of their own: the tile is composed from products.
//
// - Picked in the admin (category.featuredProductIds): those, in that order.
// - Otherwise automatic: when the category has APPROVED cutouts, only cutouts are drawn
//   (1, 2 or 3, each count has its own balanced layout); with none, the original photos.
//   Ranked by: in stock, then most reviewed (popularity.json, in buckets so one new review
//   rarely reshuffles a tile), then catalog order; then chosen for variety: different brands
//   and product families first, the same brand only if nothing else is left.
// Pure and deterministic: the same catalog gives the same tile on every build.
import { isCutout } from './images.js';

const STOCK_RANK = { in: 2, 'on-order': 1, out: 0 };
const usable = product => Boolean(product?.image) && !String(product.image).includes('/site/logo');

// 0 reviews → 0, 1–2 → 1, 3–9 → 2, 10+ → 3.
export const popularityBucket = count => (count >= 10 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0);

const words = text =>
    String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

// "JOTUN Thinner / Diluant N° 07 0.8L" (brand JOTUN) → "thinner": the first word that isn't
// the brand, a size or a number. Two products of one family usually share a shape.
export function productFamily(product) {
    const brand = new Set(words(product?.brand));
    return words(product?.title).find(word => !brand.has(word) && !/^\d/.test(word) && word.length > 1) || '';
}

const stockOf = product => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) return product?.stock || 'in';
    const stocks = variants.map(variant => variant.stock);
    return stocks.includes('in') ? 'in' : stocks.includes('on-order') ? 'on-order' : 'out';
};

// `products`: the category's products with their DISPLAY image (an approved cutout already
// swapped in, see lib/products.js). `popularity`: { productId: reviewCount }.
export function pickTileProducts(products = [], { featuredIds = [], popularity = {}, count = 3 } = {}) {
    const list = products.filter(usable);
    const manual = (featuredIds || []).map(id => list.find(product => product.id === id)).filter(Boolean);
    if (manual.length) return manual.slice(0, count);

    const cutouts = list.filter(product => isCutout(product.image));
    const pool = (cutouts.length ? cutouts : list)
        .map((product, index) => ({ product, index, stock: STOCK_RANK[stockOf(product)] ?? 2, popular: popularityBucket(Number(popularity[product.id]) || 0) }))
        .sort((a, b) => b.stock - a.stock || b.popular - a.popular || a.index - b.index)
        .map(entry => entry.product);

    // Variety, strictest first: new brand and new family → new family → anything left.
    const picked = [];
    const brands = new Set();
    const families = new Set();
    const rules = [
        product => !brands.has(product.brand || '') && !families.has(productFamily(product)),
        product => !families.has(productFamily(product)),
        () => true,
    ];
    for (const rule of rules) {
        for (const product of pool) {
            if (picked.length >= count) break;
            if (picked.includes(product) || !rule(product)) continue;
            picked.push(product);
            brands.add(product.brand || '');
            families.add(productFamily(product));
        }
    }
    return picked;
}

// A raw products.json product as the tile picker sees it, the same way lib/products.js
// normalizes it (for plain-Node callers such as scripts/category-og.mjs and the admin preview):
// the display image (`resolve`: approved cutout or the photo itself), brand in capitals, stock.
export function tileProduct(raw, resolve = src => src) {
    const withSlash = value => (value ? `/${String(value).replace(/^\//, '')}` : '');
    const first = (Array.isArray(raw?.images) && raw.images.find(Boolean)) || raw?.image || '';
    const stock = value => (['in', 'out', 'on-order'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'in');
    return {
        id: raw?.id,
        title: raw?.title || '',
        brand: typeof raw?.brand === 'string' ? raw.brand.trim().toUpperCase() : '',
        image: first ? (raw.keepOriginalPhoto ? withSlash(first) : resolve(withSlash(first))) : '',
        stock: stock(raw?.stock),
        variants: (Array.isArray(raw?.variants) ? raw.variants : []).map(variant => ({ stock: stock(variant?.stock ?? raw?.stock) })),
    };
}

// The tile of one (normalized) category.
export function categoryTileProducts(category, { popularity = {}, count = 3 } = {}) {
    return pickTileProducts(category?.products || [], { featuredIds: category?.featuredProductIds, popularity, count });
}
