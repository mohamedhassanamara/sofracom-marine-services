// Rate limiting that holds across serverless instances (unlike rateLimit.js): a fixed
// window counter per key in Firestore (rateLimits/{sha256(key)}), updated in a
// transaction. Used where guessing must really be capped (order tracking).
import { createHash } from 'crypto';
import { HttpError } from './http.js';

export async function durableRateLimit(db, key, { limit, windowMs, now = Date.now() }) {
    const id = createHash('sha256').update(key).digest('hex').slice(0, 40);
    const ref = db.collection('rateLimits').doc(id);
    const allowed = await db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const data = snapshot.exists ? snapshot.data() : null;
        if (!data || data.resetAt <= now) {
            tx.set(ref, { count: 1, resetAt: now + windowMs, expireAt: new Date(now + windowMs) });
            return true;
        }
        if (data.count >= limit) return false;
        tx.update(ref, { count: data.count + 1 });
        return true;
    });
    if (!allowed) throw new HttpError(429, 'Too many attempts. Please wait and try again later.', 'rate-limited');
}
