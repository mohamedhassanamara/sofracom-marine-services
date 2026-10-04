// Catalog and gallery checks before anything is written. Pure functions (unit-tested).
// errors block the save; warnings are shown but allowed.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { slugify } = require('../../../lib/productIds.js');

const STOCK = ['in', 'out', 'on-order'];
const ID_PATTERN = /^p_[a-z0-9]{8}$/;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isPrice = value => value === '' || value === null || value === undefined || (Number.isFinite(Number(value)) && Number(value) >= 0);
const decimals = value => (String(value).split('.')[1] || '').length;

export function validateCatalog(catalog, { previousSlugs = [] } = {}) {
    const errors = [];
    const warnings = [];
    if (!catalog || !Array.isArray(catalog.categories)) return { errors: [{ path: 'catalog', message: 'The catalog must have a categories list.' }], warnings };
    const slugs = new Map();
    const ids = new Map();
    catalog.categories.forEach((category, c) => {
        const where = `categories[${c}]`;
        const name = String(category.name || '').trim();
        if (!name) errors.push({ path: `${where}.name`, message: `Category ${c + 1} needs a name.` });
        const slug = category.slug || slugify(name);
        if (!slug) errors.push({ path: `${where}.slug`, message: `Category "${name}" needs a URL slug.` });
        else if (slugs.has(slug)) errors.push({ path: `${where}.slug`, message: `Two categories use the slug "${slug}" ("${slugs.get(slug)}" and "${name}"). Slugs must be unique.` });
        else slugs.set(slug, name);
        if (slug && !SAFE_SLUG.test(slug)) {
            const entry = { path: `${where}.slug`, message: `Slug "${slug}" should only use a–z, 0–9 and dashes.` };
            // Existing URLs keep working (changing a slug breaks links); only new ones must be clean.
            (previousSlugs.includes(slug) ? warnings : errors).push(entry);
        }
        if (previousSlugs.length && category.slug && !previousSlugs.includes(category.slug) && category.products?.length) {
            warnings.push({ path: `${where}.slug`, message: `Changing a category slug changes its product URLs ("${category.slug}").` });
        }
        (category.products || []).forEach((product, p) => {
            const at = `${where}.products[${p}]`;
            const title = String(product.title || '').trim();
            const label = title || `product ${p + 1} in "${name}"`;
            if (!title) errors.push({ path: `${at}.title`, message: `A product in "${name}" has no title.` });
            if (product.id) {
                if (!ID_PATTERN.test(product.id)) errors.push({ path: `${at}.id`, message: `"${label}" has an invalid id (${product.id}).` });
                else if (ids.has(product.id)) errors.push({ path: `${at}.id`, message: `"${label}" and "${ids.get(product.id)}" share the id ${product.id}.` });
                else ids.set(product.id, label);
            }
            if (!isPrice(product.price)) errors.push({ path: `${at}.price`, message: `"${label}": the price must be a positive number.` });
            else if (decimals(product.price) > 3) errors.push({ path: `${at}.price`, message: `"${label}": prices have at most 3 decimals (millimes).` });
            if (product.stock && !STOCK.includes(product.stock)) errors.push({ path: `${at}.stock`, message: `"${label}": unknown stock value "${product.stock}".` });
            const labels = new Set();
            (product.variants || []).forEach((variant, v) => {
                const vat = `${at}.variants[${v}]`;
                const vLabel = String(variant.label || '').trim();
                if (!vLabel) errors.push({ path: `${vat}.label`, message: `"${label}": option ${v + 1} needs a label.` });
                else if (labels.has(vLabel.toLowerCase())) errors.push({ path: `${vat}.label`, message: `"${label}": two options are called "${vLabel}".` });
                labels.add(vLabel.toLowerCase());
                if (!isPrice(variant.price) || variant.price === '' || variant.price === null) errors.push({ path: `${vat}.price`, message: `"${label}": option "${vLabel || v + 1}" needs a price.` });
                else if (decimals(variant.price) > 3) errors.push({ path: `${vat}.price`, message: `"${label}": prices have at most 3 decimals.` });
                if (variant.stock && !STOCK.includes(variant.stock)) errors.push({ path: `${vat}.stock`, message: `"${label}": unknown stock value "${variant.stock}".` });
            });
            if (!(product.variants || []).length && (product.price === '' || product.price === undefined || Number(product.price) <= 0)) {
                warnings.push({ path: `${at}.price`, message: `"${label}" has no price and no options.` });
            }
            if (!product.image && !(product.images || []).length) warnings.push({ path: `${at}.images`, message: `"${label}" has no photo.` });
            for (const lang of ['fr', 'ar']) {
                if (!product.translations?.[lang]?.title) warnings.push({ path: `${at}.translations.${lang}.title`, message: `"${label}" has no ${lang.toUpperCase()} title.` });
            }
        });
    });
    return { errors, warnings };
}

export function validateGallery(gallery) {
    const errors = [];
    if (!gallery || !Array.isArray(gallery.entries)) return { errors: [{ path: 'gallery', message: 'The gallery must have an entries list.' }], warnings: [] };
    const ids = new Set();
    gallery.entries.forEach((entry, i) => {
        const label = entry.title || `entry ${i + 1}`;
        if (!entry.id) errors.push({ path: `entries[${i}].id`, message: `"${label}" has no id.` });
        else if (ids.has(entry.id)) errors.push({ path: `entries[${i}].id`, message: `Two entries share the id ${entry.id}.` });
        ids.add(entry.id);
        if (!['image', 'video'].includes(entry.type)) errors.push({ path: `entries[${i}].type`, message: `"${label}" must be an image or a video.` });
        if (!String(entry.src || '').trim()) errors.push({ path: `entries[${i}].src`, message: `"${label}" needs an image or a video link.` });
        if (!String(entry.title || '').trim()) errors.push({ path: `entries[${i}].title`, message: `Entry ${i + 1} needs a title.` });
    });
    return { errors, warnings: [] };
}
