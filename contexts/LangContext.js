import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '../lib/i18n/locales';
import { getMessages, loadMessages } from '../lib/i18n/messages';

const LangContext = createContext({
    lang: DEFAULT_LOCALE,
    setLang: () => {},
    t: key => key,
});

// t('reviews.count', { count: 3 }) fills {count} placeholders.
const makeTranslator = (messages, fallback) => (key, vars) => {
    const text = messages?.[key] ?? fallback?.[key] ?? key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
};

// The dictionary for `lang`: available at once for the page's language (inline JSON or
// server), loaded on demand otherwise (keeps showing the previous one meanwhile).
function useMessages(lang) {
    const [messages, setMessages] = useState(() => getMessages(lang) || getMessages(DEFAULT_LOCALE));
    useEffect(() => {
        let active = true;
        const ready = getMessages(lang);
        if (ready) setMessages(ready);
        else loadMessages(lang).then(loaded => active && setMessages(loaded));
        return () => {
            active = false;
        };
    }, [lang]);
    return messages;
}

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
        async newLang => {
            if (!isLocale(newLang) || newLang === lang) return;
            rememberLocale(newLang);
            // Load the new dictionary first so the page switches language in one step.
            await loadMessages(newLang).catch(() => {});
            router.push({ pathname: router.pathname, query: router.query }, router.asPath, { locale: newLang, scroll: false });
        },
        [lang, router]
    );
    const messages = useMessages(lang);

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

    const value = useMemo(() => ({ lang, setLang, t: makeTranslator(messages, getMessages(DEFAULT_LOCALE)) }), [lang, setLang, messages]);

    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

// Renders children in another language (and direction) without changing the URL: used by
// /styleguide to show components in English and Arabic side by side.
export function LocaleScope({ lang, children }) {
    const parent = useContext(LangContext);
    const messages = useMessages(lang);
    const value = useMemo(() => ({ ...parent, lang, t: makeTranslator(messages, getMessages(DEFAULT_LOCALE)) }), [lang, parent, messages]);
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
