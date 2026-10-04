import { getDb } from '../../../lib/firebase/admin';
import { apiRoute, HttpError } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { ensureUserDoc } from '../../../lib/server/users';

const BATCH_LIMIT = 400;

// Unclaimed documents (no uid yet) whose email matches. Older quotes only carry
// customer_email, so both fields are checked.
async function findUnclaimed(collection, email, fields) {
    const db = getDb();
    const found = new Map();
    for (const field of fields) {
        const snapshot = await db.collection(collection).where(field, '==', email).limit(BATCH_LIMIT).get();
        snapshot.docs.forEach(doc => {
            if (!doc.data().uid) found.set(doc.id, doc.ref);
        });
    }
    return [...found.values()];
}

// Attaches guest orders and quotes placed with this account's email. Only verified
// emails count, otherwise anyone could claim someone else's history.
export default apiRoute({
    POST: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`link:${user.uid}`, { limit: 10, windowMs: 10 * MINUTE });
        if (!user.email || !user.emailVerified) {
            throw new HttpError(403, 'Verify your email address first.', 'auth/email-unverified');
        }
        await ensureUserDoc(user);

        const [orders, quotes] = await Promise.all([
            findUnclaimed('orders', user.email, ['email']),
            findUnclaimed('quotes', user.email, ['email', 'customer_email']),
        ]);
        const refs = [...orders, ...quotes];
        const linkedAt = new Date().toISOString();
        for (let index = 0; index < refs.length; index += BATCH_LIMIT) {
            const batch = getDb().batch();
            refs.slice(index, index + BATCH_LIMIT).forEach(ref => batch.update(ref, { uid: user.uid, linkedAt }));
            await batch.commit();
        }
        res.status(200).json({ ok: true, linkedOrders: orders.length, linkedQuotes: quotes.length });
    },
});
