import { apiRoute, HttpError } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { rateLimit, MINUTE } from '../../../lib/server/rateLimit';
import { touchDevice } from '../../../lib/server/devices';

// Called by the staff app on start: confirms the device is still enrolled and
// records when it was last seen. 403 device/revoked tells the app to re-enrol.
export default apiRoute({
    POST: async (req, res) => {
        const user = await requireUser(req);
        if (!user.device) throw new HttpError(400, 'Not a staff device', 'device/not-device');
        rateLimit(`heartbeat:${user.deviceId}`, { limit: 30, windowMs: MINUTE });
        const device = await touchDevice(user.deviceId);
        res.status(200).json({ ok: true, device: { id: device.id, name: device.name } });
    },
});
