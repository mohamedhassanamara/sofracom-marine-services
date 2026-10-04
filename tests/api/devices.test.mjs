// Staff-app device enrolment: single-use codes, brute-force burn, custom tokens with
// the admin claim, and revocation that blocks the API immediately.
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST, PRODUCT_A, api, createUser, db, resetEmulators, startServer, stopServer } from './helpers.mjs';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

// Exchanges a custom token for an ID token, as the app's signInWithCustomToken does.
async function signInWithCustomToken(token) {
    const response = await fetch(
        `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, returnSecureToken: true }),
        }
    );
    const body = await response.json();
    assert.ok(body.idToken, `custom token sign-in failed: ${JSON.stringify(body)}`);
    return { token: body.idToken };
}

let staff;
let ip = 0;
const fromIp = () => ({ 'X-Forwarded-For': `198.51.100.${(ip += 1)}` });

const newCode = async () => {
    const response = await api('/api/admin/devices', { method: 'POST', user: staff, body: {} });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.match(response.body.code, /^\d{6}$/);
    return response.body.code;
};

const enroll = (code, deviceName = 'Shop phone') =>
    api('/api/devices/enroll', { method: 'POST', body: { code, deviceName }, headers: fromIp() });

before(async () => {
    await resetEmulators();
    await startServer();
    staff = await createUser({ name: 'Staff Member', isAdmin: true });
});

after(() => stopServer());

describe('enrolment codes', () => {
    beforeEach(async () => {
        // Each test starts from a clean failure counter.
        await db().collection('enrollState').doc('global').set({ failedAttempts: 0 });
    });

    test('only admins can generate codes or list devices', async () => {
        const customer = await createUser();
        assert.equal((await api('/api/admin/devices', { method: 'POST', user: customer, body: {} })).status, 403);
        assert.equal((await api('/api/admin/devices', { user: customer })).status, 403);
        assert.equal((await api('/api/admin/devices', { method: 'POST', body: {} })).status, 401);
    });

    test('a code enrols one device and is then used up', async () => {
        const code = await newCode();
        const first = await enroll(code, 'Front desk');
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.ok(first.body.token && first.body.deviceId);
        const device = (await db().collection('devices').doc(first.body.deviceId).get()).data();
        assert.equal(device.active, true);
        assert.equal(device.name, 'Front desk');

        const reuse = await enroll(code, 'Second phone');
        assert.equal(reuse.status, 400);
        assert.equal(reuse.body.code, 'device/invalid-code');
    });

    test('codes are stored hashed, never in clear text', async () => {
        const code = await newCode();
        const snapshot = await db().collection('enrollCodes').get();
        snapshot.docs.forEach(doc => {
            assert.notEqual(doc.id, code);
            assert.equal(JSON.stringify(doc.data()).includes(code), false);
        });
    });

    test('expired codes are rejected', async () => {
        const code = await newCode();
        const active = await db().collection('enrollCodes').where('status', '==', 'active').get();
        await active.docs[0].ref.update({ expiresAt: new Date(Date.now() - 1000).toISOString() });
        assert.equal((await enroll(code)).body.code, 'device/invalid-code');
        const status = await api('/api/admin/devices', { user: staff });
        assert.equal(status.body.code.status, 'expired');
    });

    test('generating a new code replaces the previous one', async () => {
        const oldCode = await newCode();
        const freshCode = await newCode();
        assert.equal((await enroll(oldCode)).status, 400);
        assert.equal((await enroll(freshCode)).status, 200);
    });

    test('five wrong attempts burn the outstanding code and log the event', async () => {
        const code = await newCode();
        const wrong = code === '000000' ? '111111' : '000000';
        for (let attempt = 0; attempt < 5; attempt += 1) {
            assert.equal((await enroll(wrong)).status, 400);
        }
        const blocked = await enroll(code);
        assert.equal(blocked.status, 400, 'the real code no longer works');
        const status = await api('/api/admin/devices', { user: staff });
        assert.equal(status.body.code.status, 'burned');
        assert.equal(status.body.code.closedReason, 'too-many-failed-attempts');
        const events = await db().collection('deviceEvents').where('type', '==', 'codes-burned').get();
        assert.ok(events.size >= 1);
        // An admin recovers by generating a new code.
        assert.equal((await enroll(await newCode())).status, 200);
    });

    test('input is validated', async () => {
        const code = await newCode();
        assert.equal((await enroll(code, '')).status, 400);
        assert.equal((await enroll('12ab56')).body.code, 'device/invalid-code');
    });
});

describe('enrolled devices', () => {
    test('a device token works for staff APIs until the device is revoked', async () => {
        const enrolled = await enroll(await newCode(), 'Workshop tablet');
        const device = await signInWithCustomToken(enrolled.body.token);

        const heartbeat = await api('/api/devices/heartbeat', { method: 'POST', user: device, body: {} });
        assert.equal(heartbeat.status, 200, JSON.stringify(heartbeat.body));
        assert.equal(heartbeat.body.device.name, 'Workshop tablet');

        const order = await api('/api/create-order', { method: 'POST', body: { customer: GUEST, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] } });
        const list = await api('/api/admin/orders', { user: device });
        assert.equal(list.status, 200);
        const change = await api('/api/admin/orders', {
            method: 'PATCH',
            user: device,
            body: { id: order.body.orderId, status: 'confirmed', note: 'Called the customer' },
        });
        assert.equal(change.status, 200, JSON.stringify(change.body));
        const saved = (await db().collection('orders').doc(order.body.orderId).get()).data();
        assert.equal(saved.statusHistory.at(-1).by, `device_${enrolled.body.deviceId}`);

        const listed = await api('/api/admin/devices', { user: staff });
        assert.ok(listed.body.devices.some(item => item.id === enrolled.body.deviceId && item.active));

        const revoked = await api(`/api/admin/devices?id=${enrolled.body.deviceId}`, { method: 'DELETE', user: staff });
        assert.equal(revoked.status, 200);
        assert.equal(revoked.body.device.active, false);

        // The ID token issued before revocation is rejected straight away.
        const afterRevoke = await api('/api/admin/orders', { user: device });
        assert.equal(afterRevoke.status, 403);
        assert.equal(afterRevoke.body.code, 'device/revoked');
        const beat = await api('/api/devices/heartbeat', { method: 'POST', user: device, body: {} });
        assert.equal(beat.status, 403);
        assert.equal(beat.body.code, 'device/revoked');
    });

    test('revoking an unknown device returns 404', async () => {
        const missing = await api('/api/admin/devices?id=does-not-exist', { method: 'DELETE', user: staff });
        assert.equal(missing.status, 404);
    });

    test('heartbeat is only for devices', async () => {
        const customer = await createUser();
        const response = await api('/api/devices/heartbeat', { method: 'POST', user: customer, body: {} });
        assert.equal(response.body.code, 'device/not-device');
    });
});
