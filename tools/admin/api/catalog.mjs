// products.json / gallery.json on disk: read, validate, save (with a version check so an
// outside change, e.g. a git pull, is never silently overwritten), uploads, review queue.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { validateCatalog, validateGallery } from './validate.mjs';

const require = createRequire(import.meta.url);
const { ensureProductIds, slugify } = require('../../../lib/productIds.js');
const images = require('../../shared/images.js');

const BUCKETS = {
    products: { type: 'image', maxBytes: 15 * 1024 * 1024 },
    categories: { type: 'image', maxBytes: 15 * 1024 * 1024 },
    gallery: { type: 'image', maxBytes: 15 * 1024 * 1024 },
    datasheets: { type: 'pdf', maxBytes: 12 * 1024 * 1024 },
};
const RESIZABLE = /^image\/(jpeg|png|webp|avif|tiff|heic|heif)$/;

const fail = (status, message, code, details) => Object.assign(new Error(message), { status, code, details });

export function createCatalogStore({ repoRoot }) {
    const files = {
        catalog: path.join(repoRoot, 'public', 'assets', 'data', 'products.json'),
        gallery: path.join(repoRoot, 'public', 'assets', 'data', 'gallery.json'),
    };
    const readJson = file => JSON.parse(fs.readFileSync(file, 'utf-8'));
    const version = kind => crypto.createHash('sha1').update(fs.readFileSync(files[kind])).digest('hex').slice(0, 12);
    const write = (kind, data) => fs.writeFileSync(files[kind], `${JSON.stringify(data, null, 2)}\n`);

    const checkVersion = (kind, expected) => {
        if (expected && expected !== version(kind)) {
            throw fail(409, `${kind === 'catalog' ? 'products.json' : 'gallery.json'} changed on disk since you opened it (another tool or a git pull). Reload to see the current version; your unsaved edits are still on screen.`, 'conflict');
        }
    };

    function readCatalog() {
        return readJson(files.catalog);
    }

    function validate(catalog) {
        const previousSlugs = readCatalog().categories.map(category => category.slug || slugify(category.name));
        return validateCatalog(catalog, { previousSlugs });
    }

    // Problems already in the saved catalog don't block other edits (they're reported as
    // warnings); only problems this save would introduce do.
    function checkForSave(catalog) {
        const result = validate(catalog);
        const existing = new Set(validate(readCatalog()).errors.map(error => error.message));
        return {
            errors: result.errors.filter(error => !existing.has(error.message)),
            warnings: [...result.errors.filter(error => existing.has(error.message)).map(error => ({ ...error, message: `Already in the catalog, please fix: ${error.message}` })), ...result.warnings],
        };
    }

    function saveCatalog(catalog, { version: expected } = {}) {
        checkVersion('catalog', expected);
        const result = checkForSave(catalog);
        if (result.errors.length) throw fail(400, result.errors[0].message, 'validation', result.errors);
        const data = JSON.parse(JSON.stringify(catalog));
        data.categories.forEach(category => {
            category.slug = category.slug || slugify(category.name);
        });
        // Stable ids key reviews, ratings and orders: new products get one, none is ever changed.
        ensureProductIds(data);
        data.categories = data.categories.map(category => ({
            ...category,
            products: (category.products || []).map(({ id, legacyId, ...rest }) => (legacyId ? { id, legacyId, ...rest } : { id, ...rest })),
        }));
        write('catalog', data);
        return { catalog: data, version: version('catalog'), warnings: result.warnings };
    }

    function readGallery() {
        return readJson(files.gallery);
    }

    function saveGallery(gallery, { version: expected } = {}) {
        checkVersion('gallery', expected);
        const result = validateGallery(gallery);
        if (result.errors.length) throw fail(400, result.errors[0].message, 'validation', result.errors);
        write('gallery', gallery);
        return { gallery, version: version('gallery'), warnings: [] };
    }

    // { dataUrl, filename, bucket } → { path } (photos: WebP 400/800/1600, the -800 path).
    async function upload({ dataUrl, filename, bucket }) {
        const config = BUCKETS[bucket];
        if (!config) throw fail(400, 'Unknown upload folder', 'validation');
        const match = typeof dataUrl === 'string' && dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
        if (!match) throw fail(400, 'The file could not be read', 'validation');
        const [, mime, base64] = match;
        const buffer = Buffer.from(base64, 'base64');
        if (!buffer.length) throw fail(400, 'The file is empty', 'validation');
        if (buffer.length > config.maxBytes) throw fail(413, `The file is larger than ${config.maxBytes / 1024 / 1024} MB`, 'payload-too-large');
        const dir = path.join(repoRoot, 'public', 'assets', bucket);
        fs.mkdirSync(dir, { recursive: true });
        const base = images.stemOf(filename || bucket);
        if (config.type === 'image') {
            if (!RESIZABLE.test(mime)) throw fail(400, 'Photos must be JPEG, PNG, WebP, AVIF or HEIC', 'validation');
            const { main } = await images.writeResponsive(buffer, dir, images.uniqueStem(dir, base));
            return { path: path.relative(path.join(repoRoot, 'public'), main).split(path.sep).join('/') };
        }
        if (mime !== 'application/pdf') throw fail(400, 'Datasheets must be PDF files', 'validation');
        let name = `${base}.pdf`;
        for (let n = 2; fs.existsSync(path.join(dir, name)); n += 1) name = `${base}-${n}.pdf`;
        fs.writeFileSync(path.join(dir, name), buffer);
        return { path: `assets/${bucket}/${name}` };
    }

    const products = () => readCatalog().categories.flatMap(category => (category.products || []).map(product => ({ ...product, categorySlug: category.slug })));

    // Products/categories whose translations need a look: flagged drafts or missing.
    function translationQueue() {
        const catalog = readCatalog();
        const items = [];
        for (const category of catalog.categories) {
            for (const lang of ['fr', 'ar']) {
                const entry = category.translations?.[lang];
                if (!entry?.name || entry.needsReview) items.push({ kind: 'category', slug: category.slug, title: category.name, lang, reason: entry?.name ? 'review' : 'missing' });
            }
            for (const product of category.products || []) {
                for (const lang of ['fr', 'ar']) {
                    const entry = product.translations?.[lang];
                    if (!entry?.title || entry.needsReview) items.push({ kind: 'product', id: product.id, title: product.title, lang, reason: entry?.title ? 'review' : 'missing', suggestion: entry?.suggestedTitle || null });
                }
            }
        }
        return { count: items.length, items: items.slice(0, 200) };
    }

    return { readCatalog, saveCatalog, validate, readGallery, saveGallery, upload, products, translationQueue, version };
}
