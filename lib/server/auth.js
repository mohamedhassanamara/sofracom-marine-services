// Firebase ID-token verification for API routes. The uid, email and admin flag always
// come from the verified token, never from the request body.
import { getAuth } from '../firebase/admin';
import { HttpError } from './http';
import { isDeviceActive } from './devices';
import { phoneFromAuthEmail, publicEmail } from '../identity';

const extractToken = req => {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header) return null;
    const match = String(header).match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
};

// Reads claims without verifying (only used to pick an error message after
// verification has already failed).
function unverifiedClaims(token) {
    try {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) || {};
    } catch {
        return {};
    }
}

// Returns the signed-in user, or null for guests. A token that is present but
// invalid is rejected rather than silently treated as a guest.
export async function getUser(req) {
    const token = extractToken(req);
    if (!token) return null;
    // Initialise outside the try: a broken server setup is a 500 with a code, not "session expired".
    const auth = getAuth();
    let decoded;
    try {
        decoded = await auth.verifyIdToken(token);
        // Staff devices can be revoked; reject their tokens immediately, not after expiry.
        if (decoded.device === true) decoded = await auth.verifyIdToken(token, true);
    } catch (err) {
        // Revoked tokens: a removed staff device, or a customer whose sessions ended
        // (password changed / reset by staff), which just needs to sign in again.
        if (err?.code === 'auth/id-token-revoked' && unverifiedClaims(token).device === true) {
            throw new HttpError(403, 'This device was removed. Enrol it again.', 'device/revoked');
        }
        if (typeof err?.code === 'string' && err.code.startsWith('auth/')) {
            throw new HttpError(401, 'Your session has expired. Please sign in again.', 'auth/invalid-token');
        }
        throw err;
    }
    const authEmail = decoded.email ? decoded.email.toLowerCase() : null;
    return {
        uid: decoded.uid,
        // Phone accounts: the synthetic auth email is hidden; `phone` is their login.
        email: publicEmail(authEmail) || null,
        phone: phoneFromAuthEmail(authEmail),
        emailVerified: Boolean(decoded.email_verified) && Boolean(publicEmail(authEmail)),
        name: decoded.name || null,
        admin: decoded.admin === true,
        device: decoded.device === true,
        deviceId: decoded.deviceId || null,
    };
}

export async function requireUser(req) {
    const user = await getUser(req);
    if (!user) throw new HttpError(401, 'Please sign in to continue.', 'auth/required');
    return user;
}

export async function requireAdmin(req) {
    const user = await requireUser(req);
    if (!user.admin) throw new HttpError(403, 'Admin access required.', 'auth/forbidden');
    if (user.device && !(await isDeviceActive(user.deviceId))) {
        throw new HttpError(403, 'This device was removed. Enrol it again.', 'device/revoked');
    }
    return user;
}
