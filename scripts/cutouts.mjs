#!/usr/bin/env node
// Product photo cutouts in batches (see tools/shared/cutouts.mjs). New cutouts are
// "pending": review them in the admin app (Photos) before the site uses them.
//
//   node scripts/cutouts.mjs                 # next 25 photos without a cutout
//   node scripts/cutouts.mjs --all           # every photo without a cutout, 25 at a time
//   node scripts/cutouts.mjs --batch 10      # batch size
//   node scripts/cutouts.mjs --src /assets/products/x-800.webp [--model small]   # one photo again
//
// Needs BG_REMOVAL_PATH (or `npm i --no-save @imgly/background-removal-node`).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRemover, makeCutout, missing } from '../tools/shared/cutouts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => {
    const index = process.argv.indexOf(`--${name}`);
    return index > 0 ? process.argv[index + 1] : undefined;
};

try {
    await loadRemover();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}

const model = arg('model') || 'medium';
if (arg('src')) {
    const entry = await makeCutout(root, arg('src'), { model });
    console.log(`${entry.src} → ${entry.cutout} (pending)`);
    process.exit(0);
}

const size = Number(arg('batch') || 25);
const all = process.argv.includes('--all');
let done = 0;
let failed = 0;
const skip = new Set(); // failed this run: not retried in the next batch
do {
    const batch = missing(root).filter(image => !skip.has(image.src)).slice(0, size);
    if (!batch.length) break;
    let batchDone = 0;
    for (const image of batch) {
        const started = Date.now();
        try {
            await makeCutout(root, image.src, { model });
            done += 1;
            batchDone += 1;
            console.log(`${String(done).padStart(4)}  ${image.productId}  ${image.title.slice(0, 48).padEnd(48)}  ${Date.now() - started} ms`);
        } catch (error) {
            failed += 1;
            skip.add(image.src);
            console.error(`FAILED ${image.src}: ${error.message}`);
        }
    }
    if (!batchDone) break; // a whole batch failed: stop rather than retry it forever
} while (all);
console.log(`\n${done} cutouts written (pending review), ${failed} failed, ${missing(root).length} photos still without a cutout.`);
