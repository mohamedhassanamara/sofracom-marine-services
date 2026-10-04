// Order and quote status workflows, shared by the site, API routes and scripts.
// Documents written before the new workflow use legacy values (new, waiting,
// in_progress, treated, declined); normalize*Status maps them for display and logic.

export const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled',
];

// The happy path shown as a timeline; `cancelled` can happen at any point.
export const ORDER_FLOW = ORDER_STATUSES.filter(status => status !== 'cancelled');

export const QUOTE_STATUSES = [
    'received',
    'in_review',
    'quoted',
    'accepted',
    'declined',
    'completed',
];

export const QUOTE_FLOW = ['received', 'in_review', 'quoted', 'accepted', 'completed'];

const LEGACY_ORDER = {
    new: 'pending',
    waiting: 'pending',
    in_progress: 'preparing',
    treated: 'delivered',
    declined: 'cancelled',
};

const LEGACY_QUOTE = {
    new: 'received',
    waiting: 'in_review',
    in_progress: 'in_review',
    treated: 'completed',
    declined: 'declined',
};

export const normalizeOrderStatus = value => {
    const status = String(value || '').toLowerCase();
    if (ORDER_STATUSES.includes(status)) return status;
    return LEGACY_ORDER[status] || 'pending';
};

export const normalizeQuoteStatus = value => {
    const status = String(value || '').toLowerCase();
    if (QUOTE_STATUSES.includes(status)) return status;
    return LEGACY_QUOTE[status] || 'received';
};

// The status history to display; documents without one get a single synthetic entry.
export const historyFor = (doc, normalize) => {
    const history = Array.isArray(doc?.statusHistory) ? doc.statusHistory : [];
    if (history.length) {
        return history.map(entry => ({ ...entry, status: normalize(entry.status) }));
    }
    return [{ status: normalize(doc?.status), at: doc?.status_updated_at || doc?.created_at || null }];
};

// Short, human-friendly reference shown to customers and staff (first 8 chars of the id).
export const shortId = id => String(id || '').slice(0, 8).toUpperCase();
