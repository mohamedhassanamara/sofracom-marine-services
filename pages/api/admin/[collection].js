import { apiRoute, readJson, HttpError } from '../../../lib/server/http.js';
import { requireDevice } from '../../../lib/server/auth.js';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit.js';
import { COLLECTIONS, changeStatus } from '../../../lib/server/statusUpdates.js';

// Staff phone app only: change an order/quote status (appends to statusHistory).
// Accepts ONLY enrolled, active device tokens; website accounts are refused even
// with an admin claim. Staff on a computer use the local admin tool instead.
const resolveCollection = req => {
    const collection = String(req.query.collection || '');
    if (!COLLECTIONS[collection]) throw new HttpError(404, 'Not found');
    return collection;
};

export default apiRoute({
    PATCH: async (req, res) => {
        const collection = resolveCollection(req);
        const device = await requireDevice(req);
        rateLimit(`device:${device.deviceId}`, { limit: 120, windowMs: MINUTE });
        const payload = await readJson(req, 10_000);
        const item = await changeStatus(collection, payload, device);
        res.status(200).json({ ok: true, item });
    },
});
