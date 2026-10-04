import { getDb } from '../../../lib/firebase/admin';
import { apiRoute, readJson, HttpError } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { cleanString } from '../../../lib/server/validate';
import {
    addAddress,
    addressesRef,
    cleanAddress,
    ensureUserDoc,
    listAddresses,
    readProfile,
    userRef,
} from '../../../lib/server/users';

const cleanId = value => cleanString(value, { field: 'Address id', max: 64, required: true });

async function respond(res, user, extra = {}) {
    const [profile, addresses] = await Promise.all([readProfile(user), listAddresses(user.uid)]);
    res.status(200).json({ ok: true, addresses, defaultAddressId: profile.defaultAddressId, ...extra });
}

// Saved delivery addresses for the signed-in user. The default lives on the user
// document (defaultAddressId) so changing it is a single write.
export default apiRoute({
    POST: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`address:${user.uid}`, { limit: 30, windowMs: 10 * MINUTE });
        const payload = await readJson(req, 10_000);
        await ensureUserDoc(user);
        const id = await addAddress(user.uid, cleanAddress(payload.address), {
            makeDefault: payload.makeDefault === true,
        });
        await respond(res, user, { id });
    },

    PUT: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`address:${user.uid}`, { limit: 30, windowMs: 10 * MINUTE });
        const payload = await readJson(req, 10_000);
        const id = cleanId(payload.id);
        const ref = addressesRef(user.uid).doc(id);
        const snapshot = await ref.get();
        if (!snapshot.exists) throw new HttpError(404, 'Address not found', 'address/not-found');
        const now = new Date().toISOString();
        if (payload.address) {
            await ref.set({ ...cleanAddress(payload.address), updatedAt: now }, { merge: true });
        }
        if (payload.makeDefault === true) {
            await userRef(user.uid).set({ defaultAddressId: id, updatedAt: now }, { merge: true });
        }
        await respond(res, user, { id });
    },

    DELETE: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`address:${user.uid}`, { limit: 30, windowMs: 10 * MINUTE });
        const id = cleanId(req.query.id);
        const db = getDb();
        await db.runTransaction(async tx => {
            const ref = addressesRef(user.uid).doc(id);
            const [addressSnap, userSnap, others] = await Promise.all([
                tx.get(ref),
                tx.get(userRef(user.uid)),
                tx.get(addressesRef(user.uid).orderBy('createdAt', 'asc').limit(11)),
            ]);
            if (!addressSnap.exists) throw new HttpError(404, 'Address not found', 'address/not-found');
            tx.delete(ref);
            if (userSnap.exists && userSnap.data().defaultAddressId === id) {
                const next = others.docs.find(doc => doc.id !== id);
                tx.set(
                    userRef(user.uid),
                    { defaultAddressId: next ? next.id : null, updatedAt: new Date().toISOString() },
                    { merge: true }
                );
            }
        });
        await respond(res, user);
    },
});
