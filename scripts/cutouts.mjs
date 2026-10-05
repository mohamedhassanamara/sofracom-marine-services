#!/usr/bin/env node
// Consistent product cutouts: background removed on this computer (no upload anywhere),
// trimmed, centred on a square with the same margin, written as transparent WebP next to
// nothing the site uses yet. Originals are never touched; a manifest records every pair so
// each cutout can be approved or rejected per image.
//
//   node scripts/cutouts.mjs --sample 10            # 10 products across the categories
//   node scripts/cutouts.mjs --ids p_abc,p_def      # specific products (first photo)
//   options: --out <dir> (default public/design-lab/cutouts)
//
// Needs @imgly/background-removal-node (≈300 MB with its model, so it is not a dependency
// of the site). Install it anywhere and point BG_REMOVAL_PATH at the package folder, or
// `npm i --no-save @imgly/background-removal-node` here.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SIZE = 1600; // working canvas (the largest file written)
const MARGIN = 0.08; // empty space on each side, as a share of the canvas
const WIDTHS = [400, 800, 1600]; // same widths as every other catalog image

const arg = name => {
    const index = process.argv.indexOf(`--${name}`);
    return index > 0 ? process.argv[index + 1] : undefined;
};

async function loadRemover() {
    const from = process.env.BG_REMOVAL_PATH;
    try {
        const module = from ? await import(pathToFileURL(path.join(from, 'dist', 'index.mjs')).href) : await import('@imgly/background-removal-node');
        // The model files sit in the package's dist/ folder; tell it where (it guesses from cwd).
        const publicPath = pathToFileURL(path.join(from || path.dirname(require.resolve('@imgly/background-removal-node')), from ? 'dist' : '', path.sep)).href;
        return (input, config) => module.removeBackground(input, { publicPath, ...config });
    } catch (error) {
        console.error('Background removal is not installed. Set BG_REMOVAL_PATH or run: npm i --no-save @imgly/background-removal-node');
        console.error(error.message);
        process.exit(1);
    }
}

function pickProducts() {
    const { categories } = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/data/products.json'), 'utf-8'));
    const all = categories.flatMap(category => category.products.map(product => ({ ...product, categorySlug: category.slug })));
    const ids = arg('ids');
    if (ids) return ids.split(',').map(id => all.find(product => product.id === id)).filter(Boolean);
    // Round-robin over the categories so the sample covers cans, tubes, tools, batteries…
    const count = Number(arg('sample') || 10);
    const pools = categories.map(category => category.products.filter(product => product.image && !product.image.includes('logo')).map(product => ({ ...product, categorySlug: category.slug })));
    const picked = [];
    const brands = new Set();
    for (let round = 0; picked.length < count && pools.some(pool => pool.length); round += 1) {
        for (const pool of pools) {
            // Next product of a brand not picked yet (falls back to any once brands run out).
            const index = pool.findIndex(product => !brands.has(product.brand)) >= 0 ? pool.findIndex(product => !brands.has(product.brand)) : round > 3 ? 0 : -1;
            if (index < 0 || picked.length >= count) continue;
            const [product] = pool.splice(index, 1);
            brands.add(product.brand);
            picked.push(product);
        }
    }
    return picked;
}

// Largest available source for the best mask: the -1600 file when it exists.
const sourceFile = image => {
    const local = path.join(root, 'public', image.replace(/^\//, ''));
    const large = local.replace(/-800\.webp$/, '-1600.webp');
    return fs.existsSync(large) ? large : local;
};

async function cutout(removeBackground, file) {
    const png = await sharp(file).png().toBuffer();
    const blob = await removeBackground(new Blob([png], { type: 'image/png' }), { output: { format: 'image/png' } });
    const masked = Buffer.from(await blob.arrayBuffer());
    // Trim the transparent edges, then fit inside the canvas minus the margin, centred.
    const trimmed = await sharp(masked).trim({ threshold: 1 }).toBuffer();
    const inner = Math.round(SIZE * (1 - 2 * MARGIN));
    const fitted = await sharp(trimmed).resize({ width: inner, height: inner, fit: 'inside' }).toBuffer();
    return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: fitted, gravity: 'center' }])
        .png()
        .toBuffer();
}

const removeBackground = await loadRemover();
const outDir = path.resolve(root, arg('out') || 'public/design-lab/cutouts');
fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
for (const product of pickProducts()) {
    const started = Date.now();
    const canvas = await cutout(removeBackground, sourceFile(product.image));
    const files = {};
    for (const width of WIDTHS) {
        const name = `${product.id}-${width}.webp`;
        await sharp(canvas).resize(width).webp({ quality: width === 1600 ? 74 : 82, alphaQuality: 90, effort: 5 }).toFile(path.join(outDir, name));
        files[width] = `/${path.relative(path.join(root, 'public'), path.join(outDir, name)).split(path.sep).join('/')}`;
    }
    manifest.push({ id: product.id, categorySlug: product.categorySlug, title: product.title, original: `/${product.image.replace(/^\//, '')}`, cutout: files[800], status: 'pending' });
    console.log(`${product.id}  ${product.title.slice(0, 50).padEnd(50)}  ${Date.now() - started} ms`);
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${manifest.length} cutouts → ${path.relative(root, outDir)}`);
