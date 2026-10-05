// URL locales, redirects and SEO routes on the running site (next dev against the emulators).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { BASE, startServer, stopServer } from './helpers.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../../public/assets/data/products.json');
const imageRedirects = require('../../lib/data/image-redirects.json');

before(startServer);
after(stopServer);

const get = (path, headers = {}) => fetch(`${BASE}${path}`, { redirect: 'manual', headers });
const htmlTag = async response => (await response.text()).match(/<html[^>]*>/)[0];

test('each locale is rendered on the server with its lang and direction', async () => {
    assert.match(await htmlTag(await get('/')), /lang="en" dir="ltr"/);
    assert.match(await htmlTag(await get('/fr')), /lang="fr" dir="ltr"/);
    assert.match(await htmlTag(await get('/ar/products')), /lang="ar" dir="rtl"/);
});

test('"/" goes to the remembered language; deep links are never redirected', async () => {
    const remembered = await get('/', { cookie: 'NEXT_LOCALE=ar' });
    assert.ok([302, 307].includes(remembered.status), `status ${remembered.status}`);
    assert.match(remembered.headers.get('location'), /\/ar$/);
    const deep = await get('/products', { cookie: 'NEXT_LOCALE=ar', 'accept-language': 'ar' });
    assert.equal(deep.status, 200);
    assert.match(await htmlTag(deep), /lang="en"/);
});

test('old product URLs redirect permanently in every locale', async () => {
    const category = catalog.categories.find(cat => cat.products.some(p => p.legacyId && p.legacyId !== p.id));
    const product = category.products.find(p => p.legacyId && p.legacyId !== p.id);
    for (const prefix of ['', '/fr']) {
        const response = await get(`${prefix}/products/${category.slug}/${product.legacyId}`);
        assert.equal(response.status, 308);
        assert.equal(new URL(response.headers.get('location'), BASE).pathname, `${prefix}/products/${category.slug}/${product.id}`);
    }
});

test('replaced images redirect permanently to their WebP', async () => {
    const [oldPath, newPath] = Object.entries(imageRedirects).find(([from]) => from.startsWith('/assets/products/'));
    const response = await get(oldPath);
    assert.equal(response.status, 308);
    assert.equal(new URL(response.headers.get('location'), BASE).pathname, newPath);
    assert.equal((await get(newPath)).status, 200);
});

test('pages carry canonical + hreflang; sitemap and robots are served', async () => {
    const html = await (await get('/fr/products')).text();
    assert.match(html, /<link rel="canonical" href="[^"]+\/fr\/products"/);
    for (const lang of ['en', 'fr', 'ar', 'x-default']) assert.match(html, new RegExp(`hrefLang="${lang}"`));
    const sitemap = await get('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type'), /xml/);
    assert.match(await sitemap.text(), /hreflang="ar"/);
    const robots = await (await get('/robots.txt')).text();
    assert.match(robots, /Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
    assert.match(robots, /Disallow: \/ar\/account/);
});

test('private pages are noindex', async () => {
    for (const path of ['/checkout', '/track', '/account/login']) {
        assert.match(await (await get(path)).text(), /<meta name="robots" content="noindex, follow"/, path);
    }
});
