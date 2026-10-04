#!/usr/bin/env node
// Converts every image referenced by the catalog and gallery (and the site's own photos and
// brand logos) to WebP at 400/800/1600 px, ≤200 KB each, points the JSON at the -800 file
// and deletes the originals. Safe to run again: optimized paths are skipped.
//
//   node scripts/optimize-images.mjs                       # dry run: what would change
//   node scripts/optimize-images.mjs --apply               # convert + rewrite JSON + delete originals
//   node scripts/optimize-images.mjs --apply --delete-unreferenced
//                                                          # also delete asset files nothing references
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { isOptimized, stemOf, writeResponsive, WIDTHS } = require('../tools/shared/images.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const APPLY = process.argv.includes('--apply');
const DELETE_UNREFERENCED = process.argv.includes('--delete-unreferenced');
const RASTER = /\.(png|jpe?g|webp|gif|tiff?)$/i;
const ASSET_DIRS = ['assets/products', 'assets/categories', 'assets/datasheets', 'assets/gallery'];
const CODE_DIRS = ['pages', 'components', 'lib', 'styles', 'contexts', 'hooks', 'tools'];

// Site photos and logos used directly by the code: source → output directory + stem
// (+ true to keep the source: logo.jpeg is also the favicon / JSON-LD / OpenGraph logo).
const SITE_IMAGES = [
    ['logo.jpeg', 'assets/site', 'logo', true],
    ['hero.jpeg', 'assets/site', 'hero'],
    ['monastir1.jpeg', 'assets/site', 'monastir-1'],
    ['monastir2.jpeg', 'assets/site', 'monastir-2'],
    ['assets/akzonobel.png', 'assets/brands', 'akzonobel'],
    ['assets/bosch.png', 'assets/brands', 'bosch'],
    ['assets/crown.png', 'assets/brands', 'crown'],
    ['assets/hempel.png', 'assets/brands', 'hempel'],
    ['assets/international.png', 'assets/brands', 'international'],
    ['assets/jotun.png', 'assets/brands', 'jotun'],
    ['assets/sika.png', 'assets/brands', 'sika'],
    ['assets/varta.png', 'assets/brands', 'varta'],
];

const rel = abs => path.relative(PUBLIC, abs).split(path.sep).join('/');
const strip = value => (value || '').replace(/^\/+/, '');
const keepSlash = (original, next) => (original.startsWith('/') ? `/${next}` : next);
const mb = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const sizeOf = file => (fs.existsSync(file) ? fs.statSync(file).size : 0);

const walk = dir =>
    fs.existsSync(dir)
        ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
              const full = path.join(dir, entry.name);
              return entry.isDirectory() ? walk(full) : [full];
          })
        : [];

// Source code mentioning a file name keeps it alive (e.g. /logo.jpeg as a fallback).
const codeText = CODE_DIRS.flatMap(dir => walk(path.join(ROOT, dir)))
    .filter(file => /\.(m?js|jsx|css|html)$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`))
    .map(file => fs.readFileSync(file, 'utf-8'))
    .join('\n');
const usedByCode = relPath => codeText.includes(relPath) || codeText.includes(path.basename(relPath));

// Old path → new path, so old orders, saved carts and outside links keep working
// (next.config.js turns it into permanent redirects).
const redirectsPath = path.join(ROOT, 'lib/data/image-redirects.json');
const catalogPath = path.join(PUBLIC, 'assets/data/products.json');
const galleryPath = path.join(PUBLIC, 'assets/data/gallery.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
const gallery = JSON.parse(fs.readFileSync(galleryPath, 'utf-8'));

// Every image reference in the JSON (current values), with a setter to rewrite it.
const collectRefs = () => {
    const found = [];
    const addRef = (value, set) => {
        if (typeof value === 'string' && value.trim() && !/^https?:/.test(value)) found.push({ value, set });
    };
    for (const category of catalog.categories || []) {
        addRef(category.image, v => (category.image = v));
        for (const product of category.products || []) {
            addRef(product.image, v => (product.image = v));
            (product.images || []).forEach((image, index) => addRef(image, v => (product.images[index] = v)));
        }
    }
    for (const entry of gallery.entries || []) {
        if (entry.type !== 'video') addRef(entry.src, v => (entry.src = v));
    }
    return found;
};
const refs = collectRefs();

const jobs = new Map(); // source rel path → { source, outDir, stem }
const claimed = new Map(); // outDir/stem → source (two sources must not share a stem)
const claim = (source, outDir, wanted) => {
    let stem = wanted;
    for (let n = 2; claimed.has(`${outDir}/${stem}`) && claimed.get(`${outDir}/${stem}`) !== source; n += 1) stem = `${wanted}-${n}`;
    claimed.set(`${outDir}/${stem}`, source);
    return stem;
};

const missing = [];
for (const ref of refs) {
    const source = strip(ref.value);
    if (!RASTER.test(source) || isOptimized(source)) continue;
    if (!fs.existsSync(path.join(PUBLIC, source))) {
        missing.push(source);
        continue;
    }
    if (!jobs.has(source)) {
        const outDir = path.posix.dirname(source);
        jobs.set(source, { source, outDir, stem: claim(source, outDir, stemOf(source)) });
    }
    const job = jobs.get(source);
    ref.set(keepSlash(ref.value, `${job.outDir}/${job.stem}-800.webp`));
}
for (const [source, outDir, stem, keep = false] of SITE_IMAGES) {
    if (fs.existsSync(path.join(PUBLIC, source)) && !jobs.has(source)) {
        jobs.set(source, { source, outDir, stem: claim(source, outDir, stem), keep });
    }
}

const before = [...jobs.keys()].reduce((sum, source) => sum + sizeOf(path.join(PUBLIC, source)), 0);
console.log(`${jobs.size} image(s) to convert (${mb(before)})${APPLY ? '' : ' [dry run]'}`);
if (missing.length) console.log(`Referenced but missing (left as is):\n  ${[...new Set(missing)].join('\n  ')}`);

let after = 0;
const queue = [...jobs.values()];
const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
        if (!APPLY) continue;
        const { files } = await writeResponsive(path.join(PUBLIC, job.source), path.join(PUBLIC, job.outDir), job.stem, { skipFresh: true });
        after += files.reduce((sum, file) => sum + sizeOf(file), 0);
        process.stdout.write('.');
    }
};
await Promise.all(Array.from({ length: 4 }, worker));
if (APPLY && jobs.size) process.stdout.write('\n');

if (APPLY) {
    fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    fs.writeFileSync(galleryPath, `${JSON.stringify(gallery, null, 2)}\n`);
}

const redirects = fs.existsSync(redirectsPath) ? JSON.parse(fs.readFileSync(redirectsPath, 'utf-8')) : {};
for (const job of jobs.values()) redirects[`/${job.source}`] = `/${job.outDir}/${job.stem}-800.webp`;
if (APPLY) {
    fs.mkdirSync(path.dirname(redirectsPath), { recursive: true });
    const sorted = Object.fromEntries(Object.entries(redirects).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(redirectsPath, `${JSON.stringify(sorted, null, 2)}\n`);
}

// Originals: deleted once converted, unless the code still names them.
const currentRefs = collectRefs();
const stillReferenced = new Set(currentRefs.map(ref => strip(ref.value)));
const removable = [...jobs.values()]
    .map(job => job.source)
    .filter(source => !jobs.get(source).keep && !stillReferenced.has(source) && !usedByCode(source));
const kept = [...jobs.values()].map(job => job.source).filter(source => !removable.includes(source));
if (APPLY) removable.forEach(source => fs.unlinkSync(path.join(PUBLIC, source)));
console.log(`Originals ${APPLY ? 'deleted' : 'to delete'}: ${removable.length}${kept.length ? ` (kept, still used by code: ${kept.join(', ')})` : ''}`);
if (APPLY) console.log(`Converted: ${mb(before)} → ${mb(after)} (${WIDTHS.join('/')} px WebP)`);

// Files in the asset folders that nothing references.
const live = new Set();
for (const ref of currentRefs) {
    const value = strip(ref.value);
    live.add(value);
    if (isOptimized(value)) WIDTHS.forEach(width => live.add(value.replace(/-(400|800|1600)\.webp$/, `-${width}.webp`)));
}
for (const category of catalog.categories || []) {
    for (const product of category.products || []) if (product.datasheet) live.add(strip(product.datasheet));
}
const unreferenced = ASSET_DIRS.flatMap(dir => walk(path.join(PUBLIC, dir)))
    .map(rel)
    .filter(file => !live.has(file) && !path.basename(file).startsWith('.') && !usedByCode(file))
    .filter(file => APPLY || !removable.includes(file));
const unreferencedBytes = unreferenced.reduce((sum, file) => sum + sizeOf(path.join(PUBLIC, file)), 0);
console.log(`Unreferenced asset files: ${unreferenced.length} (${mb(unreferencedBytes)})`);
unreferenced.forEach(file => console.log(`  ${file}`));
if (APPLY && DELETE_UNREFERENCED) {
    unreferenced.forEach(file => fs.unlinkSync(path.join(PUBLIC, file)));
    console.log(`Deleted ${unreferenced.length} unreferenced file(s).`);
}
