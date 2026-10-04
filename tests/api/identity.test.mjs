// Email-or-phone accounts: registration, uniqueness, hidden synthetic emails,
// verified-only guest linking, and staff temporary passwords.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST, PRODUCT_A, api, db, lib, resetEmulators, startServer, stopServer, admin } from './helpers.mjs';

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const PASSWORD = 'emulator-pass-123';
let ipCounter = 0;
const freshIp = () => ({ 'X-Forwarded-For': `192.0.2.${(ipCounter += 1)}` });

async function passwordSignIn(email, password) {
    const response = await fetch(
        `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
    );
    const body = await response.json();
    return body.idToken ? { token: body.idToken, uid: body.localId } : null;
}

const register = (identifier, { name = 'Test Customer', password = PASSWORD } = {}) =>
    api('/api/account/register', { method: 'POST', body: { identifier, password, name, lang: 'fr' }, headers: freshIp() });

const synthetic = digits => `${digits}@phone.sofracom.local`;

// Staff actions run in the local admin tool, through the shared functions.
const STAFF = { uid: 'local-admin:test' };
let users;

before(async () => {
    await resetEmulators();
    await startServer();
    users = await lib('adminUsers');
});

after(() => stopServer());

describe('registration with email or phone', () => {
    test('an email account needs no verification to sign in, order and see its profile', async () => {
        const created = await register('Skipper@Example.test', { name: 'Ali Ben Salah' });
        assert.equal(created.status, 200, JSON.stringify(created.body));
        assert.equal(created.body.type, 'email');
        const user = await passwordSignIn('skipper@example.test', PASSWORD);
        assert.ok(user, 'signs in with the lowercased email');
        const profile = await api('/api/account/profile', { user });
        assert.equal(profile.body.profile.accountType, 'email');
        assert.equal(profile.body.profile.email, 'skipper@example.test');
        assert.equal(profile.body.profile.emailVerified, false);
        const order = await api('/api/create-order', {
            method: 'POST',
            user,
            body: { customer: GUEST, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] },
        });
        assert.equal(order.status, 200, 'unverified accounts can check out');
    });

    test('a phone account signs in with its number; the synthetic email is never exposed', async () => {
        const created = await register('52 663 210', { name: 'Mohamed Hassan' });
        assert.equal(created.status, 200, JSON.stringify(created.body));
        assert.equal(created.body.type, 'phone');
        const user = await passwordSignIn(synthetic('21652663210'), PASSWORD);
        assert.ok(user);
        const profile = await api('/api/account/profile', { user });
        assert.equal(profile.body.profile.accountType, 'phone');
        assert.equal(profile.body.profile.phone, '+21652663210');
        assert.equal(profile.body.profile.email, '');
        assert.equal(JSON.stringify(profile.body).includes('phone.sofracom.local'), false);

        const order = await api('/api/create-order', {
            method: 'POST',
            user,
            body: { customer: GUEST, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] },
        });
        const saved = (await db().collection('orders').doc(order.body.orderId).get()).data();
        assert.equal(saved.uid, user.uid);
        assert.equal(saved.email, null);
        assert.equal(JSON.stringify(saved).includes('phone.sofracom.local'), false);
    });

    test('the same phone cannot be registered twice, whatever the formatting', async () => {
        await register('98 111 222');
        for (const variant of ['98111222', '+216 98 111 222', '0021698111222', '216-98-111-222']) {
            const again = await register(variant);
            assert.equal(again.status, 409, variant);
            assert.equal(again.body.code, 'identity/phone-taken');
        }
    });

    test('the same email cannot be registered twice, whatever the case', async () => {
        assert.equal((await register('dup@example.test')).status, 200);
        const again = await register('DUP@Example.TEST');
        assert.equal(again.status, 409);
        assert.equal(again.body.code, 'identity/email-taken');
    });

    test('contact details are unique across accounts too', async () => {
        await register('owner@example.test');
        const emailUser = await passwordSignIn('owner@example.test', PASSWORD);
        const addPhone = await api('/api/account/profile', { method: 'PUT', user: emailUser, body: { phone: '22 333 444' } });
        assert.equal(addPhone.status, 200, JSON.stringify(addPhone.body));
        assert.equal(addPhone.body.profile.phone, '+21622333444');

        const phoneSignup = await register('22333444');
        assert.equal(phoneSignup.body.code, 'identity/phone-taken', 'a contact phone blocks a new phone account');

        await register('55 666 777');
        const phoneUser = await passwordSignIn(synthetic('21655666777'), PASSWORD);
        const stealEmail = await api('/api/account/profile', { method: 'PUT', user: phoneUser, body: { email: 'owner@example.test' } });
        assert.equal(stealEmail.status, 409);
        assert.equal(stealEmail.body.code, 'identity/email-taken');
        const ownEmail = await api('/api/account/profile', { method: 'PUT', user: phoneUser, body: { email: 'mine@example.test' } });
        assert.equal(ownEmail.body.profile.email, 'mine@example.test');

        // Releasing a contact phone frees it for others.
        await api('/api/account/profile', { method: 'PUT', user: emailUser, body: { phone: '' } });
        assert.equal((await register('22333444')).status, 200);
    });

    test('invalid identifiers and weak passwords are rejected', async () => {
        assert.equal((await register('1234')).body.code, 'identity/invalid-phone');
        assert.equal((await register('nobody@')).body.code, 'identity/invalid-email');
        assert.equal((await register('21600000000@phone.sofracom.local')).status, 400);
        assert.equal((await register('91 000 000', { password: 'short' })).body.code, 'identity/weak-password');
    });
});

describe('guest history linking stays restricted', () => {
    test('orders placed as a guest are linked only after the email is verified', async () => {
        await register('guest-then-account@example.test');
        let user = await passwordSignIn('guest-then-account@example.test', PASSWORD);
        const guestOrder = await api('/api/create-order', {
            method: 'POST',
            body: { customer: { ...GUEST, email: 'guest-then-account@example.test' }, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] },
        });

        const refused = await api('/api/account/link', { method: 'POST', user, body: {} });
        assert.equal(refused.status, 403);
        assert.equal(refused.body.code, 'auth/email-unverified');
        assert.equal((await db().collection('orders').doc(guestOrder.body.orderId).get()).data().uid, null);

        await admin.getAuth().updateUser(user.uid, { emailVerified: true });
        user = await passwordSignIn('guest-then-account@example.test', PASSWORD);
        const linked = await api('/api/account/link', { method: 'POST', user, body: {} });
        assert.equal(linked.body.linkedOrders, 1);
    });

    test('phone accounts never link guest orders, even with a matching contact email', async () => {
        await register('93 444 555');
        const user = await passwordSignIn(synthetic('21693444555'), PASSWORD);
        await api('/api/account/profile', { method: 'PUT', user, body: { email: 'contact-only@example.test' } });
        const guestOrder = await api('/api/create-order', {
            method: 'POST',
            body: { customer: { ...GUEST, email: 'contact-only@example.test' }, items: [{ productId: PRODUCT_A, variantIndex: 0, quantity: 1 }] },
        });
        const refused = await api('/api/account/link', { method: 'POST', user, body: {} });
        assert.equal(refused.status, 403);
        assert.equal((await db().collection('orders').doc(guestOrder.body.orderId).get()).data().uid, null);
    });
});

describe('staff (local admin tool): customer search and temporary passwords', () => {
    test('staff find customers by phone in any format, without synthetic emails', async () => {
        await register('29 888 777', { name: 'Sami Trabelsi' });
        const byPhone = await users.searchUsers('+216 29 888 777');
        assert.equal(byPhone.length, 1);
        assert.equal(byPhone[0].phone, '+21629888777');
        assert.equal(byPhone[0].email, '');
        assert.equal(JSON.stringify(byPhone).includes('phone.sofracom.local'), false);
        const byName = await users.searchUsers('sami');
        assert.ok(byName.some(user => user.name === 'Sami Trabelsi'));
    });

    test('a temporary password works once and must be changed at the next sign-in', async () => {
        await register('27 123 456', { name: 'Forgetful Captain' });
        const original = await passwordSignIn(synthetic('21627123456'), PASSWORD);

        const { password: temp } = await users.setTemporaryPassword(original.uid, STAFF);
        assert.match(temp, /^[A-Za-z2-9]{10}$/);
        assert.equal(JSON.stringify((await db().collection('users').doc(original.uid).get()).data()).includes(temp), false, 'not stored');

        assert.equal(await passwordSignIn(synthetic('21627123456'), PASSWORD), null, 'old password no longer works');
        const withTemp = await passwordSignIn(synthetic('21627123456'), temp);
        assert.ok(withTemp);
        const profile = await api('/api/account/profile', { user: withTemp });
        assert.equal(profile.body.profile.mustChangePassword, true);

        const detail = await users.userDetail(original.uid);
        assert.equal(detail.user.name, 'Forgetful Captain');
        assert.equal(detail.user.mustChangePassword, true);
        assert.ok(Array.isArray(detail.orders));
    });

    test('changing the password from the browser clears the flag with a fresh token', async () => {
        await register('26 777 888', { name: 'Browser Flow' });
        const account = await passwordSignIn(synthetic('21626777888'), PASSWORD);
        const { password: temp } = await users.setTemporaryPassword(account.uid, STAFF);
        const signedIn = await passwordSignIn(synthetic('21626777888'), temp);

        // What updatePassword() does in the browser: it returns a new ID token.
        const response = await fetch(
            `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: signedIn.token, password: 'browser-new-pass-1', returnSecureToken: true }),
            }
        );
        const updated = await response.json();
        assert.ok(updated.idToken, JSON.stringify(updated));

        // A stale token is never reported as a revoked staff device.
        const stale = await api('/api/account/password-changed', { method: 'POST', user: signedIn, body: {} });
        assert.notEqual(stale.body.code, 'device/revoked');

        const fresh = await api('/api/account/password-changed', { method: 'POST', user: { token: updated.idToken }, body: {} });
        assert.equal(fresh.status, 200, JSON.stringify(fresh.body));
        const profile = await api('/api/account/profile', { user: { token: updated.idToken } });
        assert.equal(profile.body.profile.mustChangePassword, false);
    });

    test('Google-only accounts and devices have no password to reset', async () => {
        const googleUser = await admin.getAuth().createUser({ email: 'g-only@example.test' });
        await assert.rejects(users.setTemporaryPassword(googleUser.uid, STAFF), err => err.code === 'user/no-password');
        await assert.rejects(users.setTemporaryPassword('device_abc', STAFF), err => err.code === 'user/no-password');
    });

    test('the website exposes no customer search or password reset for staff', async () => {
        const customer = await passwordSignIn(synthetic('21629888777'), PASSWORD);
        const response = await api('/api/admin/users?q=sami', { user: customer });
        assert.ok([404, 405].includes(response.status), `got ${response.status}`);
    });
});
