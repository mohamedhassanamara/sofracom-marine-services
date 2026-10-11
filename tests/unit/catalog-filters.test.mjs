// Category filters (lib/catalogFilters.js): the price range matches any option's price,
// survives a URL round trip, and retired params (use=, price=) are ignored.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, filterQuery, matchesPrice, parseFilters, priceBounds, productPrices } from '../../lib/catalogFilters.js';

const P = (id, brand, prices, stock = 'in', usage = []) =>
    Array.isArray(prices)
        ? { id, brand, price: prices[0], stock, usage, variants: prices.map((price, index) => ({ label: `v${index}`, price, stock })) }
        : { id, brand, price: prices, stock, usage, variants: [] };

const products = [
    P('a', 'JOTUN', 18.77), // single price
    P('b', 'JOTUN', [210, 752.261]), // "from 210 DT", options up to 752.261
    P('c', 'HEMPEL', 95.5, 'on-order', ['Antifouling']),
    P('d', 'SEAJET', [341.887, 2498.405]),
    P('e', 'SIKA', 57.414, 'out'),
];
const bounds = priceBounds(products);

test('bounds are whole dinars around the lowest and highest option price', () => {
    assert.deepEqual(bounds, { min: 18, max: 2499 });
    assert.deepEqual(priceBounds([]), { min: 0, max: 0 });
    assert.deepEqual(productPrices(products[1]), [210, 752.261]);
});

test('a product matches when ANY of its option prices is inside the range', () => {
    assert.equal(matchesPrice(products[1], 700, 800), true, 'the 752 DT option matches although the card says "from 210"');
    assert.equal(matchesPrice(products[1], 300, 700), false);
    assert.equal(matchesPrice(products[3], 2000, null), true);
    assert.equal(matchesPrice(products[0], null, null), true);
    const ids = filterProducts(products, { brands: [], inStock: false, min: 50, max: 400 }).map(product => product.id);
    assert.deepEqual(ids, ['b', 'c', 'd', 'e']);
});

test('brand, stock and price combine', () => {
    const ids = filterProducts(products, { brands: ['JOTUN', 'HEMPEL'], inStock: true, min: 100, max: null }).map(product => product.id);
    assert.deepEqual(ids, ['b']);
});

test('URL round trip: parse → query → parse gives the same filters', () => {
    const query = { brand: ['JOTUN', 'SEAJET'], stock: 'in', min: '100', max: '500', sort: 'price', q: 'black' };
    const filters = parseFilters(query, bounds);
    assert.deepEqual(filters, { brands: ['JOTUN', 'SEAJET'], inStock: true, min: 100, max: 500, sort: 'price', q: 'black' });
    assert.deepEqual(filterQuery(filters, bounds), query);
    assert.deepEqual(parseFilters(filterQuery(filters, bounds), bounds), filters);
});

test('price params are clamped, ordered and dropped at the bounds', () => {
    assert.deepEqual(parseFilters({ min: '900', max: '200' }, bounds), { brands: [], inStock: false, min: 200, max: 900, sort: 'name', q: '' });
    const outside = parseFilters({ min: '-5', max: '99999' }, bounds);
    assert.equal(outside.min, null, 'at or below the lowest price = no lower limit');
    assert.equal(outside.max, null, 'at or above the highest price = no upper limit');
    assert.equal(parseFilters({ min: 'abc' }, bounds).min, null);
    assert.equal(parseFilters({ min: '120.6' }, bounds).min, 121, 'whole dinars');
    // The full range writes nothing: a reset leaves a clean URL.
    assert.deepEqual(filterQuery({ brands: [], min: bounds.min, max: bounds.max, sort: 'name' }, bounds), {});
    assert.deepEqual(filterQuery({ brands: [], min: null, max: 300 }, bounds), { max: '300' });
});

test('retired params are ignored: old ?use= and ?price= links still load everything', () => {
    const filters = parseFilters({ use: ['Antifouling', 'Epoxy'], price: '50-200', categorySlug: 'antifouling-coatings' }, bounds);
    assert.deepEqual(filters, { brands: [], inStock: false, min: null, max: null, sort: 'name', q: '' });
    assert.equal(filterProducts(products, filters).length, products.length);
    assert.equal('use' in filterQuery({ ...filters, uses: ['Antifouling'] }, bounds), false, 'use is never written back');
});
