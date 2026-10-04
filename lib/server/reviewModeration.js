// Review moderation and rating statistics, shared by the website API (customer
// create/edit/delete) and the local admin tool (hide/unhide). productStats counts
// published reviews only and is always updated in the same transaction as the review.
// No catalog import here, so plain Node (the local tool) can load this module.
import { getDb } from '../firebase/admin.js';
import { HttpError } from './http.js';
import { cleanString } from './validate.js';

export const REVIEW_STATUSES = ['published', 'hidden'];

const reviewsCol = () => getDb().collection('reviews');
const statsCol = () => getDb().collection('productStats');

export const emptyStats = () => ({ count: 0, sum: 0, avg: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });

// Applies a change to a stats document. `remove`/`add` are ratings (or null).
export function nextStats(current, { remove = null, add = null }) {
    const stats = current ? { ...emptyStats(), ...current, dist: { ...emptyStats().dist, ...(current.dist || {}) } } : emptyStats();
    if (remove) {
        stats.count = Math.max(0, stats.count - 1);
        stats.sum = Math.max(0, stats.sum - remove);
        stats.dist[remove] = Math.max(0, (stats.dist[remove] || 0) - 1);
    }
    if (add) {
        stats.count += 1;
        stats.sum += add;
        stats.dist[add] = (stats.dist[add] || 0) + 1;
    }
    stats.avg = stats.count ? Math.round((stats.sum / stats.count) * 100) / 100 : 0;
    stats.updatedAt = new Date().toISOString();
    return stats;
}

export const publishedRating = review => (review && review.status === 'published' ? review.rating : null);

export async function setReviewStatus(reviewId, status, staff) {
    if (!REVIEW_STATUSES.includes(status)) {
        throw new HttpError(400, 'Status must be published or hidden', 'validation');
    }
    const reviewRef = reviewsCol().doc(cleanString(reviewId, { field: 'Review id', max: 200, required: true }));
    return getDb().runTransaction(async tx => {
        const reviewSnap = await tx.get(reviewRef);
        if (!reviewSnap.exists) throw new HttpError(404, 'Review not found', 'review/not-found');
        const review = reviewSnap.data();
        const statsRef = statsCol().doc(review.productId);
        const statsSnap = await tx.get(statsRef);
        if (review.status === status) return { id: reviewRef.id, ...review };
        const updated = { ...review, status, moderatedAt: new Date().toISOString(), moderatedBy: staff.uid };
        tx.update(reviewRef, { status, moderatedAt: updated.moderatedAt, moderatedBy: staff.uid });
        tx.set(
            statsRef,
            nextStats(statsSnap.data(), { remove: publishedRating(review), add: publishedRating(updated) })
        );
        return { id: reviewRef.id, ...updated };
    });
}


// Recent reviews for staff, newest first (any status).
export async function listReviewsForStaff({ status } = {}) {
    let query = reviewsCol();
    if (REVIEW_STATUSES.includes(status)) query = query.where('status', '==', status);
    const snapshot = await query.limit(300).get();
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, 150);
}
