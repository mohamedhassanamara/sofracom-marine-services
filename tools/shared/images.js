// Responsive WebP derivatives for catalog, gallery and site images.
// Every image becomes <stem>-400.webp, <stem>-800.webp and <stem>-1600.webp (never upscaled,
// each kept under MAX_BYTES), and the JSON stores the -800 path. lib/images.js builds the
// srcset back from that path. Used by scripts/optimize-images.mjs and the admin uploads.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTHS = [400, 800, 1600];
const DEFAULT_WIDTH = 800;
const MAX_BYTES = 200 * 1024;
const QUALITIES = [78, 70, 62, 54, 46, 40];
const OPTIMIZED = /-(400|800|1600)\.webp$/;

const isOptimized = file => OPTIMIZED.test(file);

const stemOf = file =>
    path
        .basename(file, path.extname(file))
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'image';

// Lowers the quality, then (very detailed photos) the width, until the file fits MAX_BYTES.
async function encode(input, width) {
    let buffer = null;
    for (let scale = 1; scale >= 0.6; scale -= 0.1) {
        for (const quality of QUALITIES) {
            buffer = await sharp(input, { failOn: 'none' })
                .rotate() // apply EXIF orientation from phone photos
                .resize({ width: Math.round(width * scale), withoutEnlargement: true })
                .webp({ quality, effort: 5 })
                .toBuffer();
            if (buffer.length <= MAX_BYTES) return buffer;
        }
    }
    return buffer;
}

// Writes the derivatives of `input` (path or Buffer) into `outDir` as <stem>-<w>.webp.
// Returns { stem, files: [absolute paths], main: absolute path of the -800 file }.
// With `skipFresh`, derivatives newer than the source file are kept as they are.
async function writeResponsive(input, outDir, stem, { widths = WIDTHS, skipFresh = false } = {}) {
    fs.mkdirSync(outDir, { recursive: true });
    const sourceTime = typeof input === 'string' ? fs.statSync(input).mtimeMs : Infinity;
    const files = [];
    for (const width of widths) {
        const target = path.join(outDir, `${stem}-${width}.webp`);
        const fresh = skipFresh && fs.existsSync(target) && fs.statSync(target).mtimeMs >= sourceTime && fs.statSync(target).size <= MAX_BYTES;
        if (!fresh) fs.writeFileSync(target, await encode(input, width));
        files.push(target);
    }
    const main = files[widths.indexOf(DEFAULT_WIDTH)] || files[files.length - 1];
    return { stem, files, main };
}

// A stem not used by any existing derivative in `dir` (uploads must never overwrite).
function uniqueStem(dir, stem) {
    let candidate = stem;
    let n = 2;
    while (WIDTHS.some(width => fs.existsSync(path.join(dir, `${candidate}-${width}.webp`)))) {
        candidate = `${stem}-${n}`;
        n += 1;
    }
    return candidate;
}

module.exports = { WIDTHS, DEFAULT_WIDTH, MAX_BYTES, isOptimized, stemOf, uniqueStem, writeResponsive };
