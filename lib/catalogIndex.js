// A slim view of the catalog for the header (mega menu, search suggestions) and search:
// the browser never downloads products.json. Built by /api/catalog-index.
import { imageAt } from './images.js';
import { priceRange } from './format.js';

const LANGS = ['en', 'fr', 'ar'];

const localized = (entity, field) =>
    Object.fromEntries(LANGS.map(lang => [lang, (lang !== 'en' && entity?.translations?.[lang]?.[field]) || entity?.[field] || '']));

const stockOf = product => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length) return product.stock || 'in';
    const stocks = variants.map(variant => variant.stock);
    return stocks.includes('in') ? 'in' : stocks.includes('on-order') ? 'on-order' : 'out';
};

// `categories` as returned by lib/products getCategories().
export function buildCatalogIndex(categories) {
    return {
        categories: categories.map(category => ({
            slug: category.slug,
            name: localized(category, 'name'),
            image: imageAt(category.image, 400),
            count: category.products.length,
        })),
        products: categories.flatMap(category =>
            category.products.map(product => {
                const { min, varies } = priceRange(product);
                return {
                    id: product.id,
                    categorySlug: category.slug,
                    title: localized(product, 'title'),
                    brand: product.brand || '',
                    image: imageAt(product.image, 400),
                    price: min,
                    varies,
                    options: Array.isArray(product.variants) ? product.variants.length : 0,
                    variants: (product.variants || []).map((variant, index) => ({
                        label: Object.fromEntries(LANGS.map(lang => [lang, (lang !== 'en' && product.translations?.[lang]?.variants?.[index]?.label) || variant.label || ''])),
                        price: variant.price,
                        stock: variant.stock,
                    })),
                    stock: stockOf(product),
                    usage: Array.isArray(product.usage) ? product.usage : [],
                };
            })
        ),
    };
}

// Lowercase, no accents/diacritics (é → e, Arabic harakat dropped), single spaces.
export const normalizeText = value =>
    String(value || '')
        .normalize('NFKD')
        .replace(/[̀-ًͯ-ٰٟ]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();

// Products matching every word of `query`, best first: title starts with it, title contains
// it, brand, then category/usage. Titles match in the page language and in English.
export function searchProducts(index, query, lang = 'en') {
    const words = normalizeText(query).split(' ').filter(Boolean);
    if (!words.length || !index) return [];
    const categoryName = Object.fromEntries((index.categories || []).map(category => [category.slug, category.name]));
    const scored = [];
    for (const product of index.products || []) {
        const title = normalizeText(`${product.title[lang] || ''} ${product.title.en || ''}`);
        const brand = normalizeText(product.brand);
        const rest = normalizeText(`${Object.values(categoryName[product.categorySlug] || {}).join(' ')} ${product.usage.join(' ')}`);
        const haystack = `${title} ${brand} ${rest}`;
        if (!words.every(word => haystack.includes(word))) continue;
        const phrase = words.join(' ');
        let score = 0;
        if (title.startsWith(phrase)) score += 100;
        else if (title.includes(phrase)) score += 60;
        if (brand.startsWith(words[0])) score += 40;
        score += words.filter(word => title.includes(word)).length * 10;
        if (product.stock === 'in') score += 2;
        scored.push({ product, score });
    }
    return scored.sort((a, b) => b.score - a.score).map(entry => entry.product);
}

// An index entry in the shape ProductCard and the cart expect, in one language.
export const indexToCardProduct = (entry, lang = 'en') => ({
    id: entry.id,
    categorySlug: entry.categorySlug,
    title: entry.title[lang] || entry.title.en,
    brand: entry.brand,
    image: entry.image,
    price: entry.price,
    stock: entry.stock,
    usage: entry.usage,
    variants: (entry.variants || []).map(variant => ({ label: variant.label[lang] || variant.label.en, price: variant.price, stock: variant.stock })),
});
