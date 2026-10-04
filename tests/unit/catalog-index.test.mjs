// The slim catalog the header/search use, and its search ranking (lib/catalogIndex.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogIndex, normalizeText, searchProducts } from '../../lib/catalogIndex.js';

const categories = [
    {
        slug: 'paints',
        name: 'Antifouling & Coatings',
        translations: { fr: { name: 'Antifouling et peintures' }, ar: { name: 'مضادات الحشف' } },
        image: '/assets/categories/paints-800.webp',
        products: [
            { id: 'p_1', title: 'Jotun SeaForce Active 2.5L', brand: 'JOTUN', image: '/assets/products/a-800.webp', price: 0, stock: 'in', usage: ['Antifouling'], variants: [{ label: '2.5L', price: 341.887, stock: 'in' }, { label: '20L', price: 2498.405, stock: 'out' }], translations: { ar: { title: 'جوتن سي فورس' } } },
            { id: 'p_2', title: 'Hempel primer', brand: 'HEMPEL', image: '/assets/products/b-800.webp', price: 80, stock: 'out', usage: [], variants: [] },
            { id: 'p_3', title: 'Sanding block for Jotun', brand: 'GENERIC', image: '', price: 5, stock: 'in', usage: [], variants: [] },
        ],
    },
];

test('the index is slim: localized names/titles, the -400 image, the "from" price and overall stock', () => {
    const index = buildCatalogIndex(categories);
    assert.deepEqual(index.categories, [
        { slug: 'paints', name: { en: 'Antifouling & Coatings', fr: 'Antifouling et peintures', ar: 'مضادات الحشف' }, image: '/assets/categories/paints-400.webp', count: 3 },
    ]);
    const [jotun, hempel] = index.products;
    assert.deepEqual(jotun.title, { en: 'Jotun SeaForce Active 2.5L', fr: 'Jotun SeaForce Active 2.5L', ar: 'جوتن سي فورس' });
    assert.equal(jotun.image, '/assets/products/a-400.webp');
    assert.equal(jotun.price, 341.887, 'the same lowest price the cards and the cart use');
    assert.equal(jotun.varies, true);
    assert.equal(jotun.stock, 'in');
    assert.equal(hempel.stock, 'out');
    assert.equal(JSON.stringify(index).includes('description'), false);
});

test('search matches every word, ignores accents and case, and ranks title matches first', () => {
    const index = buildCatalogIndex(categories);
    assert.deepEqual(searchProducts(index, 'jotun', 'en').map(p => p.id), ['p_1', 'p_3']);
    assert.deepEqual(searchProducts(index, 'JOTUN seaforce', 'en').map(p => p.id), ['p_1']);
    assert.deepEqual(searchProducts(index, 'antifouling', 'en').map(p => p.id).sort(), ['p_1', 'p_2', 'p_3']);
    assert.deepEqual(searchProducts(index, 'jotun', 'ar').map(p => p.id)[0], 'p_1');
    assert.deepEqual(searchProducts(index, 'جوتن', 'ar').map(p => p.id), ['p_1']);
    assert.deepEqual(searchProducts(index, '   ', 'en'), []);
    assert.equal(normalizeText('Décapant  ÉRODABLE!'), 'decapant erodable');
});
