// Which dictionary the browser has. The server renders with all three; the browser gets
// only the page's language, inlined as JSON by pages/_document.js (#__I18N__), and loads
// another one (its own small chunk) only when the visitor switches language.
const cache = {};

const LOADERS = {
    en: () => import('./en'),
    fr: () => import('./fr'),
    ar: () => import('./ar'),
};

// Server side: every dictionary (this branch is removed from the browser bundle).
if (typeof window === 'undefined') {
    /* eslint-disable global-require */
    cache.en = require('./en').default;
    cache.fr = require('./fr').default;
    cache.ar = require('./ar').default;
}

export function registerMessages(lang, messages) {
    cache[lang] = messages;
}

// The dictionary for `lang` if it is already available (synchronously), else null.
export function getMessages(lang) {
    if (cache[lang]) return cache[lang];
    if (typeof document !== 'undefined') {
        const inline = document.getElementById('__I18N__');
        if (inline && inline.dataset.lang === lang) {
            try {
                cache[lang] = JSON.parse(inline.textContent);
                return cache[lang];
            } catch {
                return null;
            }
        }
    }
    return null;
}

export async function loadMessages(lang) {
    if (getMessages(lang)) return cache[lang];
    const module = await LOADERS[lang]();
    cache[lang] = module.default;
    return cache[lang];
}

// Server only: the inline JSON for _document.
export const serverMessages = lang => (typeof window === 'undefined' ? cache[lang] || cache.en : null);
