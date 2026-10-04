// Canonical URLs, hreflang, sitemap, robots and JSON-LD (lib/seo.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE_URL, alternates, canonicalUrl, productJsonLd, robotsTxt, sitemapEntries, sitemapXml, breadcrumbJsonLd } from '../../lib/seo.js';

test('canonical URLs put the locale in the path, English at the root, no query', () => {
    assert.equal(canonicalUrl('/products/x?ref=ad', 'en'), `${SITE_URL}/products/x`);
    assert.equal(canonicalUrl('/products/x', 'fr'), `${SITE_URL}/fr/products/x`);
    assert.equal(canonicalUrl('/', 'ar'), `${SITE_URL}/ar`);
    assert.equal(canonicalUrl('/', 'en'), `${SITE_URL}/`);
});

test('every page lists en/fr/ar alternates plus x-default (English)', () => {
    const links = alternates('/gallery');
    assert.deepEqual(links.map(link => link.hrefLang), ['en', 'fr', 'ar', 'x-default']);
    assert.equal(links.find(link => link.hrefLang === 'x-default').href, `${SITE_URL}/gallery`);
});

test('the sitemap has every page in every locale with alternates, and nothing private', () => {
    const categories = [{ slug: 'paints', products: [{ id: 'p_aaaaaaaa' }, { id: 'p_bbbbbbbb' }] }];
    const entries = sitemapEntries(categories);
    assert.deepEqual(entries.map(entry => entry.path), ['/', '/products', '/gallery', '/products/paints', '/products/paints/p_aaaaaaaa', '/products/paints/p_bbbbbbbb']);
    const xml = sitemapXml(entries);
    assert.equal(xml.match(/<url>/g).length, entries.length * 3);
    assert.match(xml, new RegExp(`<loc>${SITE_URL}/ar/products/paints/p_aaaaaaaa</loc>`));
    assert.match(xml, /hreflang="x-default"/);
    assert.doesNotMatch(xml, /account|checkout|search/);
});

test('robots.txt blocks the API and private pages in every locale and points to the sitemap', () => {
    const robots = robotsTxt();
    for (const line of ['Disallow: /api/', 'Disallow: /account', 'Disallow: /fr/account', 'Disallow: /ar/checkout', `Sitemap: ${SITE_URL}/sitemap.xml`]) {
        assert.ok(robots.includes(line), line);
    }
});

test('Product JSON-LD: one price → Offer, variants → AggregateOffer, rating only when reviewed', () => {
    const base = { id: 'p_aaaaaaaa', title: 'Seaforce', brand: 'JOTUN', images: ['/assets/products/a-800.webp'], stock: 'in' };
    const single = productJsonLd({ product: { ...base, price: 120, variants: [] }, path: '/products/paints/p_aaaaaaaa' });
    assert.equal(single.offers['@type'], 'Offer');
    assert.equal(single.offers.price, '120.000');
    assert.equal(single.offers.priceCurrency, 'TND');
    assert.equal(single.aggregateRating, undefined);
    assert.equal(single.image[0], `${SITE_URL}/assets/products/a-800.webp`);

    const variants = productJsonLd({
        product: { ...base, variants: [{ price: 50, stock: 'out' }, { price: 180.5, stock: 'on-order' }] },
        path: '/products/paints/p_aaaaaaaa',
        locale: 'fr',
        stats: { count: 3, avg: 4.333 },
    });
    assert.equal(variants.offers['@type'], 'AggregateOffer');
    assert.equal(variants.offers.lowPrice, '50.000');
    assert.equal(variants.offers.highPrice, '180.500');
    assert.equal(variants.offers.availability, 'https://schema.org/BackOrder');
    assert.equal(variants.url, `${SITE_URL}/fr/products/paints/p_aaaaaaaa`);
    assert.deepEqual(variants.aggregateRating, { '@type': 'AggregateRating', ratingValue: '4.3', reviewCount: 3, bestRating: 5, worstRating: 1 });
});

test('BreadcrumbList positions and locale URLs', () => {
    const crumbs = breadcrumbJsonLd([{ name: 'Products', path: '/products' }, { name: 'Paints', path: '/products/paints' }], 'ar');
    assert.deepEqual(crumbs.itemListElement.map(item => [item.position, item.item]), [
        [1, `${SITE_URL}/ar/products`],
        [2, `${SITE_URL}/ar/products/paints`],
    ]);
});
