// Staff devices (the mobile admin app). An admin generates a single-use 6-digit code;
// the app trades it for a Firebase custom token carrying {admin, device, deviceId}.
// Devices can be revoked; rules and API routes then reject them.
import { createHash, randomInt } from 'crypto';
import { getAuth, getDb } from '../firebase/admin';
import { HttpError } from './http';
import { cleanString } from './validate';

export const CODE_TTL_MS = 15 * 60 * 1000;
export const MAX_FAILED_ATTEMPTS = 5;

const devicesCol = () => getDb().collection('devices');
const codesCol = () => getDb().collection('enrollCodes');
const eventsCol = () => getDb().collection('deviceEvents');
const stateRef = () => getDb().collection('enrollState').doc('global');

const hashCode = code => createHash('sha256').update(`sofracom-enroll:${code}`).digest('hex');
export const deviceUid = deviceId => `device_${deviceId}`;

const logEvent = (tx, type, details) => {
    const ref = eventsCol().doc();
    const event = { type, at: new Date().toISOString(), ...details };
    if (tx) tx.set(ref, event);
    else return ref.set(event);
    return null;
};

// Older unused codes are replaced, so only the newest code can ever work.
export async function generateCode(staff) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const now = Date.now();
    const db = getDb();
    const active = await codesCol().where('status', '==', 'active').get();
    const batch = db.batch();
    active.docs.forEach(doc => batch.update(doc.ref, { status: 'replaced', closedAt: new Date(now).toISOString() }));
    batch.set(codesCol().doc(hashCode(code)), {
        status: 'active',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
        createdBy: staff.uid,
    });
    // A fresh code also resets the failed-attempt counter.
    batch.set(stateRef(), { failedAttempts: 0, updatedAt: new Date(now).toISOString() });
    await batch.commit();
    return { code, expiresAt: new Date(now + CODE_TTL_MS).toISOString() };
}

// Status of the most recent code, for the admin screen (never the code itself).
export async function latestCodeStatus() {
    const snapshot = await codesCol().orderBy('createdAt', 'desc').limit(1).get();
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    const expired = data.status === 'active' && Date.parse(data.expiresAt) <= Date.now();
    return {
        status: expired ? 'expired' : data.status,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        closedReason: data.closedReason || null,
    };
}

// Counts a wrong code; at MAX_FAILED_ATTEMPTS every outstanding code is burned.
async function recordFailure(ip) {
    const db = getDb();
    const burned = await db.runTransaction(async tx => {
        const [stateSnap, active] = await Promise.all([
            tx.get(stateRef()),
            tx.get(codesCol().where('status', '==', 'active')),
        ]);
        const failedAttempts = (stateSnap.data()?.failedAttempts || 0) + 1;
        const now = new Date().toISOString();
        if (failedAttempts < MAX_FAILED_ATTEMPTS) {
            tx.set(stateRef(), { failedAttempts, updatedAt: now });
            return false;
        }
        active.docs.forEach(doc =>
            tx.update(doc.ref, { status: 'burned', closedAt: now, closedReason: 'too-many-failed-attempts' })
        );
        tx.set(stateRef(), { failedAttempts: 0, updatedAt: now, lastBurnAt: now });
        logEvent(tx, 'codes-burned', { reason: 'too-many-failed-attempts', codes: active.size, ip });
        return true;
    });
    if (burned) {
        console.warn(`[devices] ${MAX_FAILED_ATTEMPTS} failed enrolment attempts: outstanding codes burned (last ip ${ip})`);
    }
}

export async function enrollDevice({ code, deviceName }, ip) {
    const cleanCode = String(code || '').replace(/\s+/g, '');
    const name = cleanString(deviceName, { field: 'Device name', min: 2, max: 60, required: true });
    if (!/^\d{6}$/.test(cleanCode)) {
        await recordFailure(ip);
        throw new HttpError(400, 'Invalid or expired code', 'device/invalid-code');
    }
    const db = getDb();
    const codeRef = codesCol().doc(hashCode(cleanCode));
    const deviceRef = devicesCol().doc();
    const result = await db.runTransaction(async tx => {
        const codeSnap = await tx.get(codeRef);
        const data = codeSnap.exists ? codeSnap.data() : null;
        const valid = data && data.status === 'active' && Date.parse(data.expiresAt) > Date.now();
        if (!valid) return null;
        const now = new Date().toISOString();
        tx.update(codeRef, { status: 'used', closedAt: now, usedBy: deviceRef.id });
        tx.set(deviceRef, {
            name,
            active: true,
            createdAt: now,
            createdBy: data.createdBy,
            lastSeenAt: now,
            revokedAt: null,
            revokedBy: null,
        });
        tx.set(stateRef(), { failedAttempts: 0, updatedAt: now });
        logEvent(tx, 'device-enrolled', { deviceId: deviceRef.id, name, ip });
        return { deviceId: deviceRef.id };
    });
    if (!result) {
        await recordFailure(ip);
        throw new HttpError(400, 'Invalid or expired code', 'device/invalid-code');
    }
    const token = await getAuth().createCustomToken(deviceUid(result.deviceId), {
        admin: true,
        device: true,
        deviceId: result.deviceId,
    });
    return { token, deviceId: result.deviceId, name };
}

export async function isDeviceActive(deviceId) {
    if (!deviceId) return false;
    const snapshot = await devicesCol().doc(String(deviceId)).get();
    return snapshot.exists && snapshot.data().active === true;
}

export async function touchDevice(deviceId) {
    const ref = devicesCol().doc(deviceId);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().active !== true) {
        throw new HttpError(403, 'This device was removed. Enrol it again.', 'device/revoked');
    }
    const lastSeen = Date.parse(snapshot.data().lastSeenAt || 0);
    if (!lastSeen || Date.now() - lastSeen > 10 * 60 * 1000) {
        await ref.update({ lastSeenAt: new Date().toISOString() });
    }
    return { id: deviceId, ...snapshot.data() };
}

export async function listDevices() {
    const snapshot = await devicesCol().orderBy('createdAt', 'desc').limit(100).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Revoking blocks the device everywhere: refresh tokens are revoked (no new ID
// tokens), API routes check `active`, and the security rules check it on every read.
export async function revokeDevice(deviceId, staff) {
    const id = cleanString(deviceId, { field: 'Device id', max: 64, required: true });
    const ref = devicesCol().doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpError(404, 'Device not found', 'not-found');
    const now = new Date().toISOString();
    await ref.update({ active: false, revokedAt: now, revokedBy: staff.uid });
    try {
        await getAuth().revokeRefreshTokens(deviceUid(id));
    } catch (err) {
        // A device whose auth user was never created (token never used) has nothing to revoke.
        if (err.code !== 'auth/user-not-found') throw err;
    }
    await logEvent(null, 'device-revoked', { deviceId: id, by: staff.uid });
    return { id, ...snapshot.data(), active: false, revokedAt: now, revokedBy: staff.uid };
}
