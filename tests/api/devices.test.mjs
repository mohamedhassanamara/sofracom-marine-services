// Staff-phone enrolment. Codes are generated, listed and revoked by the LOCAL admin
// tool through the shared lib/server/devices.js functions; the website only redeems
// codes (/api/devices/enroll), answers heartbeats and accepts device status changes.
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST, PRODUCT_A, api, createUser, db, lib, resetEmulators, startServer, stopServer } from './helpers.mjs';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const STAFF = { uid: 'local-admin:test' };

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

let devices;
let ip = 0;
const fromIp = () => ({ 'X-Forwarded-For': `198.51.100.${(ip += 1)}` });

const newCode = async () => {
    const { code } = await devices.generateCode(STAFF);
    assert.match(code, /^\d{6}$/);
    return code;
};

const enroll = (code, deviceName = 'Shop phone') =>
    api('/api/devices/enroll', { method: 'POST', body: { code, deviceName }, headers: fromIp() });

before(async () => {
    await resetEmulators();
    await startServer();
    devices = await lib('devices');
});

after(() => stopServer());

describe('enrolment codes', () => {
    beforeEach(async () => {
        // Each test starts from a clean failure counter.
        await db().collection('enrollState').doc('global').set({ failedAttempts: 0 });
    });

    test('the website cannot generate codes, list or revoke devices', async () => {
        const webAdmin = await createUser({ isAdmin: true });
        for (const method of ['GET', 'POST', 'DELETE', 'PATCH']) {
            const response = await api('/api/admin/devices', { method, user: webAdmin, body: method === 'GET' || method === 'DELETE' ? undefined : {} });
            assert.ok([404, 405].includes(response.status), `${method} /api/admin/devices -> ${response.status}`);
        }
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
        assert.equal((await devices.latestCodeStatus()).status, 'used');
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
        assert.equal((await devices.latestCodeStatus()).status, 'expired');
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
        assert.equal((await enroll(code)).status, 400, 'the real code no longer works');
        const status = await devices.latestCodeStatus();
        assert.equal(status.status, 'burned');
        assert.equal(status.closedReason, 'too-many-failed-attempts');
        const events = await db().collection('deviceEvents').where('type', '==', 'codes-burned').get();
        assert.ok(events.size >= 1);
        // Recovery: generate a new code in the local tool.
        assert.equal((await enroll(await newCode())).status, 200);
    });

    test('input is validated', async () => {
        const code = await newCode();
        assert.equal((await enroll(code, '')).status, 400);
        assert.equal((await enroll('12ab56')).body.code, 'device/invalid-code');
    });
});

describe('enrolled devices', () => {
    test('a device token can change statuses until the device is revoked', async () => {
        const enrolled = await enroll(await newCode(), 'Workshop tablet');
        const device = await signInWithCustomToken(enrolled.body.token);

        const heartbeat = await api('/api/devices/heartbeat', { method: 'POST', user: device, body: {} });
        assert.equal(heartbeat.status, 200, JSON.stringify(heartbeat.body));
        assert.equal(heartbeat.body.device.name, 'Workshop tablet');

        const order = await api('/api/create-order', { method: 'POST', body: { customer: GUEST, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] } });
        const change = await api('/api/admin/orders', {
            method: 'PATCH',
            user: device,
            body: { id: order.body.orderId, status: 'confirmed', note: 'Called the customer' },
        });
        assert.equal(change.status, 200, JSON.stringify(change.body));
        const saved = (await db().collection('orders').doc(order.body.orderId).get()).data();
        assert.equal(saved.statusHistory.at(-1).by, `device_${enrolled.body.deviceId}`);

        const listed = await devices.listDevices();
        assert.ok(listed.some(item => item.id === enrolled.body.deviceId && item.active));

        const revoked = await devices.revokeDevice(enrolled.body.deviceId, STAFF);
        assert.equal(revoked.active, false);

        // The ID token issued before revocation is rejected straight away.
        const afterRevoke = await api('/api/admin/orders', {
            method: 'PATCH',
            user: device,
            body: { id: order.body.orderId, status: 'preparing' },
        });
        assert.equal(afterRevoke.status, 403);
        assert.equal(afterRevoke.body.code, 'device/revoked');
        const beat = await api('/api/devices/heartbeat', { method: 'POST', user: device, body: {} });
        assert.equal(beat.status, 403);
        assert.equal(beat.body.code, 'device/revoked');
    });

    test('revoking an unknown device fails cleanly', async () => {
        await assert.rejects(devices.revokeDevice('does-not-exist', STAFF), err => err.status === 404);
    });

    test('heartbeat is only for devices', async () => {
        const customer = await createUser();
        const response = await api('/api/devices/heartbeat', { method: 'POST', user: customer, body: {} });
        assert.equal(response.body.code, 'device/not-device');
    });
});
