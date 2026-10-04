// Catalog content in all three languages: titles, category names, use tags, option labels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { glossaryTerm, localizeTags } from '../../lib/catalogGlossary.js';
import { localizeProduct } from '../../lib/localize.js';

const catalog = JSON.parse(readFileSync(new URL('../../public/assets/data/products.json', import.meta.url), 'utf-8'));
const drafts = JSON.parse(readFileSync(new URL('../../scripts/data/ar-drafts.json', import.meta.url), 'utf-8'));
const products = catalog.categories.flatMap(category => category.products);

test('every product and category has a French and an Arabic name', () => {
    const missing = [];
    for (const category of catalog.categories) {
        for (const lang of ['fr', 'ar']) if (!category.translations?.[lang]?.name) missing.push(`category ${category.slug} ${lang}`);
    }
    for (const product of products) {
        for (const lang of ['fr', 'ar']) if (!product.translations?.[lang]?.title) missing.push(`${product.id} ${lang}`);
    }
    assert.deepEqual(missing, []);
});

test('drafted Arabic titles are flagged for review; reviewed or original ones are not touched', () => {
    for (const [id, title] of Object.entries(drafts.products)) {
        const product = products.find(item => item.id === id);
        assert.ok(product, id);
        const ar = product.translations.ar;
        if (ar.title === title) assert.equal(ar.needsReview, true, `${id} draft without needsReview`);
    }
    // Existing translations are never rewritten: an English copy only gets a suggestion + the flag.
    const originals = products.filter(product => !drafts.products[product.id]);
    for (const product of originals) {
        const ar = product.translations.ar;
        if (ar.needsReview) assert.ok(ar.suggestedTitle && ar.suggestedTitle !== ar.title, `${product.id} flagged without a suggestion`);
    }
});

test('use tags: translated, merged across EN/FR spellings, brand dropped, unknown kept', () => {
    assert.deepEqual(localizeTags(['noir', 'Black', 'érodable', 'erodable', 'JOTUN', 'SeaForce'], 'en', { brand: 'jotun' }), ['Black', 'Erodible', 'SeaForce']);
    assert.deepEqual(localizeTags(['Antifouling', 'warm waters'], 'ar'), ['مضاد الحشف', 'المياه الدافئة']);
    assert.deepEqual(localizeTags(['primer', 'Primaire', 'apprêt'], 'fr'), ['Primaire']);
    assert.equal(glossaryTerm('mat', 'ar'), null, 'ambiguous (fiberglass mat vs matt finish): left as is');
    assert.equal(glossaryTerm('Mate', 'ar'), 'مطفأ');
});

test('localizeProduct: own translations win, then the glossary, for tags and option labels', () => {
    const product = {
        id: 'p_x',
        title: 'Varnish',
        brand: 'SOTACH',
        usage: ['Varnish', 'Glossy', 'sotach'],
        variants: [{ label: 'Glossy', price: 1 }, { label: '2.5L', price: 2 }, { label: 'White', price: 3 }],
        translations: { ar: { title: 'ورنيش', variants: [{ label: 'لامع جدًا' }] } },
    };
    const ar = localizeProduct(product, 'ar');
    assert.equal(ar.title, 'ورنيش');
    assert.deepEqual(ar.usage, ['ورنيش', 'لامع']);
    assert.deepEqual(ar.variants.map(variant => variant.label), ['لامع جدًا', '2.5L', 'أبيض']);
    const withOwnTags = localizeProduct({ ...product, translations: { fr: { usage: ['Vernis brillant'] } } }, 'fr');
    assert.deepEqual(withOwnTags.usage, ['Vernis brillant']);
});

test('Arabic text keeps Latin/number runs in order (bidi isolates), plain text is untouched', async () => {
    const { isolateLtr, stripIsolates } = await import('../../lib/bidi.js');
    assert.equal(isolateLtr('براغي VYS، 50 قطعة، M4 × 20 مم'), 'براغي ⁦VYS⁩، 50 قطعة، ⁦M4 × 20⁩ مم');
    assert.equal(isolateLtr('Jotun SeaForce 2.5L'), 'Jotun SeaForce 2.5L', 'no Arabic: unchanged');
    const once = isolateLtr('مثقاب BOSCH GSB');
    assert.equal(isolateLtr(once), once, 'idempotent');
    assert.equal(stripIsolates(once), 'مثقاب BOSCH GSB');
    assert.equal(localizeProduct({ title: 'x', translations: { ar: { title: 'مثقاب BOSCH GSB' } } }, 'ar').title, once);
    assert.equal(localizeProduct({ title: 'x', translations: { fr: { title: 'Perceuse BOSCH' } } }, 'fr').title, 'Perceuse BOSCH');
});
