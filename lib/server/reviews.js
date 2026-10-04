// Verified-buyer product reviews. One review per user per product
// (reviews/{productId}_{uid}); productStats/{productId} is updated in the same
// transaction as every review change, counting published reviews only.
import { getDb } from '../firebase/admin';
import { findProduct } from './catalog';
import { HttpError } from './http';
import { cleanLang, cleanString } from './validate';
import { userRef } from './users';

export const MAX_COMMENT = 1000;
export const REVIEW_STATUSES = ['published', 'hidden'];

const reviewsCol = () => getDb().collection('reviews');
const statsCol = () => getDb().collection('productStats');
export const reviewIdFor = (productId, uid) => `${productId}_${uid}`;

// "Mohamed Hassan Amara" -> "Mohamed A."; single names are kept as they are.
export function displayNameFrom(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0, 40);
    return `${parts[0].slice(0, 40)} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// Reviews are keyed by the stable product id; legacy ids resolve to it.
export function requireProduct(productId) {
    const entry = findProduct(String(productId || ''));
    if (!entry) throw new HttpError(404, 'Product not found', 'review/unknown-product');
    return entry.product;
}

const eligibleOrdersQuery = (uid, productId) => {
    let query = getDb().collection('orders').where('uid', '==', uid).where('status', '==', 'delivered');
    if (productId) query = query.where('productIds', 'array-contains', productId);
    return query;
};

export async function findEligibleOrderId(uid, productId) {
    const snapshot = await eligibleOrdersQuery(uid, productId).limit(1).get();
    return snapshot.empty ? null : snapshot.docs[0].id;
}

const emptyStats = () => ({ count: 0, sum: 0, avg: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });

// Applies a change to a stats document. `remove`/`add` are ratings (or null).
function nextStats(current, { remove = null, add = null }) {
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

const publishedRating = review => (review && review.status === 'published' ? review.rating : null);

export function cleanReviewInput(payload) {
    const rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new HttpError(400, 'Rating must be a whole number from 1 to 5', 'review/invalid-rating');
    }
    const comment = cleanString(payload.comment, { field: 'Comment', max: MAX_COMMENT });
    return { rating, comment, lang: cleanLang(payload.lang) };
}

export async function upsertReview(user, payload) {
    const product = requireProduct(payload.productId);
    const input = cleanReviewInput(payload);
    const db = getDb();
    const reviewRef = reviewsCol().doc(reviewIdFor(product.id, user.uid));
    const statsRef = statsCol().doc(product.id);

    return db.runTransaction(async tx => {
        const [orders, reviewSnap, statsSnap, userSnap] = await Promise.all([
            tx.get(eligibleOrdersQuery(user.uid, product.id).limit(1)),
            tx.get(reviewRef),
            tx.get(statsRef),
            tx.get(userRef(user.uid)),
        ]);
        // Eligibility is decided here, from delivered orders, never from the request.
        if (orders.empty) {
            throw new HttpError(403, 'Only customers who received this product can review it.', 'review/not-eligible');
        }
        const now = new Date().toISOString();
        const existing = reviewSnap.exists ? reviewSnap.data() : null;
        const status = existing?.status === 'hidden' ? 'hidden' : 'published';
        const review = {
            productId: product.id,
            uid: user.uid,
            displayName: displayNameFrom(userSnap.data()?.name || user.name) || 'SOFRACOM customer',
            rating: input.rating,
            comment: input.comment,
            lang: input.lang,
            orderId: orders.docs[0].id,
            status,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        };
        tx.set(reviewRef, review);
        tx.set(
            statsRef,
            nextStats(statsSnap.data(), { remove: publishedRating(existing), add: publishedRating(review) })
        );
        return { id: reviewRef.id, ...review, created: !existing };
    });
}

export async function deleteReview(user, productId) {
    const product = requireProduct(productId);
    const reviewRef = reviewsCol().doc(reviewIdFor(product.id, user.uid));
    const statsRef = statsCol().doc(product.id);
    await getDb().runTransaction(async tx => {
        const [reviewSnap, statsSnap] = await Promise.all([tx.get(reviewRef), tx.get(statsRef)]);
        if (!reviewSnap.exists) throw new HttpError(404, 'Review not found', 'review/not-found');
        tx.delete(reviewRef);
        const removed = publishedRating(reviewSnap.data());
        if (removed) tx.set(statsRef, nextStats(statsSnap.data(), { remove: removed }));
    });
}

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

// Public shape: no uid or order id.
export const publicReview = (id, review) => ({
    id,
    displayName: review.displayName,
    rating: review.rating,
    comment: review.comment,
    lang: review.lang,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    verified: true,
});

const SORTS = {
    newest: [['createdAt', 'desc']],
    highest: [['rating', 'desc'], ['createdAt', 'desc']],
    lowest: [['rating', 'asc'], ['createdAt', 'desc']],
};

export async function listPublished(productId, { sort = 'newest', cursor, limit = 10 } = {}) {
    const order = SORTS[sort] || SORTS.newest;
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 30);
    let query = reviewsCol().where('productId', '==', productId).where('status', '==', 'published');
    order.forEach(([field, direction]) => {
        query = query.orderBy(field, direction);
    });
    if (cursor) {
        const cursorSnap = await reviewsCol().doc(String(cursor).slice(0, 200)).get();
        if (cursorSnap.exists && cursorSnap.data().productId === productId) query = query.startAfter(cursorSnap);
    }
    const snapshot = await query.limit(pageSize + 1).get();
    const docs = snapshot.docs.slice(0, pageSize);
    return {
        reviews: docs.map(doc => publicReview(doc.id, doc.data())),
        nextCursor: snapshot.docs.length > pageSize ? docs[docs.length - 1].id : null,
    };
}

export async function getStats(productId) {
    const snapshot = await statsCol().doc(productId).get();
    const stats = snapshot.exists ? snapshot.data() : emptyStats();
    return { avg: stats.avg, count: stats.count, dist: { ...emptyStats().dist, ...(stats.dist || {}) } };
}

export async function getAllStats() {
    const snapshot = await statsCol().where('count', '>', 0).get();
    const stats = {};
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        stats[doc.id] = { avg: data.avg, count: data.count };
    });
    return stats;
}

// Products from this user's delivered orders, with their review if any.
export async function reviewOverview(uid) {
    const [orders, mine] = await Promise.all([
        eligibleOrdersQuery(uid).get(),
        reviewsCol().where('uid', '==', uid).orderBy('updatedAt', 'desc').limit(100).get(),
    ]);
    const reviews = mine.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const reviewed = new Set(reviews.map(review => review.productId));
    const toReview = new Map();
    orders.docs
        .sort((a, b) => String(b.data().created_at).localeCompare(String(a.data().created_at)))
        .forEach(doc => {
            (doc.data().productIds || []).forEach(productId => {
                if (reviewed.has(productId) || toReview.has(productId)) return;
                const entry = findProduct(productId);
                if (!entry) return;
                toReview.set(productId, {
                    productId,
                    orderId: doc.id,
                    title: entry.product.title,
                    image: entry.product.image,
                    categorySlug: entry.product.categorySlug,
                });
            });
        });
    const withProduct = review => {
        const entry = findProduct(review.productId);
        return {
            ...review,
            title: entry?.product.title || review.productId,
            image: entry?.product.image || '/logo.jpeg',
            categorySlug: entry?.product.categorySlug || null,
        };
    };
    return { toReview: [...toReview.values()], reviews: reviews.map(withProduct) };
}
