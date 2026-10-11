#!/usr/bin/env node
// Link-preview pictures for category pages: public/og/categories/<slug>.jpg (1200×630, git-
// ignored), composed like the category tiles from the same 1–3 products (lib/categoryTiles.js):
// approved cutouts as they are, ordinary photos multiplied into the surface colour.
// Runs before `next build` (npm run build); `node scripts/category-og.mjs` to make them by hand.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { pickTileProducts, tileProduct } from '../lib/categoryTiles.js';
import { cutoutResolver } from '../lib/cutouts.js';
import { isCutout } from '../lib/images.js';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const tokens = require('../lib/design/tokens.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'og', 'categories');
const W = 1200;
const H = 630;
const AREA = { x: 300, y: 60, w: 840, h: 510 }; // where the products go (the logo sits at the left)
// [x, y, w, h] as shares of AREA, drawn in this order (the first product last, on top).
const LAYOUTS = {
    1: [[0.15, 0.04, 0.7, 0.92]],
    2: [[0.04, 0.06, 0.5, 0.88], [0.52, 0.14, 0.44, 0.8]],
    3: [[0.26, 0, 0.48, 0.96], [0, 0.32, 0.36, 0.66], [0.64, 0.32, 0.36, 0.66]],
};
const ORDER = { 1: [0], 2: [0, 1], 3: [1, 2, 0] };

const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf-8'));
const file = src => path.join(ROOT, 'public', src.replace(/^\//, ''));

export async function categoryOgImage({ products }) {
    const surface = tokens.colors.surface.DEFAULT;
    const layers = [];
    const logo = await sharp(file('/assets/site/logo-400.webp')).resize(120, 120).toBuffer();
    layers.push({ input: logo, left: 90, top: Math.round((H - 120) / 2) });
    const boxes = LAYOUTS[products.length] || [];
    for (const index of ORDER[products.length] || []) {
        const product = products[index];
        const [bx, by, bw, bh] = boxes[index];
        const box = { w: Math.round(AREA.w * bw), h: Math.round(AREA.h * bh) };
        const source = fs.existsSync(file(product.image)) ? file(product.image) : null;
        if (!source) continue;
        const fitted = await sharp(source).resize({ width: box.w, height: box.h, fit: 'inside' }).toBuffer();
        const meta = await sharp(fitted).metadata();
        layers.push({
            input: fitted,
            left: Math.round(AREA.x + AREA.w * bx + (box.w - meta.width) / 2),
            top: Math.round(AREA.y + AREA.h * by + (box.h - meta.height) / 2),
            // White photo backgrounds disappear into the surface; cutouts keep their colours.
            ...(isCutout(product.image) ? {} : { blend: 'multiply' }),
        });
    }
    return sharp({ create: { width: W, height: H, channels: 3, background: surface } })
        .composite(layers)
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
}

async function main() {
    const catalog = readJson('public/assets/data/products.json');
    const resolve = cutoutResolver(readJson('public/assets/data/cutouts.json'));
    const popularity = readJson('public/assets/data/popularity.json').counts || {};
    fs.mkdirSync(OUT, { recursive: true });
    for (const category of catalog.categories) {
        const products = pickTileProducts((category.products || []).map(raw => tileProduct(raw, resolve)), { featuredIds: category.featuredProductIds, popularity });
        const slug = category.slug;
        fs.writeFileSync(path.join(OUT, `${slug}.jpg`), await categoryOgImage({ products }));
        console.log(`og: ${slug} (${products.length} product${products.length === 1 ? '' : 's'}${products.some(p => isCutout(p.image)) ? ', cutouts' : ''})`);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
