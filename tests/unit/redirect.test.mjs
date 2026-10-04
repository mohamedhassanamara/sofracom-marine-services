// Bug 3: after sign-in/sign-up users go back where they came from, else /account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterAuthPath, authLink, safeNext } from '../../lib/redirect.js';

test('after sign-in/up users return to the page they came from', () => {
    assert.equal(afterAuthPath('/products/antifouling-coatings?checkout=1'), '/products/antifouling-coatings?checkout=1');
    assert.equal(afterAuthPath('/products/a/p_x#write-review'), '/products/a/p_x#write-review');
    assert.equal(afterAuthPath(undefined), '/account');
    assert.equal(afterAuthPath(''), '/account');
});

test('only same-site paths are accepted', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'account']) {
        assert.equal(safeNext(bad), null, bad);
        assert.equal(afterAuthPath(bad), '/account', bad);
    }
});

test('auth pages never redirect back to an auth page', () => {
    assert.equal(afterAuthPath('/account/login'), '/account');
    assert.equal(afterAuthPath('/account/signup?next=/x'), '/account');
});

test('links carry the way back, reopening checkout or the review form', () => {
    assert.equal(
        authLink('login', '/products/antifouling-coatings', { reopenCheckout: true }),
        `/account/login?next=${encodeURIComponent('/products/antifouling-coatings?checkout=1')}`
    );
    assert.equal(
        authLink('signup', '/products/a/p_x?ref=1#top', { hash: 'write-review' }),
        `/account/signup?next=${encodeURIComponent('/products/a/p_x?ref=1#write-review')}`
    );
    assert.equal(authLink('login', '/account/login'), '/account/login');
});
