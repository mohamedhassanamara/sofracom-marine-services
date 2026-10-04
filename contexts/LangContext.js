import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import en from '../lib/i18n/en';
import fr from '../lib/i18n/fr';
import ar from '../lib/i18n/ar';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '../lib/i18n/locales';

const TRANSLATIONS = { en, fr, ar };

const LangContext = createContext({
    lang: DEFAULT_LOCALE,
    setLang: () => {},
    t: key => TRANSLATIONS.en[key] || key,
});

// Before the locale moved into the URL, the choice was kept here.
const LEGACY_STORAGE_KEY = 'sofracom.lang.v1';

const rememberLocale = locale => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
};

const hasLocaleCookie = () => document.cookie.split('; ').some(entry => entry.startsWith(`${LOCALE_COOKIE}=`));

export function LangProvider({ children }) {
    const router = useRouter();
    // The language is the URL's: /, /fr/…, /ar/… (rendered on the server too).
    const lang = isLocale(router.locale) ? router.locale : DEFAULT_LOCALE;

    // Switching keeps the current page and remembers the choice for the next visit to "/".
    const setLang = useCallback(
        newLang => {
            if (!isLocale(newLang) || newLang === lang) return;
            rememberLocale(newLang);
            router.push({ pathname: router.pathname, query: router.query }, router.asPath, { locale: newLang, scroll: false });
        },
        [lang, router]
    );

    // One-time move of the old localStorage choice into the cookie (and the URL).
    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(LEGACY_STORAGE_KEY);
            if (!saved) return;
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
            if (hasLocaleCookie() || !isLocale(saved)) return;
            rememberLocale(saved);
            if (saved !== lang && lang === DEFAULT_LOCALE) {
                router.replace({ pathname: router.pathname, query: router.query }, router.asPath, { locale: saved, scroll: false });
            }
        } catch {
            // storage unavailable
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Client-side navigation between locales doesn't re-render <html>.
    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.body.classList.toggle('rtl', lang === 'ar');
    }, [lang]);

    const value = useMemo(() => {
        // t('reviews.count', { count: 3 }) fills {count} placeholders.
        const translator = (key, vars) => {
            const text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
            if (!vars) return text;
            return text.replace(/\{(\w+)\}/g, (match, name) =>
                vars[name] === undefined ? match : String(vars[name])
            );
        };
        return {
            lang,
            setLang,
            t: translator,
        };
    }, [lang, setLang]);

    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

// Renders children in another language (and direction) without changing the URL: used by
// /styleguide to show components in English and Arabic side by side.
export function LocaleScope({ lang, children }) {
    const parent = useContext(LangContext);
    const value = useMemo(() => {
        const translator = (key, vars) => {
            const text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
            if (!vars) return text;
            return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
        };
        return { ...parent, lang, t: translator };
    }, [lang, parent]);
    return (
        <LangContext.Provider value={value}>
            <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                {children}
            </div>
        </LangContext.Provider>
    );
}

export function useLang() {
    return useContext(LangContext);
}
