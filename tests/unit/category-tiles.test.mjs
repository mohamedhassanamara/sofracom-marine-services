// Category tiles are composed from products (lib/categoryTiles.js): approved cutouts first,
// in stock, most reviewed, varied, deterministic; manual picks win; graceful fallbacks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTileProducts, popularityBucket, productFamily, tileProduct } from '../../lib/categoryTiles.js';
import { cutoutResolver } from '../../lib/cutouts.js';

const cut = name => `/assets/products/cutouts/${name}-cut-800.webp`;
const photo = name => `/assets/products/${name}-800.webp`;
const P = (id, brand, title, image, stock = 'in') => ({ id, brand, title, image, stock, variants: [] });
const ids = list => list.map(product => product.id);

test('only approved cutouts are drawn when the category has any', () => {
    const products = [P('a', 'JOTUN', 'Jotun SeaForce', photo('a')), P('b', 'HEMPEL', 'Hempel Olympic', cut('b')), P('c', 'SIKA', 'Sikaflex 291', photo('c')), P('d', 'BOSCH', 'Bosch sander', cut('d'))];
    assert.deepEqual(ids(pickTileProducts(products)), ['b', 'd'], 'two cutouts → a two-item tile, no photos mixed in');
});

test('ranking: in stock, then most reviewed (in buckets), then catalog order', () => {
    const products = [
        P('out', 'A', 'Alpha paint', cut('1'), 'out'),
        P('quiet', 'B', 'Beta primer', cut('2')),
        P('loved', 'C', 'Gamma thinner', cut('3')),
        P('order', 'D', 'Delta varnish', cut('4'), 'on-order'),
        P('fine', 'E', 'Epsilon filler', cut('5')),
    ];
    const popularity = { loved: 12, quiet: 0, fine: 2, out: 40 };
    assert.deepEqual(ids(pickTileProducts(products, { popularity })), ['loved', 'fine', 'quiet']);
    assert.equal(popularityBucket(0), 0);
    assert.equal(popularityBucket(2), 1);
    assert.equal(popularityBucket(9), 2);
    assert.equal(popularityBucket(10), 3);
    // One more review inside the same bucket doesn't reshuffle the tile.
    assert.deepEqual(ids(pickTileProducts(products, { popularity: { ...popularity, loved: 13 } })), ['loved', 'fine', 'quiet']);
});

test('variety: no three tins of one brand and shape when something else exists', () => {
    const products = [
        P('j1', 'JOTUN', 'JOTUN Thinner N° 07 0.8L', cut('j1')),
        P('j2', 'JOTUN', 'JOTUN Thinner N° 17 0.8L', cut('j2')),
        P('j3', 'JOTUN', 'JOTUN Thinner N° 10 5L', cut('j3')),
        P('j4', 'JOTUN', 'JOTUN Penguard Primer', cut('j4')),
        P('h1', 'HEMPEL', "HEMPEL'S Thinner 08450", cut('h1')),
        P('s1', 'SEAJET', 'SEAJET 039 Antifouling', cut('s1')),
    ];
    assert.equal(productFamily(products[0]), 'thinner');
    assert.deepEqual(ids(pickTileProducts(products)), ['j1', 's1', 'j4'], 'a new brand AND family first, then a new family of a known brand');
    const sameBrand = products.slice(0, 4);
    assert.deepEqual(ids(pickTileProducts(sameBrand)), ['j1', 'j4', 'j2'], 'one brand only: two families, then whatever is left');
});

test('deterministic: the same catalog always gives the same tile', () => {
    const products = Array.from({ length: 12 }, (_, i) => P(`p${i}`, `B${i % 3}`, `Brand${i % 3} item${i % 4} thing`, i % 2 ? cut(`p${i}`) : photo(`p${i}`)));
    const first = ids(pickTileProducts(products, { popularity: { p3: 5 } }));
    for (let i = 0; i < 5; i += 1) assert.deepEqual(ids(pickTileProducts(products, { popularity: { p3: 5 } })), first);
    assert.equal(first.length, 3);
});

test('manual tile products win, in the chosen order, even without cutouts', () => {
    const products = [P('a', 'A', 'Alpha', cut('a')), P('b', 'B', 'Beta', photo('b')), P('c', 'C', 'Gamma', cut('c'))];
    assert.deepEqual(ids(pickTileProducts(products, { featuredIds: ['b', 'gone', 'a'] })), ['b', 'a']);
});

test('fallbacks: 1 cutout → a one-item tile; no cutouts → photos; no products → nothing (icon)', () => {
    assert.deepEqual(ids(pickTileProducts([P('a', 'A', 'Alpha', photo('a')), P('b', 'B', 'Beta', cut('b'))])), ['b']);
    assert.deepEqual(ids(pickTileProducts([P('a', 'A', 'Alpha', photo('a')), P('b', 'B', 'Beta', photo('b'))])), ['a', 'b']);
    assert.deepEqual(pickTileProducts([]), []);
    assert.deepEqual(pickTileProducts([P('logo', 'A', 'No photo', '/assets/site/logo-800.webp')]), [], 'the logo placeholder is not a product photo');
});

test('tileProduct reads a raw catalog product like the site does (cutout swap, keep-original switch)', () => {
    const resolve = cutoutResolver({ images: { '/assets/products/a-800.webp': { status: 'approved', cutout: cut('a') }, '/assets/products/b-800.webp': { status: 'pending' } } });
    assert.equal(tileProduct({ id: 'a', brand: ' jotun ', images: ['assets/products/a-800.webp'] }, resolve).image, cut('a'));
    assert.equal(tileProduct({ id: 'a', images: ['assets/products/a-800.webp'], keepOriginalPhoto: true }, resolve).image, photo('a'));
    assert.equal(tileProduct({ id: 'b', image: 'assets/products/b-800.webp' }, resolve).image, photo('b'), 'pending cutouts never reach the site');
    assert.equal(tileProduct({ id: 'a', brand: ' jotun ' }).brand, 'JOTUN');
});
