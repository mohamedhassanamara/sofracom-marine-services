// End-to-end API checks for the "done when" criteria: guest checkout, accounts,
// order tracking, staff status changes and verified-buyer reviews. Every request
// goes straight to the API, as a malicious client would.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
    GUEST,
    PRODUCT_A,
    PRODUCT_B,
    api,
    createDevice,
    createUser,
    lib,
    db,
    resetEmulators,
    startServer,
    stopServer,
} from './helpers.mjs';

const line = (productId, quantity = 1) => ({ productId, variantIndex: 0, quantity });

let staff;

before(async () => {
    await resetEmulators();
    await startServer();
    staff = await createDevice('Shop phone');
});

after(() => stopServer());

// Status changes come from the staff phone app (device token).
const setStatus = (id, status, user = staff, collection = 'orders') =>
    api(`/api/admin/${collection}`, { method: 'PATCH', body: { id, status }, user });

describe('guest checkout', () => {
    test('a guest can order exactly as before, priced by the server', async () => {
        const response = await api('/api/create-order', {
            method: 'POST',
            body: {
                customer: GUEST,
                items: [{ ...line(PRODUCT_A, 2), price: 0.001, title: 'Free paint' }],
                total: 1,
                uid: 'attacker',
                status: 'delivered',
            },
        });
        assert.equal(response.status, 200, JSON.stringify(response.body));
        const order = (await db().collection('orders').doc(response.body.orderId).get()).data();
        assert.equal(order.uid, null);
        assert.equal(order.status, 'pending');
        assert.ok(order.items[0].unitPrice > 1, 'unit price comes from the catalog');
        assert.equal(order.items[0].title === 'Free paint', false);
        assert.equal(order.total, Math.round((order.subtotal + order.delivery_fee) * 1000) / 1000);
        assert.equal(order.delivery_fee, 7);
        assert.deepEqual(order.productIds, [PRODUCT_A]);
        assert.equal(order.statusHistory[0].status, 'pending');
    });

    test('carts saved before stable ids still check out', async () => {
        const response = await api('/api/create-order', {
            method: 'POST',
            body: {
                customer: GUEST,
                items: [{ id: 'antifouling-coatings-jotun-seaforce-active-2-5l-black-noir-2.5L', quantity: 1 }],
            },
        });
        assert.equal(response.status, 200, JSON.stringify(response.body));
        const order = (await db().collection('orders').doc(response.body.orderId).get()).data();
        assert.equal(order.items[0].productId, PRODUCT_A);
        assert.equal(order.items[0].variantLabel, '2.5L');
    });

    test('invalid orders are rejected', async () => {
        const empty = await api('/api/create-order', { method: 'POST', body: { customer: GUEST, items: [] } });
        assert.equal(empty.status, 400);
        const unknown = await api('/api/create-order', {
            method: 'POST',
            body: { customer: GUEST, items: [{ productId: 'p_nothere0', quantity: 1 }] },
        });
        assert.equal(unknown.body.code, 'cart/unknown-product');
        const missingAddress = await api('/api/create-order', {
            method: 'POST',
            body: { customer: { ...GUEST, address: '' }, items: [line(PRODUCT_A)] },
        });
        assert.equal(missingAddress.status, 400);
    });
});

describe('accounts, addresses and order tracking', () => {
    test('a user saves an address, checks out with it and the order is theirs', async () => {
        const buyer = await createUser({ name: 'Mohamed Hassan', verified: true });
        const saved = await api('/api/account/addresses', {
            method: 'POST',
            user: buyer,
            body: { address: { label: 'Boat', fullName: 'Mohamed Hassan', phone: '+21650000000', line: 'Pontoon B', city: 'Monastir' } },
        });
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
        assert.equal(saved.body.defaultAddressId, saved.body.id);

        const order = await api('/api/create-order', {
            method: 'POST',
            user: buyer,
            body: { addressId: saved.body.id, customer: { notes: 'Call first' }, items: [line(PRODUCT_A)], uid: 'someone-else' },
        });
        assert.equal(order.status, 200, JSON.stringify(order.body));
        const doc = (await db().collection('orders').doc(order.body.orderId).get()).data();
        assert.equal(doc.uid, buyer.uid);
        assert.equal(doc.customer_address, 'Pontoon B, Monastir');
        assert.equal(doc.email, buyer.email);
    });

    test("a user cannot order with someone else's saved address", async () => {
        const owner = await createUser();
        const thief = await createUser();
        const saved = await api('/api/account/addresses', {
            method: 'POST',
            user: owner,
            body: { address: { fullName: 'Owner Name', phone: '+21650000001', line: 'Secret street 1', city: 'Monastir' } },
        });
        const response = await api('/api/create-order', {
            method: 'POST',
            user: thief,
            body: { addressId: saved.body.id, items: [line(PRODUCT_A)] },
        });
        assert.equal(response.body.code, 'address/not-found');
    });

    test('guest history links only once the email is verified', async () => {
        const unverified = await createUser({ verified: false });
        await api('/api/create-order', {
            method: 'POST',
            body: { customer: { ...GUEST, email: unverified.email.toUpperCase() }, items: [line(PRODUCT_A)] },
        });
        const refused = await api('/api/account/link', { method: 'POST', user: unverified, body: {} });
        assert.equal(refused.status, 403);

        const verified = await createUser({ verified: true });
        const guestOrder = await api('/api/create-order', {
            method: 'POST',
            body: { customer: { ...GUEST, email: verified.email }, items: [line(PRODUCT_A)] },
        });
        await api('/api/create-quote', {
            method: 'POST',
            body: { name: 'Guest', email: verified.email, details: 'Please quote an antifouling job on a 12m sailboat.' },
        });
        const linked = await api('/api/account/link', { method: 'POST', user: verified, body: {} });
        assert.equal(linked.status, 200);
        assert.equal(linked.body.linkedOrders, 1);
        assert.equal(linked.body.linkedQuotes, 1);
        const doc = (await db().collection('orders').doc(guestOrder.body.orderId).get()).data();
        assert.equal(doc.uid, verified.uid);
    });

    test('the profile route works for an account that has no profile document yet', async () => {
        const legacy = await createUser({ name: 'Old Account' });
        assert.equal((await db().collection('users').doc(legacy.uid).get()).exists, false);
        const response = await api('/api/account/profile', { user: legacy });
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.profile.name, 'Old Account');
        assert.equal((await db().collection('users').doc(legacy.uid).get()).exists, true, 'created on first GET');
    });

    test('API errors always carry a code', async () => {
        const missing = await api('/api/create-order', { method: 'POST', body: { customer: GUEST, items: [] } });
        assert.ok(missing.body.code);
        const wrongMethod = await api('/api/account/profile', { method: 'DELETE' });
        assert.equal(wrongMethod.status, 405);
        assert.equal(wrongMethod.body.code, 'method-not-allowed');
    });

    test('profile and address routes require a valid token', async () => {
        assert.equal((await api('/api/account/profile')).status, 401);
        const forged = await api('/api/account/profile', { user: { token: 'forged' } });
        assert.equal(forged.status, 401);
    });
});

describe('staff status management', () => {
    test('only an enrolled phone can change statuses, and changes append to history', async () => {
        const customer = await createUser();
        const webAdmin = await createUser({ name: 'Website account with admin claim', isAdmin: true });
        const order = await api('/api/create-order', { method: 'POST', user: customer, body: { customer: GUEST, items: [line(PRODUCT_A)] } });
        assert.equal((await setStatus(order.body.orderId, 'delivered', customer)).status, 403);
        const refused = await setStatus(order.body.orderId, 'delivered', webAdmin);
        assert.equal(refused.status, 403, 'an admin claim on a website account is not enough');
        assert.equal(refused.body.code, 'auth/device-required');

        for (const status of ['confirmed', 'preparing', 'out_for_delivery', 'delivered']) {
            const response = await setStatus(order.body.orderId, status);
            assert.equal(response.status, 200, JSON.stringify(response.body));
        }
        const doc = (await db().collection('orders').doc(order.body.orderId).get()).data();
        assert.equal(doc.status, 'delivered');
        assert.deepEqual(
            doc.statusHistory.map(entry => entry.status),
            ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']
        );
        assert.equal((await setStatus(order.body.orderId, 'shipped')).status, 400);
    });

    test('the website has no admin pages or admin listing routes', async () => {
        const webAdmin = await createUser({ isAdmin: true });
        const page = await fetch(new URL('/admin', (await import('./helpers.mjs')).BASE));
        assert.equal(page.status, 404);
        for (const path of ['/api/admin/orders', '/api/admin/quotes']) {
            assert.equal((await api(path, { user: webAdmin })).status, 405, `${path} GET is gone`);
        }
        for (const path of ['/api/admin/devices', '/api/admin/users', '/api/admin/reviews']) {
            assert.equal((await api(path, { method: 'PATCH', user: webAdmin, body: {} })).status, 404, path);
        }
    });
});

describe('verified-buyer reviews', () => {
    let buyer;
    let orderId;

    before(async () => {
        buyer = await createUser({ name: 'Mohamed Hassan Amara', verified: true });
        const order = await api('/api/create-order', {
            method: 'POST',
            user: buyer,
            body: { customer: GUEST, items: [line(PRODUCT_A), line(PRODUCT_B)] },
        });
        orderId = order.body.orderId;
    });

    test('nobody can review before the order is delivered', async () => {
        const early = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_A, rating: 5 } });
        assert.equal(early.status, 403);
        assert.equal(early.body.code, 'review/not-eligible');
        await setStatus(orderId, 'out_for_delivery');
        const stillEarly = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_A, rating: 5 } });
        assert.equal(stillEarly.status, 403);
    });

    test('after delivery the buyer reviews each product exactly once', async () => {
        await setStatus(orderId, 'delivered');
        const eligibility = await api(`/api/reviews/mine?productId=${PRODUCT_A}`, { user: buyer });
        assert.equal(eligibility.body.eligible, true);

        const first = await api('/api/reviews', {
            method: 'POST',
            user: buyer,
            body: { productId: PRODUCT_A, rating: 4, comment: 'Très bonne peinture.', lang: 'fr', status: 'published', uid: 'x' },
        });
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.equal(first.body.review.displayName, 'Mohamed A.');
        assert.deepEqual(first.body.stats.count, 1);

        const edit = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_A, rating: 2 } });
        assert.equal(edit.status, 200);
        assert.equal(edit.body.review.created, false);
        assert.equal(edit.body.stats.count, 1, 'editing does not add a second review');
        assert.equal(edit.body.stats.avg, 2);

        const second = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_B, rating: 5 } });
        assert.equal(second.status, 200);

        const overview = await api('/api/reviews/mine', { user: buyer });
        assert.equal(overview.body.toReview.length, 0);
        assert.equal(overview.body.reviews.length, 2);
    });

    test('the review appears publicly with stats, and stars feed the cards', async () => {
        const list = await api(`/api/reviews?productId=${PRODUCT_A}&fresh=1`);
        assert.equal(list.status, 200);
        assert.equal(list.body.reviews.length, 1);
        assert.equal(list.body.reviews[0].verified, true);
        assert.equal(list.body.reviews[0].uid, undefined, 'uid is not exposed');
        assert.equal(list.body.stats.dist[2], 1);
        const stats = await api('/api/product-stats');
        assert.equal(stats.body.stats[PRODUCT_A].count, 1);
    });

    test('users without a delivered order cannot review, even calling the API directly', async () => {
        const stranger = await createUser({ verified: true });
        const response = await api('/api/reviews', { method: 'POST', user: stranger, body: { productId: PRODUCT_A, rating: 5 } });
        assert.equal(response.status, 403);
        const anonymous = await api('/api/reviews', { method: 'POST', body: { productId: PRODUCT_A, rating: 5 } });
        assert.equal(anonymous.status, 401);
        const forged = await api('/api/reviews', { method: 'POST', user: { token: 'forged' }, body: { productId: PRODUCT_A, rating: 5 } });
        assert.equal(forged.status, 401);
    });

    test('input is validated', async () => {
        const zero = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_A, rating: 0 } });
        assert.equal(zero.body.code, 'review/invalid-rating');
        const half = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: PRODUCT_A, rating: 3.5 } });
        assert.equal(half.body.code, 'review/invalid-rating');
        const long = await api('/api/reviews', {
            method: 'POST',
            user: buyer,
            body: { productId: PRODUCT_A, rating: 3, comment: 'x'.repeat(1001) },
        });
        assert.equal(long.status, 400);
        const unknown = await api('/api/reviews', { method: 'POST', user: buyer, body: { productId: 'p_nothere0', rating: 3 } });
        assert.equal(unknown.status, 404);
    });

    test('hiding a review removes it from the page and the stats; the website has no moderation route', async () => {
        const id = `${PRODUCT_B}_${buyer.uid}`;
        assert.equal((await api('/api/admin/reviews', { method: 'PATCH', user: buyer, body: { id, status: 'hidden' } })).status, 404);
        // Moderation happens in the local admin tool, through the shared function.
        const { setReviewStatus } = await lib('reviewModeration');
        await setReviewStatus(id, 'hidden', { uid: 'local-admin:test' });
        const list = await api(`/api/reviews?productId=${PRODUCT_B}&fresh=2`);
        assert.equal(list.body.reviews.length, 0);
        assert.equal(list.body.stats.count, 0);
        await setReviewStatus(id, 'published', { uid: 'local-admin:test' });
        const back = await api(`/api/reviews?productId=${PRODUCT_B}&fresh=3`);
        assert.equal(back.body.stats.count, 1);
    });

    test('deleting a review updates the stats', async () => {
        const removed = await api(`/api/reviews?productId=${PRODUCT_A}`, { method: 'DELETE', user: buyer });
        assert.equal(removed.status, 200);
        assert.equal(removed.body.stats.count, 0);
        const again = await api('/api/reviews/mine', { user: buyer });
        assert.equal(again.body.toReview.length, 1, 'the product can be reviewed again');
    });
});

describe('abuse protection', () => {
    test('guest orders from one address are rate limited', async () => {
        const headers = { 'X-Forwarded-For': '203.0.113.77' };
        const statuses = [];
        for (let index = 0; index < 11; index += 1) {
            const response = await api('/api/create-order', {
                method: 'POST',
                headers,
                body: { customer: GUEST, items: [line(PRODUCT_A)] },
            });
            statuses.push(response.status);
        }
        assert.equal(statuses.at(-1), 429);
    });
});
