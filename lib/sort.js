const coerceSortValue = value => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
};

export const sortByAlphabet = (items, getLabel, locale = 'en') => {
    if (!Array.isArray(items) || !items.length) return [];

    const collator = new Intl.Collator(locale, {
        usage: 'sort',
        sensitivity: 'base',
        numeric: true,
    });

    return [...items].sort((a, b) => {
        const labelA = coerceSortValue(getLabel ? getLabel(a) : a);
        const labelB = coerceSortValue(getLabel ? getLabel(b) : b);
        return collator.compare(labelA, labelB);
    });
};

