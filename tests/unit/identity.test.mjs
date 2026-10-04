import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    formatPhone,
    isSyntheticEmail,
    normalizePhone,
    parseIdentifier,
    phoneAuthEmail,
    phoneFromAuthEmail,
    publicEmail,
} from '../../lib/identity.js';

test('Tunisian numbers normalise to E.164 whatever the formatting', () => {
    for (const input of ['52663210', '52 663 210', '52-663-210', '+216 52 663 210', '0021652663210', '21652663210', '(+216) 52.663.210']) {
        assert.equal(normalizePhone(input), '+21652663210', input);
    }
});

test('other countries need a + or 00 prefix', () => {
    assert.equal(normalizePhone('+33 6 12 34 56 78'), '+33612345678');
    assert.equal(normalizePhone('0033612345678'), '+33612345678');
    assert.equal(normalizePhone('0612345678'), null, '10 local digits without a country code are ambiguous');
});

test('invalid phone numbers are rejected', () => {
    for (const input of ['', '1234567', '5266321', '+216 5266321', '+2165266321099', 'abc', '+12', null, undefined]) {
        assert.equal(normalizePhone(input), null, String(input));
    }
});

test('identifiers are detected as email or phone', () => {
    assert.deepEqual(parseIdentifier('  Captain@Example.TN '), {
        type: 'email',
        email: 'captain@example.tn',
        authEmail: 'captain@example.tn',
    });
    assert.deepEqual(parseIdentifier('52 663 210'), {
        type: 'phone',
        phone: '+21652663210',
        authEmail: '21652663210@phone.sofracom.local',
    });
    assert.equal(parseIdentifier('not-an-email@').type, 'invalid');
    assert.equal(parseIdentifier('12').type, 'invalid');
    assert.equal(parseIdentifier('21652663210@phone.sofracom.local').type, 'invalid', 'synthetic emails cannot be typed');
});

test('synthetic emails are recognised and hidden', () => {
    const synthetic = phoneAuthEmail('+21652663210');
    assert.equal(isSyntheticEmail(synthetic), true);
    assert.equal(isSyntheticEmail('someone@example.tn'), false);
    assert.equal(publicEmail(synthetic), '');
    assert.equal(publicEmail('someone@example.tn'), 'someone@example.tn');
    assert.equal(phoneFromAuthEmail(synthetic), '+21652663210');
    assert.equal(formatPhone('+21652663210'), '+216 52 663 210');
    assert.equal(formatPhone('+33612345678'), '+33612345678');
});
