// One price format for the whole site: TND with 3 decimals, per language.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, formatDate, priceRange } from '../../lib/format.js';

test('prices: 3 decimals, DT after the amount in EN/FR, Arabic currency with bidi marks', () => {
    assert.equal(formatPrice(2498.405, 'en'), '2,498.405 DT');
    assert.equal(formatPrice(12.5, 'en'), '12.500 DT');
    assert.match(formatPrice(2498.405, 'fr'), /^2\s498,405\sDT$/);
    const ar = formatPrice(341.887, 'ar');
    assert.match(ar, /341,887/);
    assert.match(ar, /د\.ت/);
    assert.ok(ar.startsWith('‏'), 'starts with a right-to-left mark so it never garbles');
    assert.equal(formatPrice(undefined, 'en'), '0.000 DT');
    assert.equal(formatPrice('7', 'en'), '7.000 DT');
});

test('price range for "from" labels', () => {
    assert.deepEqual(priceRange({ price: 10, variants: [] }), { min: 10, max: 10, varies: false });
    assert.deepEqual(priceRange({ variants: [{ price: 50 }, { price: 22.5 }, { price: 0 }] }), { min: 22.5, max: 50, varies: true });
    assert.deepEqual(priceRange({}), { min: 0, max: 0, varies: false });
});

test('dates follow the language', () => {
    const date = '2026-10-04T12:00:00Z';
    assert.match(formatDate(date, 'en'), /4 Oct 2026/);
    assert.match(formatDate(date, 'fr'), /4 oct\. 2026/);
    assert.equal(formatDate('nope', 'en'), '');
});
