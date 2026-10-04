import { getDb } from '../../../lib/firebase/admin';
import { apiRoute, readJson } from '../../../lib/server/http';
import { requireAdmin } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { findProduct } from '../../../lib/server/catalog';
import { REVIEW_STATUSES, setReviewStatus } from '../../../lib/server/reviews';

// Staff-only review moderation: list recent reviews and hide/unhide them.
export default apiRoute({
    GET: async (req, res) => {
        await requireAdmin(req);
        let query = getDb().collection('reviews');
        if (REVIEW_STATUSES.includes(req.query.status)) query = query.where('status', '==', req.query.status);
        const snapshot = await query.limit(300).get();
        const items = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, productTitle: findProduct(data.productId)?.product.title || data.productId };
            })
            .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
            .slice(0, 150);
        res.status(200).json({ ok: true, items });
    },

    PATCH: async (req, res) => {
        const staff = await requireAdmin(req);
        rateLimit(`admin:${staff.uid}`, { limit: 120, windowMs: MINUTE });
        const payload = await readJson(req, 10_000);
        const item = await setReviewStatus(payload.id, payload.status, staff);
        res.status(200).json({ ok: true, item });
    },
});
