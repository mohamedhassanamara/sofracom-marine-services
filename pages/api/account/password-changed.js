import { apiRoute } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/auth';
import { userRef } from '../../../lib/server/users';

// Called after the user replaced a temporary password set by staff.
export default apiRoute({
    POST: async (req, res) => {
        const user = await requireUser(req);
        await userRef(user.uid).set(
            { mustChangePassword: false, passwordChangedAt: new Date().toISOString() },
            { merge: true }
        );
        res.status(200).json({ ok: true });
    },
});
