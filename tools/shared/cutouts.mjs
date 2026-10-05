// Product photo cutouts: background removed on this computer, trimmed, centred on a square
// with the same margin, saved as transparent WebP (400/800/1600). Originals are never touched.
//
// Two places, so only approved files ever reach git:
//   .cutouts-cache/ (git-ignored)   every generated cutout + manifest.json {src: {file, model, updatedAt}}
//   public/assets/products/cutouts/  only APPROVED cutouts (copied from the cache on approval)
//   public/assets/data/cutouts.json  the decisions, published with the catalog:
//                                    {src: {status: "approved", cutout, …} | {status: "original"}}
// A photo with a cached cutout and no decision is "pending"; without either it is "missing".
// The site shows a cutout only when it is approved (lib/cutouts.js).
//
// Used by scripts/cutouts.mjs (batches from the terminal) and the admin app (Photos page).
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
export const CACHE_DIR = '.cutouts-cache';
export const STATUSES = ['pending', 'approved', 'original'];
export const MODELS = ['medium', 'small'];
const SIZE = 1600; // canvas = the largest file written
const MARGIN = 0.08; // empty space on each side, as a share of the canvas
const WIDTHS = [400, 800, 1600];
const MAX_BYTES = 200 * 1024;

const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const withSlash = value => (value ? `/${String(value).replace(/^\//, '')}` : '');
const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : fallback);
const writeJson = (file, images) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(file, `${JSON.stringify({ version: 1, images: sorted }, null, 2)}\n`);
};
const cacheFiles = repoRoot => path.join(repoRoot, CACHE_DIR, 'files');
const cacheManifestPath = repoRoot => path.join(repoRoot, CACHE_DIR, 'manifest.json');

// The published decisions.
export const readManifest = repoRoot => ({ version: 1, images: readJson(path.join(repoRoot, MANIFEST), { images: {} }).images || {} });
export const writeManifest = (repoRoot, manifest) => writeJson(path.join(repoRoot, MANIFEST), manifest.images);
// What has been generated on this computer.
export const readCache = repoRoot => ({ version: 1, images: readJson(cacheManifestPath(repoRoot), { images: {} }).images || {} });
const writeCache = (repoRoot, cache) => writeJson(cacheManifestPath(repoRoot), cache.images);

const publicPath = file => `/${OUT_DIR.replace(/^public\//, '')}/${file}-800.webp`;
const removePublished = (repoRoot, entry) => {
    if (!entry?.cutout) return;
    const stem = path.basename(entry.cutout).replace(/-800\.webp$/, '');
    for (const width of WIDTHS) fs.rmSync(path.join(repoRoot, OUT_DIR, `${stem}-${width}.webp`), { force: true });
};

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
                    seen.set(key, { src: key, productId: product.id, title: product.title, categorySlug: category.slug, position: index, needsPhoto: Boolean(product.needsPhoto) });
                }
            });
        }
    }
    return [...seen.values()];
}

// Status of one photo: a decision wins; else a cached cutout is pending; else missing.
const statusOf = (decision, cached) => decision?.status || (cached ? 'pending' : 'missing');

// Catalog photos with their status, model and a preview path: the published file once
// approved, else the cached one (served by the admin at /cutouts-cache/…).
export function photoStates(repoRoot) {
    const decisions = readManifest(repoRoot).images;
    const cache = readCache(repoRoot).images;
    return catalogImages(repoRoot).map(image => {
        const decision = decisions[image.src];
        const cached = cache[image.src];
        const status = statusOf(decision, cached);
        const preview = status === 'approved' ? decision.cutout : cached ? `/cutouts-cache/${cached.file}-800.webp` : null;
        return { ...image, status, model: cached?.model || decision?.model || null, updatedAt: cached?.updatedAt || decision?.updatedAt || null, preview };
    });
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
    const modelPath = pathToFileURL(`${dist}${path.sep}`).href;
    remover = (input, config) => module.removeBackground(input, { publicPath: modelPath, ...config });
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

// Generates (or regenerates) the cutout of one original into the cache. A new cutout must
// be reviewed again, so an earlier decision for this photo is cleared (and unpublished).
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

    const file = `${stemOf(key)}-cut`;
    fs.mkdirSync(cacheFiles(repoRoot), { recursive: true });
    for (const width of WIDTHS) fs.writeFileSync(path.join(cacheFiles(repoRoot), `${file}-${width}.webp`), await encode(canvas, width));
    const cache = readCache(repoRoot);
    cache.images[key] = { file, model, updatedAt: new Date().toISOString() };
    writeCache(repoRoot, cache);

    const manifest = readManifest(repoRoot);
    if (manifest.images[key]) {
        removePublished(repoRoot, manifest.images[key]);
        delete manifest.images[key];
        writeManifest(repoRoot, manifest);
    }
    return { src: key, status: 'pending', ...cache.images[key] };
}

// Approve (copy the cached files into public), Keep original (no files), or back to review.
export function setStatus(repoRoot, sources, status) {
    if (!STATUSES.includes(status)) throw fail(400, `Unknown status: ${status}`, 'validation');
    const list = [...new Set((Array.isArray(sources) ? sources : [sources]).map(withSlash))];
    if (!list.length) throw fail(400, 'No images selected', 'validation');
    const manifest = readManifest(repoRoot);
    const cache = readCache(repoRoot).images;
    const now = new Date().toISOString();
    // Check everything first, so a bad entry changes nothing.
    for (const src of list) {
        if (!cache[src] && !manifest.images[src]) throw fail(400, `No cutout yet for ${src}`, 'validation');
        if (status === 'approved' && manifest.images[src]?.status !== 'approved') {
            const files = cache[src] && WIDTHS.map(width => path.join(cacheFiles(repoRoot), `${cache[src].file}-${width}.webp`));
            if (!files || !files.every(file => fs.existsSync(file))) throw fail(409, `The cutout files for ${src} are not on this computer. Generate it again (Retry), then approve.`, 'cutouts/not-cached');
        }
    }
    fs.mkdirSync(path.join(repoRoot, OUT_DIR), { recursive: true });
    for (const src of list) {
        const current = manifest.images[src];
        if (status === 'approved') {
            if (current?.status === 'approved') continue;
            const { file, model } = cache[src];
            for (const width of WIDTHS) fs.copyFileSync(path.join(cacheFiles(repoRoot), `${file}-${width}.webp`), path.join(repoRoot, OUT_DIR, `${file}-${width}.webp`));
            manifest.images[src] = { status: 'approved', cutout: publicPath(file), model, updatedAt: now };
        } else {
            removePublished(repoRoot, current);
            if (status === 'original') manifest.images[src] = { status: 'original', updatedAt: now };
            else delete manifest.images[src];
        }
    }
    writeManifest(repoRoot, manifest);
    return list.map(src => ({ src, status: statusOf(manifest.images[src], cache[src]) }));
}

// Photos with neither a cutout nor a decision, in catalog order.
export function missing(repoRoot) {
    return photoStates(repoRoot).filter(image => image.status === 'missing');
}
