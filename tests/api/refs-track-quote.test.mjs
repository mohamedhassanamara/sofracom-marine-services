// Order/quote references, guest tracking (/api/track) and the /quote fields.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST, PRODUCT_A, api, db, resetEmulators, startServer, stopServer } from './helpers.mjs';

before(async () => {
    await resetEmulators();
    await startServer();
});
after(stopServer);

const placeOrder = () => api('/api/create-order', { method: 'POST', body: { customer: { ...GUEST, email: 'guest@example.test', notes: 'Leave at the office' }, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 2 }] } });

test('an order gets a short unique ref, reserved in refs/', async () => {
    const order = await placeOrder();
    assert.equal(order.status, 200, JSON.stringify(order.body));
    assert.match(order.body.ref, /^SOF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
    const saved = (await db().collection('orders').doc(order.body.orderId).get()).data();
    assert.equal(saved.ref, order.body.ref);
    const reserved = (await db().collection('refs').doc(order.body.ref).get()).data();
    assert.deepEqual([reserved.kind, reserved.docId], ['order', order.body.orderId]);
});

test('track: ref + phone (any formatting) returns status and items, never personal data', async () => {
    const { body } = await placeOrder();
    for (const [ref, phone] of [
        [body.ref, '12345678'],
        [body.ref.toLowerCase().replace('-', ' '), '+216 12 345 678'],
    ]) {
        const tracked = await api('/api/track', { method: 'POST', body: { ref, phone } });
        assert.equal(tracked.status, 200, JSON.stringify(tracked.body));
        assert.equal(tracked.body.order.ref, body.ref);
        assert.equal(tracked.body.order.status, 'pending');
        assert.equal(tracked.body.order.items[0].quantity, 2);
        assert.deepEqual(tracked.body.order.history.map(entry => entry.status), ['pending']);
        const text = JSON.stringify(tracked.body);
        for (const secret of [GUEST.name, GUEST.address, 'guest@example.test', 'Leave at the office', GUEST.phone]) {
            assert.ok(!text.includes(secret), `leaked ${secret}`);
        }
    }
});

test('track: a wrong phone and an unknown ref fail the same way', async () => {
    const { body } = await placeOrder();
    const wrongPhone = await api('/api/track', { method: 'POST', body: { ref: body.ref, phone: '98765432' } });
    const unknown = await api('/api/track', { method: 'POST', body: { ref: 'SOF-22222', phone: '12345678' } });
    assert.equal(wrongPhone.status, 404);
    assert.equal(unknown.status, 404);
    assert.equal(wrongPhone.body.code, 'track/not-found');
    assert.equal(unknown.body.error, wrongPhone.body.error);
    const invalid = await api('/api/track', { method: 'POST', body: { ref: 'nope', phone: '1' } });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, 'track/invalid');
});

test('track: guesses on one reference are capped (shared across server instances)', async () => {
    const { body } = await placeOrder();
    const statuses = [];
    for (let i = 0; i < 9; i += 1) {
        statuses.push((await api('/api/track', { method: 'POST', body: { ref: body.ref, phone: `5555${String(1000 + i)}` } })).status);
    }
    assert.deepEqual(statuses.slice(0, 8), Array(8).fill(404));
    assert.equal(statuses[8], 429);
    const right = await api('/api/track', { method: 'POST', body: { ref: body.ref, phone: '12345678' } });
    assert.equal(right.status, 429, 'the cap also blocks the right phone until the window ends');
});

test('quote: ref, service, boat and a catalog product are stored', async () => {
    const quote = await api('/api/create-quote', {
        method: 'POST',
        body: { name: 'Sami', email: 'sami@example.test', details: 'Antifouling for a 12 m sailboat', service: 'antifouling', boatType: 'sailboat', boatLength: '12.25', productId: PRODUCT_A },
    });
    assert.equal(quote.status, 200, JSON.stringify(quote.body));
    assert.match(quote.body.ref, /^SOQ-[A-Z0-9]{5}$/);
    const saved = (await db().collection('quotes').doc(quote.body.quoteId).get()).data();
    assert.equal(saved.ref, quote.body.ref);
    assert.equal(saved.service, 'antifouling');
    assert.equal(saved.boat_type, 'sailboat');
    assert.equal(saved.boat_length_m, 12.3);
    assert.equal(saved.product_id, PRODUCT_A);
    assert.ok(saved.product_title);

    const junk = await api('/api/create-quote', { method: 'POST', body: { name: 'Sami', email: 'sami@example.test', details: 'Something else entirely', service: 'hacking', boatType: 'submarine', boatLength: '-3', productId: 'p_nothere' } });
    const stored = (await db().collection('quotes').doc(junk.body.quoteId).get()).data();
    assert.deepEqual([stored.service, stored.boat_type, stored.boat_length_m, stored.product_id], [null, null, null, null]);

    const notAnOrder = await api('/api/track', { method: 'POST', body: { ref: quote.body.ref, phone: '12345678' } });
    assert.equal(notAnOrder.status, 400);
});
