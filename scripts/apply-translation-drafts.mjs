#!/usr/bin/env node
// Fills missing catalog translations from a drafts file (default: scripts/data/ar-drafts.json)
// and marks each one `needsReview: true` so it shows up for review in the admin.
// Never overwrites an existing translation. Dry run by default; pass --apply to write.
//
//   node scripts/apply-translation-drafts.mjs [--apply] [--lang ar] [--file path]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => {
    const index = process.argv.indexOf(name);
    return index > 0 ? process.argv[index + 1] : null;
};
const APPLY = process.argv.includes('--apply');
const LANG = arg('--lang') || 'ar';
const draftsFile = arg('--file') || path.join(ROOT, 'scripts', 'data', `${LANG}-drafts.json`);
const catalogPath = path.join(ROOT, 'public', 'assets', 'data', 'products.json');

const drafts = JSON.parse(fs.readFileSync(draftsFile, 'utf-8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
const changes = [];
const skipped = [];

for (const category of catalog.categories) {
    const draft = drafts.categories?.[category.slug];
    if (draft) {
        category.translations = category.translations || {};
        const entry = (category.translations[LANG] = category.translations[LANG] || {});
        let touched = false;
        for (const field of ['name', 'description']) {
            if (draft[field] && !entry[field]) {
                entry[field] = draft[field];
                touched = true;
            }
        }
        if (touched) {
            entry.needsReview = true;
            changes.push(`category ${category.slug}`);
        } else skipped.push(`category ${category.slug} (already translated)`);
    }
    for (const product of category.products) {
        const title = drafts.products?.[product.id];
        if (!title) continue;
        product.translations = product.translations || {};
        const entry = (product.translations[LANG] = product.translations[LANG] || {});
        if (entry.title) {
            skipped.push(`${product.id} (already has a ${LANG} title)`);
            continue;
        }
        entry.title = title;
        entry.needsReview = true;
        changes.push(`${product.id} ${product.title} → ${title}`);
    }
}

console.log(`${changes.length} ${LANG} draft(s) ${APPLY ? 'applied' : 'to apply (dry run)'}; ${skipped.length} skipped`);
changes.forEach(line => console.log(`  + ${line}`));
skipped.forEach(line => console.log(`  = ${line}`));
if (APPLY) fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
