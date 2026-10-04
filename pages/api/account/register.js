import { apiRoute, clientIp, readJson } from '../../../lib/server/http';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { registerAccount } from '../../../lib/server/identity';

// Creates an account from an email address or a phone number plus a password.
// Done server-side so one phone/email can only ever belong to one account.
export default apiRoute({
    POST: async (req, res) => {
        rateLimit(`register:${clientIp(req)}`, { limit: 5, windowMs: 10 * MINUTE });
        const payload = await readJson(req, 5_000);
        const result = await registerAccount({
            identifier: payload.identifier,
            password: payload.password,
            name: payload.name,
            lang: payload.lang,
        });
        res.status(200).json({ ok: true, type: result.type });
    },
});
