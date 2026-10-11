import { useMemo } from 'react';
import { useLang } from '../contexts/LangContext';
import { formatDate, formatNumber, formatPrice } from '../lib/format';

// Formatters bound to the page language.
export default function useFormat() {
    const { lang } = useLang();
    return useMemo(
        () => ({
            price: value => formatPrice(value, lang),
            number: (value, options) => formatNumber(value, lang, options),
            date: (value, withTime = false) => formatDate(value, lang, { withTime }),
        }),
        [lang]
    );
}
