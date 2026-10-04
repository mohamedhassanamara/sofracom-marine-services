// Human summary of catalog/gallery changes between the last commit and the files on disk.
const FIELDS = ['title', 'brand', 'description', 'price', 'stock', 'image', 'images', 'variants', 'usage', 'datasheet', 'translations'];
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function diffCatalog(before, after) {
    const index = catalog => {
        const map = new Map();
        (catalog?.categories || []).forEach(category => (category.products || []).forEach(product => map.set(product.id || `${category.slug}/${product.title}`, { ...product, category: category.name })));
        return map;
    };
    const old = index(before);
    const now = index(after);
    const products = { added: [], removed: [], changed: [] };
    for (const [id, product] of now) {
        const previous = old.get(id);
        if (!previous) products.added.push({ id, title: product.title, category: product.category });
        else {
            const fields = FIELDS.filter(field => !same(previous[field], product[field]));
            if (previous.category !== product.category) fields.push('category');
            if (fields.length) products.changed.push({ id, title: product.title, fields });
        }
    }
    for (const [id, product] of old) if (!now.has(id)) products.removed.push({ id, title: product.title, category: product.category });

    const oldCats = new Map((before?.categories || []).map((category, index) => [category.slug, { ...category, index }]));
    const newCats = new Map((after?.categories || []).map((category, index) => [category.slug, { ...category, index }]));
    const categories = { added: [], removed: [], changed: [] };
    for (const [slug, category] of newCats) {
        const previous = oldCats.get(slug);
        if (!previous) categories.added.push({ slug, name: category.name });
        else {
            const fields = ['name', 'description', 'image', 'translations'].filter(field => !same(previous[field], category[field]));
            if (previous.index !== category.index) fields.push('order');
            if (fields.length) categories.changed.push({ slug, name: category.name, fields });
        }
    }
    for (const [slug, category] of oldCats) if (!newCats.has(slug)) categories.removed.push({ slug, name: category.name });
    return { products, categories };
}

export function diffGallery(before, after) {
    const old = new Map((before?.entries || []).map((entry, index) => [entry.id, { ...entry, index }]));
    const now = new Map((after?.entries || []).map((entry, index) => [entry.id, { ...entry, index }]));
    const result = { added: [], removed: [], changed: [] };
    for (const [id, entry] of now) {
        const previous = old.get(id);
        if (!previous) result.added.push({ id, title: entry.title });
        else {
            const fields = ['title', 'description', 'type', 'src', 'tags', 'date', 'translations'].filter(field => !same(previous[field], entry[field]));
            if (previous.index !== entry.index) fields.push('order');
            if (fields.length) result.changed.push({ id, title: entry.title, fields });
        }
    }
    for (const [id, entry] of old) if (!now.has(id)) result.removed.push({ id, title: entry.title });
    return result;
}

export const isEmptyDiff = ({ catalog, gallery }) =>
    [catalog.products.added, catalog.products.removed, catalog.products.changed, catalog.categories.added, catalog.categories.removed, catalog.categories.changed, gallery.added, gallery.removed, gallery.changed].every(list => !list.length);
