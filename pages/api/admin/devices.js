import { apiRoute } from '../../../lib/server/http';
import { requireAdmin } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { generateCode, latestCodeStatus, listDevices, revokeDevice } from '../../../lib/server/devices';

// Staff-only device management: list devices and the latest code's status,
// generate an enrolment code, revoke a device.
export default apiRoute({
    GET: async (req, res) => {
        await requireAdmin(req);
        res.setHeader('Cache-Control', 'no-store');
        const [devices, code] = await Promise.all([listDevices(), latestCodeStatus()]);
        res.status(200).json({ ok: true, devices, code });
    },

    POST: async (req, res) => {
        const staff = await requireAdmin(req);
        rateLimit(`enroll-code:${staff.uid}`, { limit: 20, windowMs: 10 * MINUTE });
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ ok: true, ...(await generateCode(staff)) });
    },

    DELETE: async (req, res) => {
        const staff = await requireAdmin(req);
        const device = await revokeDevice(req.query.id, staff);
        res.status(200).json({ ok: true, device });
    },
});
