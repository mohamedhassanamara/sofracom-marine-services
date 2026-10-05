#!/usr/bin/env node
// The home-page hero photo, in one step. From any photo it writes, under fixed names (so
// nothing else needs changing):
//   public/assets/site/home-hero-{400,800,1600}.webp        landscape, tablets and desktop
//   public/assets/site/home-hero-mobile-{480,720}.webp      3:4 portrait crop, phones only
//
//   node scripts/hero-image.mjs path/to/photo.jpg [--focus 0.6]
//
// --focus: where the portrait crop is centred, from 0 (left edge) to 1 (right edge).
// Then set HERO.focus in lib/siteMedia.js to the same value if the desktop crop should
// favour the same spot (CSS object-position).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/assets/site');
const MAX_BYTES = 200 * 1024;

const source = process.argv[2];
const focusIndex = process.argv.indexOf('--focus');
const focus = focusIndex > 0 ? Math.max(0, Math.min(1, Number(process.argv[focusIndex + 1]))) : 0.5;
if (!source || !fs.existsSync(source)) {
    console.error('Usage: node scripts/hero-image.mjs path/to/photo.jpg [--focus 0.6]');
    process.exit(1);
}

async function write(pipeline, width, file, height, qualities = [78, 70, 62, 54]) {
    for (const quality of qualities) {
        const buffer = await pipeline.clone().resize({ width, height, fit: 'cover', withoutEnlargement: false }).webp({ quality, effort: 5 }).toBuffer();
        if (buffer.length <= MAX_BYTES || quality === qualities[qualities.length - 1]) {
            fs.writeFileSync(path.join(out, file), buffer);
            return buffer.length;
        }
    }
    return 0;
}

const image = sharp(source).rotate();
const { width, height } = await image.metadata();
for (const size of [400, 800, 1600]) {
    const bytes = await write(image, Math.min(size, width), `home-hero-${size}.webp`);
    console.log(`home-hero-${size}.webp  ${Math.round(bytes / 1024)} KB`);
}
// Portrait 3:4 crop around the focus point, at full source height.
const cropWidth = Math.min(width, Math.round((height * 3) / 4));
const left = Math.round(Math.max(0, Math.min(width - cropWidth, focus * width - cropWidth / 2)));
const portrait = sharp(await image.clone().extract({ left, top: 0, width: cropWidth, height }).toBuffer());
for (const size of [480, 720]) {
    // Phones: smaller files first (the hero is the LCP image on slow connections).
    const bytes = await write(portrait, size, `home-hero-mobile-${size}.webp`, Math.round((size * 4) / 3), [60]);
    console.log(`home-hero-mobile-${size}.webp  ${Math.round(bytes / 1024)} KB${cropWidth < (size * 3) / 4 ? ' (upscaled: use a larger photo for sharper phones)' : ''}`);
}
