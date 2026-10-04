// Staff status changes for orders and quotes. Every change appends to statusHistory
// inside a transaction so concurrent edits never lose entries.
import { getDb } from '../firebase/admin';
import {
    ORDER_STATUSES,
    QUOTE_STATUSES,
    normalizeOrderStatus,
    normalizeQuoteStatus,
} from '../status';
import { HttpError } from './http';
import { cleanString } from './validate';

export const COLLECTIONS = {
    orders: { statuses: ORDER_STATUSES, normalize: normalizeOrderStatus },
    quotes: { statuses: QUOTE_STATUSES, normalize: normalizeQuoteStatus },
};

export async function listForStaff(collection, { status, limit = 100 } = {}) {
    const config = COLLECTIONS[collection];
    const snapshot = await getDb()
        .collection(collection)
        .orderBy('created_at', 'desc')
        .limit(Math.min(Math.max(Number(limit) || 100, 1), 300))
        .get();
    const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id, status: config.normalize(data.status) };
    });
    return status && config.statuses.includes(status) ? docs.filter(doc => doc.status === status) : docs;
}

export async function changeStatus(collection, { id, status, note }, staff) {
    const config = COLLECTIONS[collection];
    const docId = cleanString(id, { field: 'Id', max: 128, required: true });
    if (!config.statuses.includes(status)) {
        throw new HttpError(400, `Status must be one of ${config.statuses.join(', ')}`, 'validation');
    }
    const cleanNote = cleanString(note, { field: 'Note', max: 500 });
    const ref = getDb().collection(collection).doc(docId);

    return getDb().runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new HttpError(404, 'Not found', 'not-found');
        const data = snapshot.data();
        const current = config.normalize(data.status);
        if (current === status && !cleanNote) {
            throw new HttpError(400, 'Status is unchanged', 'status/unchanged');
        }
        const at = new Date().toISOString();
        const history = Array.isArray(data.statusHistory) && data.statusHistory.length
            ? data.statusHistory
            : [{ status: current, at: data.status_updated_at || data.created_at || at }];
        const entry = { status, at, by: staff.uid, ...(cleanNote ? { note: cleanNote } : {}) };
        const updates = { status, status_updated_at: at, statusHistory: [...history, entry] };
        tx.update(ref, updates);
        return { ...data, ...updates, id: docId };
    });
}
