// Locale routing config: English at /, French at /fr, Arabic at /ar, and the permanent
// redirects (old product URLs, replaced images) apply in every locale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextConfig = require('../../next.config.js');
const { LOCALES, DEFAULT_LOCALE, dirFor, localePath } = require('../../lib/i18n/locales.js');

test('next.config uses URL locales with English as default', () => {
    assert.deepEqual(nextConfig.i18n.locales, ['en', 'fr', 'ar']);
    assert.equal(nextConfig.i18n.defaultLocale, 'en');
    assert.deepEqual(LOCALES, nextConfig.i18n.locales);
    assert.equal(DEFAULT_LOCALE, 'en');
});

test('localePath and text direction', () => {
    assert.equal(localePath('/products/a', 'en'), '/products/a');
    assert.equal(localePath('/products/a', 'fr'), '/fr/products/a');
    assert.equal(localePath('/', 'ar'), '/ar');
    assert.equal(dirFor('ar'), 'rtl');
    assert.equal(dirFor('fr'), 'ltr');
});

test('redirects: old product ids and replaced images are permanent and locale-aware', async () => {
    const redirects = await nextConfig.redirects();
    assert.ok(redirects.length > 0);
    for (const redirect of redirects) {
        assert.equal(redirect.permanent, true);
        assert.notEqual(redirect.locale, false, `${redirect.source} would only match with a locale prefix`);
    }
    const images = require('../../lib/data/image-redirects.json');
    const [oldPath, newPath] = Object.entries(images)[0];
    assert.ok(redirects.some(redirect => redirect.destination === newPath && redirect.source.replace(/\\/g, '') === oldPath));
    assert.ok(Object.values(images).every(target => /-800\.webp$/.test(target)));
});
