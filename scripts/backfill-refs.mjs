#!/usr/bin/env node
// Gives every order and quote created before references existed a short ref (SOF-XXXXX /
// SOQ-XXXXX), so staff and customers can quote it and guests can use /track.
// Dry run by default; pass --apply to write.
//
//   node scripts/backfill-refs.mjs            # count what would change
//   node scripts/backfill-refs.mjs --apply    # reserve refs and write them
//
// Uses the same credentials as the API, or the emulators when FIRESTORE_EMULATOR_HOST is
// set. Run it against the emulator first.
import adminModule from '../lib/firebase/admin.js';
import { reserveRef } from '../lib/server/refs.js';

const { getDb, usingEmulators } = adminModule;
const apply = process.argv.includes('--apply');

async function backfill(collection, kind) {
    const db = getDb();
    const snapshot = await db.collection(collection).get();
    const missing = snapshot.docs.filter(doc => !doc.data().ref);
    if (apply) {
        for (const doc of missing) {
            const ref = await reserveRef(db, kind, doc.id);
            await doc.ref.update({ ref });
        }
    }
    console.log(`${collection}: ${snapshot.size} total, ${missing.length} without a ref${apply ? ' (now set)' : ''}`);
}

console.log(`Target: ${usingEmulators() ? 'EMULATOR' : 'PRODUCTION'}${apply ? '' : ' (dry run)'}`);
await backfill('orders', 'order');
await backfill('quotes', 'quote');
process.exit(0);
