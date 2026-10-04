// Firebase ID-token verification for API routes. The uid, email and admin flag always
// come from the verified token, never from the request body.
import { getAuth } from '../firebase/admin';
import { HttpError } from './http';

const extractToken = req => {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header) return null;
    const match = String(header).match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
};

// Returns the signed-in user, or null for guests. A token that is present but
// invalid is rejected rather than silently treated as a guest.
export async function getUser(req) {
    const token = extractToken(req);
    if (!token) return null;
    try {
        const decoded = await getAuth().verifyIdToken(token);
        return {
            uid: decoded.uid,
            email: decoded.email ? decoded.email.toLowerCase() : null,
            emailVerified: Boolean(decoded.email_verified),
            name: decoded.name || null,
            admin: decoded.admin === true,
        };
    } catch {
        throw new HttpError(401, 'Your session has expired. Please sign in again.', 'auth/invalid-token');
    }
}

export async function requireUser(req) {
    const user = await getUser(req);
    if (!user) throw new HttpError(401, 'Please sign in to continue.', 'auth/required');
    return user;
}

export async function requireAdmin(req) {
    const user = await requireUser(req);
    if (!user.admin) throw new HttpError(403, 'Admin access required.', 'auth/forbidden');
    return user;
}
