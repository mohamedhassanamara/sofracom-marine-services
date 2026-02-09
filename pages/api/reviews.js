const { getFirebaseApp } = require('./firebase-service');
const { authenticateRequest } = require('../../lib/serverAuth');

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function sendResponse(res, status, payload) {
    res.writeHead(status, DEFAULT_HEADERS);
    res.end(JSON.stringify(payload));
}

function parseProductId(req) {
    const { productId, productIds } = req.query || {};
    if (productId) return productId;
    if (productIds) {
        if (Array.isArray(productIds)) {
            return productIds[0];
        }
        return String(productIds).split(',')[0];
    }
    return '';
}

function normalizeSummary(summary = {}) {
    const count = Number(summary.count) || 0;
    const totalRating = Number(summary.total_rating) || 0;
    const average = count > 0
        ? (Number.isFinite(Number(summary.average)) ? Number(summary.average) : totalRating / count)
        : 0;
    return {
        count,
        total_rating: totalRating,
        average,
        updated_at: summary.updated_at || null,
    };
}

function hasAuthHeader(req) {
    const header = req.headers.authorization || req.headers.Authorization;
    return Boolean(header);
}

function matchesProduct(order, productId) {
    if (!order || !productId) return false;
    if (Array.isArray(order.product_ids) && order.product_ids.includes(productId)) {
        return true;
    }
    const items = Array.isArray(order.items) ? order.items : [];
    return items.some(item => (item && (item.product_id || item.id)) === productId);
}

function sortReviewsByDateDesc(reviews) {
    return [...reviews].sort((a, b) => {
        const aTime = Date.parse(a.created_at || 0);
        const bTime = Date.parse(b.created_at || 0);
        return bTime - aTime;
    });
}

function mapReviewDoc(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        product_id: data.product_id || '',
        customer_uid: data.customer_uid || '',
        customer_name: data.customer_name || 'Customer',
        rating: Number(data.rating) || 0,
        comment: data.comment || '',
        created_at: data.created_at || '',
        updated_at: data.updated_at || data.created_at || '',
    };
}

async function fetchSummary(firestore, productId) {
    const summaryRef = firestore.collection('review_summaries').doc(productId);
    const summarySnap = await summaryRef.get();
    if (!summarySnap.exists) {
        return { count: 0, total_rating: 0, average: 0, updated_at: null };
    }
    return normalizeSummary(summarySnap.data());
}

async function listProductReviews(firestore, productId) {
    const snapshot = await firestore
        .collection('reviews')
        .where('product_id', '==', productId)
        .get();
    return sortReviewsByDateDesc(snapshot.docs.map(mapReviewDoc));
}

async function findEligibleOrder(firestore, uid, productId) {
    const ordersRef = firestore.collection('profiles').doc(uid).collection('orders');
    const indexedMatch = await ordersRef
        .where('product_ids', 'array-contains', productId)
        .limit(1)
        .get();
    if (!indexedMatch.empty) {
        const order = indexedMatch.docs[0].data();
        return order && order.id ? order : null;
    }

    const fallbackSnapshot = await ordersRef.limit(300).get();
    const fallbackOrder = fallbackSnapshot.docs
        .map(doc => doc.data())
        .find(order => matchesProduct(order, productId));
    return fallbackOrder || null;
}

async function resolveViewer(firestore, req, productId) {
    if (!hasAuthHeader(req)) {
        return null;
    }
    let auth;
    try {
        auth = await authenticateRequest(req);
    } catch {
        return null;
    }

    const reviewId = `${productId}__${auth.uid}`;
    const reviewRef = firestore.collection('reviews').doc(reviewId);
    const [reviewSnap, eligibleOrder, productReviews] = await Promise.all([
        reviewRef.get(),
        findEligibleOrder(firestore, auth.uid, productId),
        listProductReviews(firestore, productId),
    ]);
    const legacyReview = productReviews.find(review => review.customer_uid === auth.uid) || null;
    const normalizedReview = reviewSnap.exists ? mapReviewDoc(reviewSnap) : legacyReview;

    return {
        isAuthenticated: true,
        canReview: Boolean(eligibleOrder),
        hasReviewed: Boolean(normalizedReview),
        review: normalizedReview,
    };
}

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendResponse(res, 204, {});
        return;
    }

    const firestore = getFirebaseApp().firestore();

    if (req.method === 'GET') {
        const productId = parseProductId(req);
        if (!productId) {
            sendResponse(res, 400, { ok: false, error: 'Missing productId' });
            return;
        }
        try {
            const summaryOnly = req.query?.summaryOnly === '1';
            const limit = Number.parseInt(req.query?.limit, 10);
            const cap = Number.isFinite(limit) && limit > 0 ? limit : 5;
            const [summary, productReviews, viewer] = await Promise.all([
                fetchSummary(firestore, productId),
                summaryOnly ? Promise.resolve([]) : listProductReviews(firestore, productId),
                resolveViewer(firestore, req, productId),
            ]);

            const payload = {
                ok: true,
                summary: { count: summary.count, average: summary.average },
                reviews: summaryOnly ? [] : productReviews.slice(0, cap),
            };
            if (viewer) {
                payload.viewer = viewer;
            }
            sendResponse(res, 200, payload);
        } catch (error) {
            console.error('[review] fetch failed', error);
            sendResponse(res, 500, { ok: false, error: 'Unable to load reviews' });
        }
        return;
    }

    if (req.method === 'POST') {
        let auth;
        try {
            auth = await authenticateRequest(req);
        } catch (err) {
            sendResponse(res, err.status || 401, { ok: false, error: err.message });
            return;
        }
        const payload = req.body && typeof req.body === 'object' ? req.body : {};

        const productId = payload.productId;
        if (!productId) {
            sendResponse(res, 400, { ok: false, error: 'Missing productId' });
            return;
        }
        const rating = Number(payload.rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            sendResponse(res, 400, { ok: false, error: 'Rating must be between 1 and 5' });
            return;
        }
        const comment = String(payload.comment || '').trim();
        if (!comment) {
            sendResponse(res, 400, { ok: false, error: 'Comment is required' });
            return;
        }

        const eligibleOrder = await findEligibleOrder(firestore, auth.uid, productId);
        if (!eligibleOrder) {
            sendResponse(res, 403, { ok: false, error: 'Must have purchased this product to review it' });
            return;
        }

        const profileDoc = await firestore.collection('profiles').doc(auth.uid).get();
        const customerName =
            (profileDoc.exists && profileDoc.data().name) || auth.email || 'Customer';

        const reviewId = `${productId}__${auth.uid}`;
        const timestamp = new Date().toISOString();
        const review = {
            id: reviewId,
            product_id: productId,
            order_id: eligibleOrder.id || '',
            rating,
            comment,
            customer_uid: auth.uid,
            customer_name: customerName,
            created_at: timestamp,
            updated_at: timestamp,
        };

        try {
            const reviewRef = firestore.collection('reviews').doc(reviewId);
            const existing = await reviewRef.get();
            if (existing.exists) {
                const previous = existing.data() || {};
                review.created_at = previous.created_at || timestamp;
            }
            await reviewRef.set(review, { merge: true });

            const summaryRef = firestore.collection('review_summaries').doc(productId);
            await firestore.runTransaction(async transaction => {
                const reviewsQuery = firestore
                    .collection('reviews')
                    .where('product_id', '==', productId);
                const reviewSnapshot = await transaction.get(reviewsQuery);
                const allReviews = reviewSnapshot.docs.map(mapReviewDoc);
                const count = allReviews.length;
                const totalRating = allReviews.reduce((sum, entry) => sum + (Number(entry.rating) || 0), 0);
                const average = count > 0 ? totalRating / count : 0;
                transaction.set(
                    summaryRef,
                    {
                        count,
                        total_rating: totalRating,
                        average,
                        updated_at: timestamp,
                    },
                    { merge: true }
                );
            });
            const summary = await fetchSummary(firestore, productId);
            sendResponse(res, 200, {
                ok: true,
                review,
                summary: { count: summary.count, average: summary.average },
            });
        } catch (error) {
            console.error('[review] submit failed', error);
            sendResponse(res, 500, { ok: false, error: 'Unable to save review' });
        }
        return;
    }

    sendResponse(res, 405, { ok: false, error: 'Method not allowed' });
};
