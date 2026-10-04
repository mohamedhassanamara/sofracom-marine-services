#!/usr/bin/env node
// One-off migration: give every product in products.json a stable `id` and record
// the title-derived id it used to have as `legacyId` (used for URL redirects and
// for carts saved before the migration). Safe to re-run: existing values are kept.
const fs = require('fs');
const path = require('path');
const { ensureProductIds, computeLegacyId } = require('../lib/productIds');

const dataPath = path.join(__dirname, '..', 'public', 'assets', 'data', 'products.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

let legacyAssigned = 0;
const seenLegacy = new Set();
(data.categories || []).forEach(category => {
    (category.products || []).forEach(product => {
        if (!product.legacyId) {
            const legacyId = computeLegacyId(product, category);
            // Duplicate titles already collided before the migration; only the first owned the URL.
            if (!seenLegacy.has(legacyId)) {
                product.legacyId = legacyId;
                legacyAssigned += 1;
            }
        }
        if (product.legacyId) seenLegacy.add(product.legacyId);
    });
});

const idsAssigned = ensureProductIds(data);

// Put the identifiers first so they are easy to spot in the file.
data.categories = data.categories.map(category => ({
    ...category,
    products: (category.products || []).map(({ id, legacyId, ...rest }) =>
        legacyId ? { id, legacyId, ...rest } : { id, ...rest }
    ),
}));

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
console.log(`Assigned ${idsAssigned} ids and ${legacyAssigned} legacy ids.`);
