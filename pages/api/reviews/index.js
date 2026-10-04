import { apiRoute, readJson, HttpError } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { deleteReview, getStats, listPublished, requireProduct, upsertReview } from '../../../lib/server/reviews';

// GET (public): published reviews + rating stats for a product, paginated.
// POST: create or edit the caller's review (verified buyers only).
// DELETE: remove the caller's review.
export default apiRoute({
    GET: async (req, res) => {
        const product = requireProduct(req.query.productId);
        const sort = ['newest', 'highest', 'lowest'].includes(req.query.sort) ? req.query.sort : 'newest';
        const [page, stats] = await Promise.all([
            listPublished(product.id, { sort, cursor: req.query.cursor, limit: req.query.limit }),
            req.query.cursor ? null : getStats(product.id),
        ]);
        res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
        res.status(200).json({ ok: true, productId: product.id, ...page, ...(stats ? { stats } : {}) });
    },

    POST: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`review:${user.uid}`, { limit: 20, windowMs: 10 * MINUTE });
        const payload = await readJson(req, 10_000);
        if (!payload || typeof payload !== 'object') throw new HttpError(400, 'Missing request body');
        const review = await upsertReview(user, payload);
        res.status(200).json({ ok: true, review, stats: await getStats(review.productId) });
    },

    DELETE: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`review:${user.uid}`, { limit: 20, windowMs: 10 * MINUTE });
        const product = requireProduct(req.query.productId);
        await deleteReview(user, product.id);
        res.status(200).json({ ok: true, stats: await getStats(product.id) });
    },
});
