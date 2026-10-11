// The LOCAL admin app (tools/admin) against the emulators: it uses the same shared functions
// as the website and the staff phones, so its writes look identical.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { GUEST, PRODUCT_A, api, createUser, db, resetEmulators, startServer, stopServer } from './helpers.mjs';

const PORT = 5299;
const TOOL = `http://127.0.0.1:${PORT}`;
let tool;
let token; // the per-session token the admin puts in its page

async function admin(path, { method, body } = {}) {
    const verb = method || (body === undefined ? 'GET' : 'POST');
    const response = await fetch(`${TOOL}${path}`, {
        method: verb,
        headers: verb === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}

before(async () => {
    await resetEmulators();
    await startServer();
    tool = spawn('node', ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/admin/server.mjs', '--emulator'], {
        cwd: new URL('../..', import.meta.url).pathname,
        env: { ...process.env, ADMIN_PORT: String(PORT) },
        stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
            const page = await (await fetch(`${TOOL}/`)).text();
            token = page.match(/name="admin-token" content="(\w+)"/)?.[1];
            if (token) return;
        } catch {
            // starting
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('admin did not start');
});

after(() => {
    tool?.kill();
    stopServer();
});

const placeOrder = (user, items = [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }]) => api('/api/create-order', { method: 'POST', user, body: { customer: GUEST, items } });

test('the admin says it is pointed at the emulator', async () => {
    const meta = await admin('/api/meta');
    assert.equal(meta.body.target.mode, 'emulator');
    assert.equal(meta.body.target.projectId, 'demo-sofracom');
});

test('Firebase writes need the session token', async () => {
    const response = await fetch(`${TOOL}/api/devices/code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403);
});

test('Staff phones: create a code, the phone enrols, the admin lists and revokes it', async () => {
    const issued = await admin('/api/devices/code', { body: {} });
    assert.match(issued.body.code, /^\d{6}$/);
    const enrolled = await api('/api/devices/enroll', { method: 'POST', body: { code: issued.body.code, deviceName: 'Counter phone' } });
    assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));
    const listed = await admin('/api/devices');
    assert.equal(listed.body.code.status, 'used');
    assert.ok(listed.body.devices.some(device => device.id === enrolled.body.deviceId && device.active));
    const revoked = await admin(`/api/devices/${enrolled.body.deviceId}/revoke`, { body: {} });
    assert.equal(revoked.body.device.active, false);
});

test('Orders: search by ref, status changes append to the same history, notes stay internal', async () => {
    const order = await placeOrder();
    const found = await admin(`/api/orders?q=${encodeURIComponent(order.body.ref.toLowerCase())}`);
    assert.deepEqual(found.body.items.map(item => item.id), [order.body.orderId]);

    const changed = await admin(`/api/orders/${order.body.orderId}/status`, { body: { status: 'confirmed', note: 'Paid on pickup' } });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    const saved = (await db().collection('orders').doc(order.body.orderId).get()).data();
    assert.deepEqual(saved.statusHistory.map(entry => entry.status), ['pending', 'confirmed']);
    assert.equal(saved.statusHistory[1].note, 'Paid on pickup');
    assert.match(saved.statusHistory[1].by, /^local-admin:/);
    assert.equal((await admin(`/api/orders/${order.body.orderId}/status`, { body: { status: 'shipped' } })).status, 400);

    const noted = await admin(`/api/orders/${order.body.orderId}/notes`, { body: { text: 'Customer prefers mornings' } });
    assert.equal(noted.body.item.staffNotes[0].text, 'Customer prefers mornings');
    const tracked = await api('/api/track', { method: 'POST', body: { ref: order.body.ref, phone: GUEST.phone } });
    assert.ok(!JSON.stringify(tracked.body).includes('mornings'), 'internal notes never reach /track');

    const filtered = await admin('/api/orders?status=confirmed');
    assert.ok(filtered.body.items.some(item => item.id === order.body.orderId));
});

test('Orders: paging goes past the first page (not just the latest 100)', async () => {
    for (let i = 0; i < 6; i += 1) await placeOrder();
    const first = await admin('/api/orders?pageSize=4');
    assert.equal(first.body.items.length, 4);
    assert.ok(first.body.nextCursor);
    const second = await admin(`/api/orders?pageSize=4&cursor=${encodeURIComponent(first.body.nextCursor)}`);
    assert.ok(second.body.items.length >= 3);
    const ids = new Set([...first.body.items, ...second.body.items].map(item => item.id));
    assert.equal(ids.size, first.body.items.length + second.body.items.length, 'no order twice');
});

test('Quotes: saving the quoted amount and reply moves the request to "quoted"', async () => {
    const quote = await api('/api/create-quote', { method: 'POST', body: { name: 'Sami', email: 'sami@example.test', details: 'Antifouling for a 12 m sailboat', service: 'antifouling' } });
    const replied = await admin(`/api/quotes/${quote.body.quoteId}/reply`, { body: { amount: '1250.5', note: 'Two coats, 3 days.' } });
    assert.equal(replied.status, 200, JSON.stringify(replied.body));
    const saved = (await db().collection('quotes').doc(quote.body.quoteId).get()).data();
    assert.equal(saved.quoted_amount, 1250.5);
    assert.equal(saved.status, 'quoted');
    assert.equal(saved.statusHistory.at(-1).note, 'Two coats, 3 days.');
    assert.equal((await admin(`/api/quotes/${quote.body.quoteId}/reply`, { body: { amount: '-3' } })).status, 400);
});

test('Reviews: hiding from the admin updates product stats', async () => {
    const buyer = await createUser({ name: 'Review Writer' });
    const order = await placeOrder(buyer);
    await admin(`/api/orders/${order.body.orderId}/status`, { body: { status: 'delivered' } });
    const review = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_A, rating: 4 } });
    assert.equal(review.status, 200, JSON.stringify(review.body));

    const listed = await admin('/api/reviews?q=jotun');
    const item = listed.body.items.find(entry => entry.id === review.body.review.id);
    assert.ok(item);
    assert.ok(item.productTitle.startsWith('Jotun'));
    await admin(`/api/reviews/${item.id}/status`, { body: { status: 'hidden' } });
    assert.equal((await db().collection('productStats').doc(PRODUCT_A).get()).data().count, 0);
    await admin(`/api/reviews/${item.id}/status`, { body: { status: 'published' } });
    assert.equal((await db().collection('productStats').doc(PRODUCT_A).get()).data().count, 1);
});

test('Customers: search by phone and set a temporary password', async () => {
    const registered = await api('/api/account/register', { method: 'POST', body: { identifier: '23 456 789', password: 'emulator-pass-123', name: 'Tool Customer' } });
    assert.equal(registered.status, 200, JSON.stringify(registered.body));
    const found = await admin(`/api/customers?q=${encodeURIComponent('23456789')}`);
    assert.equal(found.body.users.length, 1);
    const uid = found.body.users[0].uid;
    const detail = await admin(`/api/customers/${uid}`);
    assert.equal(detail.body.user.name, 'Tool Customer');
    const reset = await admin(`/api/customers/${uid}/temp-password`, { body: {} });
    assert.match(reset.body.password, /^[A-Za-z2-9]{10}$/);
    assert.equal((await db().collection('users').doc(uid).get()).data().mustChangePassword, true);
});

test('Today lists what needs attention', async () => {
    const today = await admin('/api/today');
    assert.ok(today.body.newOrders.count >= 1);
    assert.ok(today.body.translations.count >= 1);
});

test('unknown routes return 404', async () => {
    assert.equal((await admin('/api/nope')).status, 404);
});
