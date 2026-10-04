import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../lib/i18n/en';
import fr from '../lib/i18n/fr';
import ar from '../lib/i18n/ar';

const TRANSLATIONS = { en, fr, ar };

const LangContext = createContext({
    lang: 'en',
    setLang: () => {},
    t: key => TRANSLATIONS.en[key] || key,
});

const STORAGE_KEY = 'sofracom.lang.v1';

export function LangProvider({ children }) {
    const [lang, setLangState] = useState('en');

    useEffect(() => {
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (saved && TRANSLATIONS[saved]) {
            setLangState(saved);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.body.classList.toggle('rtl', lang === 'ar');
    }, [lang]);

    const setLang = useCallback(newLang => {
        if (TRANSLATIONS[newLang]) {
            setLangState(newLang);
        }
    }, []);

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

export function useLang() {
    return useContext(LangContext);
}
