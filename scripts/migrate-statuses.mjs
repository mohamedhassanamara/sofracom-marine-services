#!/usr/bin/env node
// Converts legacy order/quote statuses (new, waiting, in_progress, treated, declined)
// to the new workflow and seeds statusHistory. Dry run by default; pass --apply to write.
//
//   node scripts/migrate-statuses.mjs            # show what would change
//   node scripts/migrate-statuses.mjs --apply    # write the changes
//
// Uses the same credentials as the API (service account or FIREBASE_* env vars), or the
// emulators when FIRESTORE_EMULATOR_HOST is set. Run it against the emulator first.
import adminModule from '../lib/firebase/admin.js';
import {
    ORDER_STATUSES,
    QUOTE_STATUSES,
    normalizeOrderStatus,
    normalizeQuoteStatus,
} from '../lib/status.js';

const { getDb, usingEmulators } = adminModule;
const apply = process.argv.includes('--apply');

async function migrate(collection, valid, normalize) {
    const db = getDb();
    const snapshot = await db.collection(collection).get();
    let changed = 0;
    let batch = db.batch();
    let pending = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const updates = {};
        const status = normalize(data.status);
        if (!valid.includes(data.status)) {
            updates.status = status;
            updates.legacyStatus = data.status ?? null;
        }
        if (!Array.isArray(data.statusHistory) || !data.statusHistory.length) {
            const history = [{ status: normalize('new'), at: data.created_at || null }];
            if (status !== history[0].status) {
                history.push({ status, at: data.status_updated_at || data.created_at || null });
            }
            updates.statusHistory = history;
        }
        if (!Object.keys(updates).length) continue;
        changed += 1;
        console.log(`${collection}/${doc.id}: ${data.status ?? '(none)'} -> ${status}`);
        if (apply) {
            batch.update(doc.ref, updates);
            pending += 1;
            if (pending === 400) {
                await batch.commit();
                batch = db.batch();
                pending = 0;
            }
        }
    }
    if (apply && pending) await batch.commit();
    return { total: snapshot.size, changed };
}

console.log(`Target: ${usingEmulators() ? 'EMULATOR' : 'PRODUCTION'} · mode: ${apply ? 'APPLY' : 'dry run'}`);
const orders = await migrate('orders', ORDER_STATUSES, normalizeOrderStatus);
const quotes = await migrate('quotes', QUOTE_STATUSES, normalizeQuoteStatus);
console.log(`orders: ${orders.changed}/${orders.total} to update · quotes: ${quotes.changed}/${quotes.total} to update`);
if (!apply) console.log('Dry run only. Re-run with --apply to write.');
process.exit(0);
