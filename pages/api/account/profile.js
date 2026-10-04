import { apiRoute, readJson } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { cleanLang, cleanString } from '../../../lib/server/validate';
import { ensureUserDoc, listAddresses, readProfile, userRef } from '../../../lib/server/users';

// GET: the signed-in user's profile and saved addresses (used by the account pages
// and to prefill checkout). PUT: update name, phone and preferred language.
export default apiRoute({
    GET: async (req, res) => {
        const user = await requireUser(req);
        // Accounts created before profiles existed (or by Google sign-in) get their doc now.
        await ensureUserDoc(user);
        const [profile, addresses] = await Promise.all([readProfile(user), listAddresses(user.uid)]);
        res.status(200).json({ ok: true, profile, addresses });
    },

    PUT: async (req, res) => {
        const user = await requireUser(req);
        rateLimit(`profile:${user.uid}`, { limit: 30, windowMs: 10 * MINUTE });
        const payload = await readJson(req, 10_000);
        const updates = { updatedAt: new Date().toISOString() };
        if ('name' in payload) {
            updates.name = cleanString(payload.name, { field: 'Name', min: 2, max: 120, required: true });
        }
        if ('phone' in payload) {
            updates.phone = cleanString(payload.phone, { field: 'Phone', max: 40 });
        }
        if ('lang' in payload) {
            updates.lang = cleanLang(payload.lang);
        }
        await ensureUserDoc(user, { name: updates.name, lang: updates.lang });
        await userRef(user.uid).set({ ...updates, email: user.email || '' }, { merge: true });
        const profile = await readProfile(user);
        res.status(200).json({ ok: true, profile });
    },
});
