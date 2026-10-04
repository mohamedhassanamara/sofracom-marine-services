// The only price/number/date formatting for the site (and tested in tests/unit/format.test.mjs).
// Prices are TND with 3 decimals: EN "1,234.500 DT", FR "1 234,500 DT", AR "‏1.234,500 د.ت.‏"
// (Arabic keeps Latin digits as used in Tunisia; Intl adds the bidi marks that keep the
// number and the currency in the right order inside Arabic text).
import { DEFAULT_LOCALE } from './i18n/locales.js';

const NUMBER_LOCALE = { en: 'en-TN', fr: 'fr-TN', ar: 'ar-TN' };
const DATE_LOCALE = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-TN' };
export const CURRENCY = 'TND';

const cache = new Map();
const formatter = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
};

export function formatPrice(value, locale = DEFAULT_LOCALE) {
    const amount = Number(value);
    const safe = Number.isFinite(amount) ? amount : 0;
    if (locale === 'en') {
        // en-TN puts "TND" first; local shops (and FR) write the amount then "DT".
        const number = formatter('price-en', () => new Intl.NumberFormat('en-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
        return `${number.format(safe)} DT`;
    }
    const tag = NUMBER_LOCALE[locale] || NUMBER_LOCALE.en;
    return formatter(`price-${tag}`, () => new Intl.NumberFormat(tag, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 3, maximumFractionDigits: 3 })).format(safe);
}

export function formatNumber(value, locale = DEFAULT_LOCALE, options = {}) {
    const tag = NUMBER_LOCALE[locale] || NUMBER_LOCALE.en;
    return formatter(`num-${tag}-${JSON.stringify(options)}`, () => new Intl.NumberFormat(tag, options)).format(Number(value) || 0);
}

export function formatDate(value, locale = DEFAULT_LOCALE, { withTime = false } = {}) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const tag = DATE_LOCALE[locale] || DATE_LOCALE.en;
    return formatter(`date-${tag}-${withTime}`, () =>
        new Intl.DateTimeFormat(tag, { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}) })
    ).format(date);
}

// Lowest and highest price of a product (variants included) for "from X" labels.
export function priceRange(product) {
    const prices = (Array.isArray(product?.variants) && product.variants.length ? product.variants.map(variant => variant.price) : [product?.price])
        .map(Number)
        .filter(price => Number.isFinite(price) && price > 0);
    if (!prices.length) return { min: 0, max: 0, varies: false };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, varies: min !== max };
}
