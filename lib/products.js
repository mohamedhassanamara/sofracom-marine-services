import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(
    process.cwd(),
    'public',
    'assets',
    'data',
    'products.json'
);

const ensurePath = value => {
    if (!value) return '';
    return value.startsWith('/') ? value : `/${value}`;
};

const slugify = value =>
    (value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const STOCK_STATES = new Set(['in', 'out', 'on-order']);
const normalizeStock = value => {
    if (!value || typeof value !== 'string') return 'in';
    const normalized = value.toLowerCase();
    return STOCK_STATES.has(normalized) ? normalized : 'in';
};

const normalizeProduct = (product, category) => {
    const categorySlug = category.slug || slugify(category.name);
    const id = `${categorySlug}-${slugify(product.title)}`;
    const rawImages =
        Array.isArray(product.images) && product.images.length
            ? product.images
            : product.image
                ? [product.image]
                : [];
    const images = rawImages.map(ensurePath).filter(Boolean);
    const fallbackImage = images[0] || ensurePath(product.image) || '/logo.jpeg';

    const variants = Array.isArray(product.variants)
        ? product.variants.map(variant => ({
              label: variant.label || 'Variant',
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
        categoryName: category.name,
        categorySlug,
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

function loadRawData() {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
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
        const product = category.products.find(prod => prod.id === productId);
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
        }))
    );
}
