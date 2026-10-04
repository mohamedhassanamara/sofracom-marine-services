import { apiRoute } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { getDb } from '../../../lib/firebase/admin';
import { findEligibleOrderId, requireProduct, reviewIdFor, reviewOverview } from '../../../lib/server/reviews';

// With ?productId: whether the caller may review that product and their existing review.
// Without: products from delivered orders still to review, plus the caller's reviews.
export default apiRoute({
    GET: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`review-read:${user.uid}`, { limit: 120, windowMs: MINUTE });
        res.setHeader('Cache-Control', 'private, no-store');
        if (req.query.productId) {
            const product = requireProduct(req.query.productId);
            const [orderId, reviewSnap] = await Promise.all([
                findEligibleOrderId(user.uid, product.id),
                getDb().collection('reviews').doc(reviewIdFor(product.id, user.uid)).get(),
            ]);
            res.status(200).json({
                ok: true,
                eligible: Boolean(orderId),
                review: reviewSnap.exists ? { id: reviewSnap.id, ...reviewSnap.data() } : null,
            });
            return;
        }
        res.status(200).json({ ok: true, ...(await reviewOverview(user.uid)) });
    },
});
