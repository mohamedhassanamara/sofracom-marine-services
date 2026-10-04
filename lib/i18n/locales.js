// Locales live in the URL: English at /, French at /fr, Arabic at /ar (next.config.js i18n).
// CommonJS so next.config.js can require it.
const LOCALES = ['en', 'fr', 'ar'];
const DEFAULT_LOCALE = 'en';
// Next.js reads this cookie to remember the visitor's choice when they come back to "/".
const LOCALE_COOKIE = 'NEXT_LOCALE';

const isLocale = value => LOCALES.includes(value);
const dirFor = locale => (locale === 'ar' ? 'rtl' : 'ltr');

// The URL of `path` (no locale prefix, starts with "/") in `locale`.
const localePath = (path, locale) => {
    const clean = path && path.startsWith('/') ? path : `/${path || ''}`;
    if (locale === DEFAULT_LOCALE) return clean;
    return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
};

// lang/dir attributes for a piece of text in `textLang` shown on a `pageLang` page
// (an English fallback inside an Arabic page must be marked, or it renders and reads wrongly).
const langAttrs = (textLang, pageLang) => (textLang && textLang !== pageLang ? { lang: textLang, dir: dirFor(textLang) } : {});

module.exports = { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, dirFor, localePath, langAttrs };
