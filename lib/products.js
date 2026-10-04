import rawCatalog from '../public/assets/data/products.json';
import { computeLegacyId, slugify } from './productIds';

const ensurePath = value => {
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
};

const STOCK_STATES = new Set(['in', 'out', 'on-order']);
const normalizeStock = value => {
    if (!value || typeof value !== 'string') return 'in';
    const normalized = value.toLowerCase();
    return STOCK_STATES.has(normalized) ? normalized : 'in';
};


const normalizeProduct = (product, category) => {
    const categorySlug = category.slug || slugify(category.name);
    const legacyId = product.legacyId || computeLegacyId(product, category);
    const id = product.id || legacyId;
    const rawImages =
        Array.isArray(product.images) && product.images.length
            ? product.images
            : product.image
                ? [product.image]
                : [];
    const images = rawImages.map(ensurePath).filter(Boolean);
    const fallbackImage = images[0] || ensurePath(product.image) || '/assets/site/logo-800.webp';

    const variants = Array.isArray(product.variants)
        ? product.variants.map(variant => ({
              label: variant.label || '',
              price: Number.isFinite(variant.price)
                  ? variant.price
                  : Number(variant.price) || 0,
              stock: normalizeStock(variant.stock ?? product.stock),
          }))
        : [];

    const price =
        Number.isFinite(product.price) && product.price > 0
            ? product.price
            : variants[0]?.price || 0;

    return {
        ...product,
        id,
        legacyId,
        categoryName: category.name,
        categorySlug,
        // Brands are entered by hand ("bosch", "BOSCH "); filters and badges need one spelling.
        brand: typeof product.brand === 'string' ? product.brand.trim().toUpperCase() : '',
        image: fallbackImage,
        images: images.length ? images : [fallbackImage],
        datasheet: ensurePath(product.datasheet),
        variants,
        price,
        stock: normalizeStock(product.stock),
        usage: Array.isArray(product.usage) ? product.usage : [],
    };
};

const buildCategories = rawCategories =>
    (rawCategories || []).map(raw => {
        const slug = raw.slug || slugify(raw.name);
        return {
            ...raw,
            slug,
            image: ensurePath(raw.image),
            products:
                Array.isArray(raw.products) && raw.products.length
                    ? raw.products.map(product =>
                          normalizeProduct(product, { ...raw, slug })
                      )
                    : [],
        };
    });

// Imported (not read with fs) so serverless API routes bundle the catalog.
function loadRawData() {
    return rawCatalog;
}

export function getCategories() {
    const parsed = loadRawData();
    return buildCategories(parsed.categories || []);
}

export function getCategoryBySlug(slug) {
    if (!slug) return null;
    const categories = getCategories();
    return categories.find(category => category.slug === slug) || null;
}

export function getCategorySlugs() {
    const categories = getCategories();
    return categories.map(category => category.slug);
}

export function getProductById(productId) {
    if (!productId) return null;
    const categories = getCategories();
    for (const category of categories) {
        const product = category.products.find(
            prod => prod.id === productId || prod.legacyId === productId
        );
        if (product) {
            return { product, category };
        }
    }
    return null;
}

export function getProductPaths() {
    const categories = getCategories();
    return categories.flatMap(category =>
        category.products.map(product => ({
            categorySlug: category.slug,
            productId: product.id,
            legacyId: product.legacyId,
        }))
    );
}

// Only what a product card needs (titles + option labels in every language), to keep page
// data small: descriptions and the rest stay on the product page.
export function cardProduct(product) {
    const translations = Object.fromEntries(
        Object.entries(product.translations || {}).map(([lang, entry]) => [
            lang,
            {
                ...(entry?.title ? { title: entry.title } : {}),
                ...(Array.isArray(entry?.variants) ? { variants: entry.variants.map(variant => ({ label: variant?.label || '' })) } : {}),
            },
        ])
    );
    return {
        id: product.id,
        categorySlug: product.categorySlug,
        categoryName: product.categoryName,
        title: product.title,
        brand: product.brand || '',
        image: product.image,
        price: product.price,
        stock: product.stock,
        usage: product.usage || [],
        variants: (product.variants || []).map(({ label, price, stock }) => ({ label, price, stock })),
        translations,
    };
}

export function cardCategory(category) {
    return {
        slug: category.slug,
        name: category.name,
        description: category.description || '',
        image: category.image,
        translations: Object.fromEntries(
            Object.entries(category.translations || {}).map(([lang, entry]) => [lang, { name: entry?.name || '', description: entry?.description || '' }])
        ),
        count: category.products.length,
    };
}

// A spread across departments: in-stock products with a photo, taken in turn from each category.
export function featuredProducts(categories, count = 8) {
    const pools = categories.map(category => category.products.filter(product => product.stock !== 'out' && product.image && !product.image.includes('logo')));
    const picked = [];
    for (let round = 0; picked.length < count && pools.some(pool => pool.length > round); round += 1) {
        for (const pool of pools) {
            if (pool[round] && picked.length < count) picked.push(pool[round]);
        }
    }
    return picked;
}
