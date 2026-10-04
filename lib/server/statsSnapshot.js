// Ratings for JSON-LD at build/revalidate time. Read once per server process (10 min),
// and never fatal: without Firebase credentials the pages simply omit aggregateRating.
let cache = null;
let loadedAt = 0;
const TTL = 10 * 60 * 1000;

const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// Credentials the Admin SDK could use (see lib/firebase/admin.js); without any, don't try.
const hasCredentials = () =>
    Boolean(
        process.env.FIRESTORE_EMULATOR_HOST ||
            process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
            process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
            (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY)
    );

export async function getStatsSnapshot() {
    if (cache && Date.now() - loadedAt < TTL) return cache;
    if (process.env.SEO_RATINGS === 'off' || !hasCredentials()) {
        cache = {};
        loadedAt = Date.now();
        return cache;
    }
    try {
        const { getAllStats } = await import('./reviews.js');
        cache = await withTimeout(getAllStats(), 2500);
    } catch (err) {
        if (!cache) console.warn('[seo] product ratings unavailable:', err.message);
        cache = cache || {};
    }
    loadedAt = Date.now();
    return cache;
}
