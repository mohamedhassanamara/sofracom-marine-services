// The LOCAL admin tool (tools/product-admin, /api/ops/*) against the emulators: it must
// use the same shared functions as the website, so its writes look identical.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { GUEST, PRODUCT_A, api, createUser, db, resetEmulators, startServer, stopServer } from './helpers.mjs';

const TOOL = 'http://127.0.0.1:5299';
let tool;
let token; // the per-session token the tool injects into its pages

async function ops(path, body) {
    const response = await fetch(`${TOOL}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}

before(async () => {
    await resetEmulators();
    await startServer();
    tool = spawn('node', ['tools/product-admin/server.js'], {
        cwd: new URL('../..', import.meta.url).pathname,
        env: { ...process.env, PORT: '5299' },
        stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
            if ((await fetch(`${TOOL}/api/ops/target`)).ok) {
                token = (await (await fetch(`${TOOL}/ops`)).text()).match(/name="admin-token" content="(\w+)"/)[1];
                return;
            }
        } catch {
            // starting
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('admin tool did not start');
});

after(() => {
    tool?.kill();
    stopServer();
});

test('the tool says it is pointed at the emulator', async () => {
    const target = await ops('/api/ops/target');
    assert.equal(target.body.mode, 'emulator');
    assert.equal(target.body.projectId, 'demo-sofracom');
});

test('Firebase writes from the tool require its session token', async () => {
    const response = await fetch(`${TOOL}/api/ops/devices/code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403);
});

test('Devices: add a device, the phone enrols, the tool lists and revokes it', async () => {
    const issued = await ops('/api/ops/devices/code', {});
    assert.match(issued.body.code, /^\d{6}$/);
    const enrolled = await api('/api/devices/enroll', { method: 'POST', body: { code: issued.body.code, deviceName: 'Counter phone' } });
    assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));

    const listed = await ops('/api/ops/devices');
    assert.equal(listed.body.code.status, 'used');
    assert.ok(listed.body.devices.some(device => device.id === enrolled.body.deviceId && device.active));

    const revoked = await ops('/api/ops/devices/revoke', { id: enrolled.body.deviceId });
    assert.equal(revoked.body.device.active, false);
});

test('Orders: status changes from the tool append to the same history', async () => {
    const order = await api('/api/create-order', { method: 'POST', body: { customer: GUEST, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] } });
    const changed = await ops('/api/ops/orders/status', { id: order.body.orderId, status: 'confirmed', note: 'Paid on pickup' });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    const saved = (await db().collection('orders').doc(order.body.orderId).get()).data();
    assert.deepEqual(saved.statusHistory.map(entry => entry.status), ['pending', 'confirmed']);
    assert.equal(saved.statusHistory[1].note, 'Paid on pickup');
    assert.match(saved.statusHistory[1].by, /^local-admin:/);

    const filtered = await ops('/api/ops/orders?status=confirmed');
    assert.ok(filtered.body.items.some(item => item.id === order.body.orderId));
    assert.equal((await ops('/api/ops/orders/status', { id: order.body.orderId, status: 'shipped' })).status, 400);
});

test('Reviews: hiding from the tool updates product stats', async () => {
    const buyer = await createUser({ name: 'Review Writer' });
    const order = await api('/api/create-order', { method: 'POST', user: buyer, body: { customer: GUEST, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] } });
    await ops('/api/ops/orders/status', { id: order.body.orderId, status: 'delivered' });
    const review = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_A, rating: 4 } });
    assert.equal(review.status, 200, JSON.stringify(review.body));

    const listed = await ops('/api/ops/reviews');
    const item = listed.body.items.find(entry => entry.id === review.body.review.id);
    assert.ok(item);
    assert.equal(item.productTitle.startsWith('Jotun'), true);

    await ops('/api/ops/reviews/status', { id: item.id, status: 'hidden' });
    assert.equal((await db().collection('productStats').doc(PRODUCT_A).get()).data().count, 0);
    await ops('/api/ops/reviews/status', { id: item.id, status: 'published' });
    assert.equal((await db().collection('productStats').doc(PRODUCT_A).get()).data().count, 1);
});

test('Customers: search by phone and set a temporary password', async () => {
    const registered = await api('/api/account/register', { method: 'POST', body: { identifier: '23 456 789', password: 'emulator-pass-123', name: 'Tool Customer' } });
    assert.equal(registered.status, 200, JSON.stringify(registered.body));
    const found = await ops(`/api/ops/users?q=${encodeURIComponent('23456789')}`);
    assert.equal(found.body.users.length, 1);
    const uid = found.body.users[0].uid;
    const detail = await ops(`/api/ops/user?uid=${uid}`);
    assert.equal(detail.body.user.name, 'Tool Customer');
    const reset = await ops('/api/ops/users/temp-password', { uid });
    assert.match(reset.body.password, /^[A-Za-z2-9]{10}$/);
    assert.equal((await db().collection('users').doc(uid).get()).data().mustChangePassword, true);
});

test('unknown tool routes return 404', async () => {
    assert.equal((await ops('/api/ops/nope')).status, 404);
});
