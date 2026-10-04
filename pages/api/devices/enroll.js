import { apiRoute, clientIp, readJson } from '../../../lib/server/http';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { enrollDevice } from '../../../lib/server/devices';

// Public: the staff app trades a single-use enrolment code for a custom token.
// Wrong codes are counted in Firestore; after 5, all outstanding codes are burned.
export default apiRoute({
    POST: async (req, res) => {
        const ip = clientIp(req);
        rateLimit(`enroll:${ip}`, { limit: 10, windowMs: 10 * MINUTE });
        const payload = await readJson(req, 2_000);
        const result = await enrollDevice({ code: payload.code, deviceName: payload.deviceName }, ip);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ ok: true, ...result });
    },
});
