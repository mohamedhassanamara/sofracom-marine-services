// Product photo cutouts: background removed on this computer, trimmed, centred on a square
// with the same margin, saved as transparent WebP (400/800/1600) next to the originals.
// Nothing is replaced: public/assets/data/cutouts.json records, per original photo, its
// cutout and a status, and the site shows a cutout only once it is "approved".
//
//   status: pending  → generated, waiting for review (the site shows the original)
//           approved → the site shows the cutout
//           original → reviewed, keep the original photo
//
// Used by scripts/cutouts.mjs (batches from the terminal) and the admin app (review page).
// Background removal needs @imgly/background-removal-node (≈300 MB with its model, so it
// is not a dependency of the site): set BG_REMOVAL_PATH to the installed package folder,
// or `npm i --no-save @imgly/background-removal-node` in this repository.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

export const MANIFEST = 'public/assets/data/cutouts.json';
export const OUT_DIR = 'public/assets/products/cutouts';
export const STATUSES = ['pending', 'approved', 'original'];
export const MODELS = ['medium', 'small'];
const SIZE = 1600; // canvas = the largest file written
const MARGIN = 0.08; // empty space on each side, as a share of the canvas
const WIDTHS = [400, 800, 1600];
const MAX_BYTES = 200 * 1024;

const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const withSlash = value => (value ? `/${String(value).replace(/^\//, '')}` : '');

export function readManifest(repoRoot) {
    const file = path.join(repoRoot, MANIFEST);
    if (!fs.existsSync(file)) return { version: 1, images: {} };
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return { version: 1, images: data.images || {} };
}

export function writeManifest(repoRoot, manifest) {
    const images = Object.fromEntries(Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(path.join(repoRoot, MANIFEST), `${JSON.stringify({ version: 1, images }, null, 2)}\n`);
}

// Every product photo in the catalog, once, with the product it belongs to.
export function catalogImages(repoRoot) {
    const { categories } = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public/assets/data/products.json'), 'utf-8'));
    const seen = new Map();
    for (const category of categories) {
        for (const product of category.products || []) {
            const list = (Array.isArray(product.images) && product.images.length ? product.images : [product.image]).filter(Boolean);
            list.forEach((src, index) => {
                const key = withSlash(src);
                if (!seen.has(key) && !key.includes('/site/logo')) {
                    seen.set(key, { src: key, productId: product.id, title: product.title, categorySlug: category.slug, position: index });
                }
            });
        }
    }
    return [...seen.values()];
}

let remover = null;
export async function loadRemover() {
    if (remover) return remover;
    const from = process.env.BG_REMOVAL_PATH;
    let module;
    try {
        module = from ? await import(pathToFileURL(path.join(from, 'dist', 'index.mjs')).href) : await import('@imgly/background-removal-node');
    } catch {
        throw fail(503, 'Background removal is not installed. Set BG_REMOVAL_PATH to the @imgly/background-removal-node folder, or run: npm i --no-save @imgly/background-removal-node', 'cutouts/unavailable');
    }
    // Its model files sit in the package's dist/ folder; tell it where (it guesses from cwd).
    const dist = from ? path.join(from, 'dist') : path.dirname(require.resolve('@imgly/background-removal-node'));
    const publicPath = pathToFileURL(`${dist}${path.sep}`).href;
    remover = (input, config) => module.removeBackground(input, { publicPath, ...config });
    return remover;
}

// The biggest available file of an original (better mask), on disk.
const sourceFile = (repoRoot, src) => {
    const local = path.join(repoRoot, 'public', src.replace(/^\//, ''));
    const large = local.replace(/-(400|800)\.webp$/, '-1600.webp');
    if (fs.existsSync(large)) return large;
    if (fs.existsSync(local)) return local;
    throw fail(404, `Image file not found: ${src}`, 'not-found');
};

const stemOf = src =>
    path
        .basename(src)
        .replace(/-(400|800|1600)\.webp$/, '')
        .replace(/\.[a-z0-9]+$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-');

async function encode(canvas, width) {
    for (const quality of [82, 76, 70, 62, 54]) {
        const buffer = await sharp(canvas).resize(width).webp({ quality, alphaQuality: 90, effort: 5 }).toBuffer();
        if (buffer.length <= MAX_BYTES) return buffer;
    }
    return sharp(canvas).resize(width).webp({ quality: 48, alphaQuality: 80, effort: 6 }).toBuffer();
}

// Generates (or regenerates) the cutout of one original and records it as pending.
export async function makeCutout(repoRoot, src, { model = 'medium' } = {}) {
    if (!MODELS.includes(model)) throw fail(400, `Unknown model: ${model}`, 'validation');
    const removeBackground = await loadRemover();
    const key = withSlash(src);
    const png = await sharp(sourceFile(repoRoot, key)).rotate().png().toBuffer();
    const blob = await removeBackground(new Blob([png], { type: 'image/png' }), { model, output: { format: 'image/png' } });
    const masked = Buffer.from(await blob.arrayBuffer());
    // Trim the transparent edges, fit inside the canvas minus the margin, centre.
    const trimmed = await sharp(masked).trim({ threshold: 1 }).toBuffer();
    const inner = Math.round(SIZE * (1 - 2 * MARGIN));
    const fitted = await sharp(trimmed).resize({ width: inner, height: inner, fit: 'inside' }).toBuffer();
    const canvas = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: fitted, gravity: 'center' }])
        .png()
        .toBuffer();

    const dir = path.join(repoRoot, OUT_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const stem = `${stemOf(key)}-cut`;
    for (const width of WIDTHS) fs.writeFileSync(path.join(dir, `${stem}-${width}.webp`), await encode(canvas, width));

    const manifest = readManifest(repoRoot);
    const entry = { cutout: `/${OUT_DIR.replace(/^public\//, '')}/${stem}-800.webp`, status: 'pending', model, updatedAt: new Date().toISOString() };
    manifest.images[key] = entry;
    writeManifest(repoRoot, manifest);
    return { src: key, ...entry };
}

// Sets the status of several originals at once (Approve / Keep original / back to review).
export function setStatus(repoRoot, sources, status) {
    if (!STATUSES.includes(status)) throw fail(400, `Unknown status: ${status}`, 'validation');
    const list = (Array.isArray(sources) ? sources : [sources]).map(withSlash);
    if (!list.length) throw fail(400, 'No images selected', 'validation');
    const manifest = readManifest(repoRoot);
    const missing = list.filter(src => !manifest.images[src]);
    if (missing.length) throw fail(400, `No cutout yet for ${missing[0]}`, 'validation');
    const now = new Date().toISOString();
    list.forEach(src => {
        manifest.images[src] = { ...manifest.images[src], status, updatedAt: now };
    });
    writeManifest(repoRoot, manifest);
    return list.map(src => ({ src, ...manifest.images[src] }));
}

// Originals without a cutout yet, in catalog order.
export function missing(repoRoot) {
    const manifest = readManifest(repoRoot);
    return catalogImages(repoRoot).filter(image => !manifest.images[image.src]);
}
