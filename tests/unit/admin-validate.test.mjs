// The admin's catalog checks and publish diff (tools/admin/api/validate.mjs, diff.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, validateGallery } from '../../tools/admin/api/validate.mjs';
import { diffCatalog, diffGallery } from '../../tools/admin/api/diff.mjs';

const product = (over = {}) => ({ id: 'p_aaaaaaaa', title: 'Paint', price: 10, stock: 'in', images: ['a-800.webp'], translations: { fr: { title: 'Peinture' }, ar: { title: 'طلاء' } }, ...over });
const catalog = (products = [product()], extra = []) => ({ categories: [{ name: 'Paints', slug: 'paints', products }, ...extra] });

test('a clean catalog passes', () => {
    assert.deepEqual(validateCatalog(catalog()).errors, []);
});

test('blocks duplicate slugs, unsafe new slugs, duplicate ids and bad prices', () => {
    const { errors } = validateCatalog(
        catalog(
            [product(), product({ title: 'Other', price: 1.2345 }), product({ id: 'p_bbbbbbbb', title: '', price: -1 })],
            [{ name: 'Paints 2', slug: 'paints', products: [] }, { name: 'Tools & Parts', slug: 'tools&parts', products: [] }]
        )
    );
    const text = errors.map(error => error.message).join('\n');
    assert.match(text, /Two categories use the slug "paints"/);
    assert.match(text, /share the id p_aaaaaaaa/);
    assert.match(text, /at most 3 decimals/);
    assert.match(text, /has no title/);
    assert.match(text, /positive number/);
    assert.match(text, /Slug "tools&parts" should only use/);
});

test('an existing odd slug is only a warning (changing it would break its URLs)', () => {
    const result = validateCatalog({ categories: [{ name: 'Power', slug: 'powertools&parts', products: [] }] }, { previousSlugs: ['powertools&parts'] });
    assert.deepEqual(result.errors, []);
    assert.match(result.warnings[0].message, /should only use/);
});

test('options need unique labels and a price; missing translations are warnings', () => {
    const result = validateCatalog(catalog([product({ variants: [{ label: '1L', price: 5 }, { label: '1l', price: '' }], translations: {} })]));
    assert.equal(result.errors.length, 2);
    assert.ok(result.warnings.some(warning => /no FR title/.test(warning.message)));
});

test('gallery entries need an id, a type, a source and a title', () => {
    const { errors } = validateGallery({ entries: [{ id: 'x', type: 'image', src: 'a.webp', title: 'A' }, { id: 'x', type: 'gif', src: '', title: '' }] });
    assert.equal(errors.length, 4);
});

test('the publish diff names what changed, in words', () => {
    const before = catalog([product(), product({ id: 'p_cccccccc', title: 'Old' })]);
    const after = catalog([product({ price: 12 }), product({ id: 'p_dddddddd', title: 'New' })], [{ name: 'Tools', slug: 'tools', products: [] }]);
    const diff = diffCatalog(before, after);
    assert.deepEqual(diff.products.changed, [{ id: 'p_aaaaaaaa', title: 'Paint', fields: ['price'] }]);
    assert.deepEqual(diff.products.added.map(item => item.id), ['p_dddddddd']);
    assert.deepEqual(diff.products.removed.map(item => item.id), ['p_cccccccc']);
    assert.deepEqual(diff.categories.added.map(item => item.slug), ['tools']);
    const gallery = diffGallery({ entries: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] }, { entries: [{ id: 'b', title: 'B' }, { id: 'a', title: 'A2' }] });
    assert.deepEqual(gallery.changed.map(item => [item.id, item.fields.join()]), [['b', 'order'], ['a', 'title,order']]);
});
