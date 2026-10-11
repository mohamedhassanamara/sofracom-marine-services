// Staff work on orders and quotes for the local admin app: searchable, paged lists (not
// just the latest 100), detail, internal notes, quote replies and the "Today" counts.
// Plain Node can load it (explicit .js imports, no catalog JSON), like statusUpdates.js.
//
// Lists scan newest-first in batches and filter in memory, because older documents carry
// legacy status values (new, waiting…) that only normalize*Status understands. At this
// shop's volume (hundreds of documents) that is cheap and needs no extra indexes.
import { getDb } from '../firebase/admin.js';
import { normalizeOrderStatus, normalizeQuoteStatus } from '../status.js';
import { HttpError } from './http.js';
import { normalizeRef } from './refs.js';
import { cleanString } from './validate.js';

const NORMALIZE = { orders: normalizeOrderStatus, quotes: normalizeQuoteStatus };
const BATCH = 200;
const MAX_SCAN = 3000;

const digits = value => String(value || '').replace(/\D/g, '');
const fold = value =>
    String(value || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

const shape = (collection, doc) => {
    const data = doc.data();
    return { ...data, id: doc.id, status: NORMALIZE[collection](data.status) };
};

// Does `item` match the free-text search? Ref, id prefix, name, phone digits, email,
// subject/details, or a product title in the lines.
export function matchesQuery(item, query) {
    const q = fold(query).trim();
    if (!q) return true;
    const ref = normalizeRef(query);
    if (ref) return item.ref === ref;
    const qDigits = digits(query);
    if (qDigits.length >= 4 && digits(item.customer_phone).includes(qDigits)) return true;
    const haystack = fold(
        [
            item.ref,
            item.id,
            item.customer_name,
            item.customer_email,
            item.email,
            item.customer_address,
            item.subject,
            item.details,
            item.product_title,
            ...(Array.isArray(item.items) ? item.items.map(line => line.title) : []),
        ].join(' ')
    );
    return q.split(/\s+/).every(word => haystack.includes(word));
}

// { items, nextCursor } — newest first. `cursor` is the created_at of the last item seen.
export async function searchForStaff(collection, { status = '', q = '', from = '', to = '', pageSize = 25, cursor = '' } = {}) {
    if (!NORMALIZE[collection]) throw new HttpError(400, 'Unknown collection', 'validation');
    const size = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
    const db = getDb();

    // A reference goes straight to its document.
    const ref = normalizeRef(q);
    if (ref) {
        const target = await db.collection('refs').doc(ref).get();
        const kind = collection === 'orders' ? 'order' : 'quote';
        if (!target.exists || target.data().kind !== kind) return { items: [], nextCursor: null };
        const doc = await db.collection(collection).doc(target.data().docId).get();
        return { items: doc.exists ? [shape(collection, doc)] : [], nextCursor: null };
    }

    const items = [];
    let last = cursor || null;
    let scanned = 0;
    let exhausted = false;
    while (items.length < size && scanned < MAX_SCAN) {
        let query = db.collection(collection).orderBy('created_at', 'desc');
        if (to) query = query.where('created_at', '<=', `${to}T23:59:59.999Z`);
        if (last) query = query.startAfter(last);
        const snapshot = await query.limit(BATCH).get();
        if (snapshot.empty) {
            exhausted = true;
            break;
        }
        let stop = false;
        for (const doc of snapshot.docs) {
            const item = shape(collection, doc);
            if (from && String(item.created_at) < from) {
                exhausted = true;
                stop = true;
                break;
            }
            last = item.created_at;
            scanned += 1;
            if ((status && item.status !== status) || !matchesQuery(item, q)) continue;
            items.push(item);
            if (items.length === size) {
                stop = true;
                break;
            }
        }
        if (stop) break;
        if (snapshot.size < BATCH) {
            exhausted = true;
            break;
        }
    }
    return { items, nextCursor: items.length === size && !exhausted ? last : null };
}

export async function getForStaff(collection, id) {
    const docId = cleanString(id, { field: 'Id', max: 128, required: true });
    const doc = await getDb().collection(collection).doc(docId).get();
    if (!doc.exists) throw new HttpError(404, 'Not found', 'not-found');
    return shape(collection, doc);
}

// Internal staff notes (never shown to customers; status notes are).
export async function addStaffNote(collection, { id, text }, staff) {
    const docId = cleanString(id, { field: 'Id', max: 128, required: true });
    const note = cleanString(text, { field: 'Note', min: 1, max: 1000, required: true });
    const ref = getDb().collection(collection).doc(docId);
    return getDb().runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new HttpError(404, 'Not found', 'not-found');
        const data = snapshot.data();
        const staffNotes = [...(Array.isArray(data.staffNotes) ? data.staffNotes : []), { at: new Date().toISOString(), by: staff.uid, text: note }];
        tx.update(ref, { staffNotes });
        return { ...data, staffNotes, id: docId, status: NORMALIZE[collection](data.status) };
    });
}

// The quote's price and the reply sent to the customer. Moves the request to "quoted"
// (with the reply as the timeline note) unless it is already past that step.
export async function setQuoteReply({ id, amount, note }, staff) {
    const docId = cleanString(id, { field: 'Id', max: 128, required: true });
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) throw new HttpError(400, 'Enter the quoted amount in TND', 'quote/amount');
    const reply = cleanString(note, { field: 'Reply', max: 2000 });
    const ref = getDb().collection('quotes').doc(docId);
    return getDb().runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new HttpError(404, 'Not found', 'not-found');
        const data = snapshot.data();
        const current = normalizeQuoteStatus(data.status);
        const at = new Date().toISOString();
        const updates = {
            quoted_amount: Math.round(value * 1000) / 1000,
            quoted_currency: 'TND',
            reply_note: reply,
            reply_at: at,
            reply_by: staff.uid,
        };
        if (['received', 'in_review'].includes(current)) {
            const history = Array.isArray(data.statusHistory) && data.statusHistory.length ? data.statusHistory : [{ status: current, at: data.created_at || at }];
            updates.status = 'quoted';
            updates.status_updated_at = at;
            updates.statusHistory = [...history, { status: 'quoted', at, by: staff.uid, ...(reply ? { note: reply } : {}) }];
        }
        tx.update(ref, updates);
        return { ...data, ...updates, id: docId, status: normalizeQuoteStatus(updates.status || data.status) };
    });
}

async function countRecent(collection, predicate, scan = 500) {
    const snapshot = await getDb().collection(collection).orderBy('created_at', 'desc').limit(scan).get();
    return snapshot.docs.map(doc => shape(collection, doc)).filter(predicate);
}

// What needs attention: new orders, open quotes, recent reviews.
export async function todayForStaff({ reviewDays = 7 } = {}) {
    const since = new Date(Date.now() - reviewDays * 86_400_000).toISOString();
    const [orders, quotes, reviews] = await Promise.all([
        countRecent('orders', item => item.status === 'pending'),
        countRecent('quotes', item => ['received', 'in_review'].includes(item.status)),
        getDb().collection('reviews').limit(500).get(),
    ]);
    const recentReviews = reviews.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(review => String(review.updatedAt || review.createdAt || '') >= since)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return {
        newOrders: { count: orders.length, items: orders.slice(0, 5) },
        openQuotes: { count: quotes.length, items: quotes.slice(0, 5) },
        recentReviews: { count: recentReviews.length, items: recentReviews.slice(0, 5) },
    };
}
