// URLs, hreflang alternates and JSON-LD for search engines. Pure functions (tested in
// tests/unit/seo.test.mjs); components/Seo.js renders them into <head>.
import { DEFAULT_LOCALE, LOCALES, localePath } from './i18n/locales.js';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sofracom-marine-services.vercel.app').replace(/\/+$/, '');
export const SITE_NAME = 'SOFRACOM';
export const DEFAULT_OG_IMAGE = '/assets/site/hero-1600.webp';

const OG_LOCALE = { en: 'en_US', fr: 'fr_FR', ar: 'ar_TN' };

export const absoluteUrl = path => (/^https?:/.test(path || '') ? path : `${SITE_URL}${path && path.startsWith('/') ? path : `/${path || ''}`}`);

// `path` has no locale prefix ("/products/x"). The query string is dropped: pages are
// canonical without it.
export const canonicalPath = path => {
    const clean = (path || '/').split(/[?#]/)[0] || '/';
    return clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
};

export const canonicalUrl = (path, locale = DEFAULT_LOCALE) => absoluteUrl(localePath(canonicalPath(path), locale));

export const alternates = path => [
    ...LOCALES.map(locale => ({ hrefLang: locale, href: canonicalUrl(path, locale) })),
    { hrefLang: 'x-default', href: canonicalUrl(path, DEFAULT_LOCALE) },
];

export const ogLocale = locale => OG_LOCALE[locale] || OG_LOCALE.en;

export function localBusinessJsonLd(locale = DEFAULT_LOCALE) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Store',
        '@id': `${SITE_URL}/#business`,
        name: SITE_NAME,
        description: 'Marine paints, antifouling, sealants, batteries and tools, plus boat maintenance services and haul-out coordination in Monastir, Tunisia.',
        url: canonicalUrl('/', locale),
        logo: absoluteUrl('/logo.jpeg'),
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        telephone: '+216 52 663 210',
        email: 'sofracomtunisia@gmail.com',
        priceRange: 'TND',
        currenciesAccepted: 'TND',
        address: {
            '@type': 'PostalAddress',
            addressLocality: 'Monastir',
            addressCountry: 'TN',
        },
        areaServed: 'Monastir, Tunisia',
    };
}

export function breadcrumbJsonLd(items, locale = DEFAULT_LOCALE) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: canonicalUrl(item.path, locale),
        })),
    };
}

const SCHEMA_STOCK = {
    in: 'https://schema.org/InStock',
    'on-order': 'https://schema.org/BackOrder',
    out: 'https://schema.org/OutOfStock',
};

// `product` is localized; `stats` is productStats ({ count, avg }) or null.
export function productJsonLd({ product, path, locale = DEFAULT_LOCALE, stats = null }) {
    const prices = (product.variants?.length ? product.variants.map(variant => variant.price) : [product.price])
        .map(Number)
        .filter(price => Number.isFinite(price) && price > 0);
    const stocks = product.variants?.length ? product.variants.map(variant => variant.stock) : [product.stock];
    const stock = stocks.includes('in') ? 'in' : stocks.includes('on-order') ? 'on-order' : 'out';
    const url = canonicalUrl(path, locale);
    const data = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${url}#product`,
        name: product.title,
        description: product.description || undefined,
        image: (product.images || [product.image]).filter(Boolean).slice(0, 4).map(absoluteUrl),
        sku: product.id,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        category: product.categoryName || undefined,
        url,
    };
    if (prices.length) {
        const low = Math.min(...prices);
        const high = Math.max(...prices);
        data.offers =
            low === high
                ? { '@type': 'Offer', price: low.toFixed(3), priceCurrency: 'TND', availability: SCHEMA_STOCK[stock], url, seller: { '@id': `${SITE_URL}/#business` } }
                : { '@type': 'AggregateOffer', lowPrice: low.toFixed(3), highPrice: high.toFixed(3), offerCount: prices.length, priceCurrency: 'TND', availability: SCHEMA_STOCK[stock], url };
    }
    if (stats && stats.count > 0) {
        data.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: Number(stats.avg).toFixed(1),
            reviewCount: stats.count,
            bestRating: 5,
            worstRating: 1,
        };
    }
    return JSON.parse(JSON.stringify(data)); // drop undefined fields
}

// Every public, indexable page: { path, lastmod? }. Account, checkout and search pages are not listed.
export function sitemapEntries(categories) {
    const entries = [{ path: '/' }, { path: '/products' }, { path: '/gallery' }];
    for (const category of categories) {
        entries.push({ path: `/products/${category.slug}` });
        for (const product of category.products || []) entries.push({ path: `/products/${category.slug}/${product.id}` });
    }
    return entries;
}

const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function sitemapXml(entries) {
    const urls = entries.flatMap(entry =>
        LOCALES.map(locale => {
            const links = alternates(entry.path)
                .map(alt => `    <xhtml:link rel="alternate" hreflang="${alt.hrefLang}" href="${xmlEscape(alt.href)}"/>`)
                .join('\n');
            return `  <url>\n    <loc>${xmlEscape(canonicalUrl(entry.path, locale))}</loc>\n${links}\n  </url>`;
        })
    );
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

const PRIVATE_PATHS = ['/account', '/checkout', '/track', '/styleguide'];

export const robotsTxt = () =>
    [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        ...PRIVATE_PATHS.flatMap(path => LOCALES.map(locale => `Disallow: ${localePath(path, locale)}`)),
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
    ].join('\n');
