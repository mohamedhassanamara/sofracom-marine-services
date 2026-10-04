import { apiRoute, readJson, HttpError } from '../../../lib/server/http';
import { requireAdmin } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { COLLECTIONS, changeStatus, listForStaff } from '../../../lib/server/statusUpdates';

// Staff-only: list orders or quotes, and change their status (appends to history).
// Requires the `admin: true` custom claim on the caller's Firebase token.
const resolveCollection = req => {
    const collection = String(req.query.collection || '');
    if (!COLLECTIONS[collection]) throw new HttpError(404, 'Not found');
    return collection;
};

export default apiRoute({
    GET: async (req, res) => {
        const collection = resolveCollection(req);
        await requireAdmin(req);
        const items = await listForStaff(collection, { status: req.query.status, limit: req.query.limit });
        res.status(200).json({ ok: true, items });
    },

    PATCH: async (req, res) => {
        const collection = resolveCollection(req);
        const staff = await requireAdmin(req);
        rateLimit(`admin:${staff.uid}`, { limit: 120, windowMs: MINUTE });
        const payload = await readJson(req, 10_000);
        const item = await changeStatus(collection, payload, staff);
        res.status(200).json({ ok: true, item });
    },
});
