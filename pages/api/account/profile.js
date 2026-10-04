import { apiRoute, readJson, HttpError } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { cleanLang, cleanString } from '../../../lib/server/validate';
import { ensureUserDoc, listAddresses, readProfile, userRef } from '../../../lib/server/users';
import { claimContact } from '../../../lib/server/identity';
import { normalizePhone, parseIdentifier } from '../../../lib/identity';

// GET: the signed-in user's profile and saved addresses (used by the account pages
// and to prefill checkout).
// PUT: name, preferred language, and the contact detail the account does not log in
// with (a phone for email accounts, an email for phone accounts). Phones and emails
// are unique across accounts.
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
        await ensureUserDoc(user);
        const current = await readProfile(user);
        const updates = { updatedAt: new Date().toISOString() };

        if ('name' in payload) {
            updates.name = cleanString(payload.name, { field: 'Name', min: 2, max: 120, required: true });
            updates.nameLower = updates.name.toLowerCase();
        }
        if ('lang' in payload) {
            updates.lang = cleanLang(payload.lang);
        }
        // Email accounts may add a phone; the login phone of a phone account is fixed.
        if ('phone' in payload && current.accountType === 'email') {
            const raw = cleanString(payload.phone, { field: 'Phone', max: 40 });
            const phone = raw ? normalizePhone(raw) : '';
            if (raw && !phone) throw new HttpError(400, 'Enter a valid phone number.', 'identity/invalid-phone');
            if (phone !== current.phone) {
                await claimContact(user.uid, 'phone', phone, normalizePhone(current.phone));
                updates.phone = phone;
            }
        }
        // Phone accounts may add an email; the login email of an email account is fixed.
        if ('email' in payload && current.accountType === 'phone') {
            const raw = cleanString(payload.email, { field: 'Email', max: 254 });
            const parsed = raw ? parseIdentifier(raw) : null;
            if (raw && parsed.type !== 'email') throw new HttpError(400, 'Enter a valid email address.', 'identity/invalid-email');
            const email = parsed ? parsed.email : '';
            if (email !== current.email) {
                await claimContact(user.uid, 'email', email, current.email);
                updates.email = email;
            }
        }

        await userRef(user.uid).set(updates, { merge: true });
        res.status(200).json({ ok: true, profile: await readProfile(user) });
    },
});
