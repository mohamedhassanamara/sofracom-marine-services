import { useMemo, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import useFormat from '../../hooks/useFormat';
import { priceRange } from '../../lib/format';
import { langAttrs } from '../../lib/i18n/locales';
import { localizeProduct } from '../../lib/localize';
import { sortByAlphabet } from '../../lib/sort';
import { Sheet } from '../ui/Dialog';
import { Checkbox, Radio } from '../ui/Field';
import { cx } from '../ui/cx';
import { ChevronDown, Icon, SlidersHorizontal, X } from '../ui/icons';
import { productStock } from '../ui/ProductCard';
import Popover from './Popover';
import ProductCardV2 from './ProductCardV2';

// v2 category page body (design lab): big title, one-line description, a scrolling row of
// use pills, then a sticky toolbar (filter popovers · count · sort), removable chips and a
// 4/3/2-column grid. Phones get one "Filters" button that opens a bottom sheet.
// State is local here; the real page keeps it in the URL like today.
const SORTS = [
    { value: 'name', key: 'products.controls.sortNameAsc' },
    { value: 'name-desc', key: 'products.controls.sortNameDesc' },
    { value: 'price', key: 'products.controls.sortPriceAsc' },
    { value: 'price-desc', key: 'products.controls.sortPriceDesc' },
];
// Price bands in DT.
const BANDS = [
    { id: 'u50', min: 0, max: 50 },
    { id: '50-200', min: 50, max: 200 },
    { id: '200-500', min: 200, max: 500 },
    { id: 'o500', min: 500, max: Infinity },
];

const tally = values => {
    const counts = new Map();
    values.forEach(value => value && counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
};
const toggle = (list, value) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
const EMPTY = { brands: [], uses: [], inStock: false, band: '' };

function useBandLabel() {
    const { t } = useLang();
    const format = useFormat();
    return band => {
        if (!band) return t('catalog.priceAny');
        if (band.min === 0) return t('catalog.priceUnder', { max: format.price(band.max) });
        if (band.max === Infinity) return t('catalog.priceOver', { min: format.price(band.min) });
        return t('catalog.priceBetween', { min: format.price(band.min), max: format.price(band.max) });
    };
}

function BrandOptions({ brands, filters, set, idPrefix }) {
    return (
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
            {brands.map(([brand, count]) => (
                <Checkbox key={brand} id={`${idPrefix}-b-${brand}`} label={<span className="text-[0.9375rem] text-ink">{brand} <span className="text-ink-muted">({count})</span></span>} checked={filters.brands.includes(brand)} onChange={() => set({ brands: toggle(filters.brands, brand) })} />
            ))}
        </div>
    );
}
function UseOptions({ uses, filters, set, idPrefix }) {
    return (
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
            {uses.map(([use, count]) => (
                <Checkbox key={use} id={`${idPrefix}-u-${use}`} label={<span className="text-[0.9375rem] text-ink">{use} <span className="text-ink-muted">({count})</span></span>} checked={filters.uses.includes(use)} onChange={() => set({ uses: toggle(filters.uses, use) })} />
            ))}
        </div>
    );
}
function StockOptions({ filters, set, idPrefix }) {
    const { t } = useLang();
    return <Checkbox id={`${idPrefix}-stock`} label={<span className="text-[0.9375rem] text-ink">{t('catalog.inStockOnly')}</span>} checked={filters.inStock} onChange={() => set({ inStock: !filters.inStock })} />;
}
function PriceOptions({ filters, set, idPrefix }) {
    const bandLabel = useBandLabel();
    return (
        <div className="flex flex-col gap-3">
            {[null, ...BANDS].map(band => (
                <Radio key={band?.id || 'any'} id={`${idPrefix}-p-${band?.id || 'any'}`} name={`${idPrefix}-price`} label={<span className="text-[0.9375rem] text-ink">{bandLabel(band)}</span>} checked={filters.band === (band?.id || '')} onChange={() => set({ band: band?.id || '' })} />
            ))}
        </div>
    );
}

export function EmptyResults({ onClear }) {
    const { t } = useLang();
    return (
        <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
            <p className="font-display text-title-2 font-semibold text-ink">{t('catalog.emptyTitle')}</p>
            <p className="mt-3 text-ink-muted">{t('catalog.emptyBody')}</p>
            <button type="button" onClick={onClear} className="mt-8 inline-flex h-12 items-center rounded-full bg-navy-900 px-7 text-[0.9375rem] font-semibold text-white hover:bg-navy-800">
                {t('catalog.clear')}
            </button>
        </div>
    );
}

export default function CategoryV2({ category, stats = {}, onQuickAdd, initialFilters = EMPTY, demoPopover = '', limit = 8, stickyTop = 'top-14' }) {
    const { t, lang } = useLang();
    const bandLabel = useBandLabel();
    const [filters, setFilters] = useState({ ...EMPTY, ...initialFilters });
    const [sort, setSort] = useState('name');
    const [sheetOpen, setSheetOpen] = useState(false);
    const set = changes => setFilters(current => ({ ...current, ...changes }));
    const clearAll = () => setFilters(EMPTY);

    const products = useMemo(() => category.products.map(product => localizeProduct(product, lang)), [category.products, lang]);
    const brands = useMemo(() => tally(products.map(product => product.brand)), [products]);
    const uses = useMemo(() => tally(products.flatMap(product => product.usage || [])).slice(0, 10), [products]);

    const results = useMemo(() => {
        const band = BANDS.find(item => item.id === filters.band);
        const matching = products.filter(product => {
            if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
            if (filters.uses.length && !filters.uses.some(use => (product.usage || []).includes(use))) return false;
            if (filters.inStock && productStock(product) !== 'in') return false;
            if (band) {
                const { min } = priceRange(product);
                if (min < band.min || min >= band.max) return false;
            }
            return true;
        });
        if (sort.startsWith('price')) {
            const sorted = [...matching].sort((a, b) => priceRange(a).min - priceRange(b).min);
            return sort === 'price' ? sorted : sorted.reverse();
        }
        const sorted = sortByAlphabet(matching, product => product.title, lang);
        return sort === 'name-desc' ? sorted.reverse() : sorted;
    }, [products, filters, sort, lang]);

    const chips = [
        ...filters.brands.map(brand => ({ label: brand, remove: () => set({ brands: filters.brands.filter(item => item !== brand) }) })),
        ...filters.uses.map(use => ({ label: use, remove: () => set({ uses: filters.uses.filter(item => item !== use) }) })),
        ...(filters.inStock ? [{ label: t('catalog.inStockOnly'), remove: () => set({ inStock: false }) }] : []),
        ...(filters.band ? [{ label: bandLabel(BANDS.find(band => band.id === filters.band)), remove: () => set({ band: '' }) }] : []),
    ];
    const sortSelect = (
        <label className="relative flex items-center">
            <span className="sr-only">{t('catalog.sort')}</span>
            <select value={sort} onChange={event => setSort(event.target.value)} className="h-10 appearance-none rounded-full border border-line-strong bg-white pe-9 ps-4 text-sm font-medium text-ink hover:border-ink focus:outline-none">
                {SORTS.map(option => (
                    <option key={option.value} value={option.value}>
                        {t(option.key)}
                    </option>
                ))}
            </select>
            <Icon as={ChevronDown} size={16} className="pointer-events-none absolute end-3 text-ink" />
        </label>
    );

    return (
        <div>
            <header className="mx-auto max-w-wide px-4 pb-8 pt-12 sm:px-6 lg:pb-10 lg:pt-20">
                <h1 className="font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-title-1 lg:text-display-2">{category.name}</h1>
                {category.description && (
                    <p className="mt-4 max-w-2xl text-body-lg text-ink-muted" {...langAttrs(category.contentLang?.description || lang, lang)}>
                        {category.description}
                    </p>
                )}
                <nav aria-label={t('catalog.usage')} className="-mx-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6">
                    <ul className="flex gap-2">
                        <li>
                            <button type="button" aria-pressed={!filters.uses.length} onClick={() => set({ uses: [] })} className={cx('h-10 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors duration-fast', !filters.uses.length ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-surface-strong')}>
                                {t('catalog.allUses')}
                            </button>
                        </li>
                        {uses.slice(0, 8).map(([use]) => {
                            const on = filters.uses.length === 1 && filters.uses[0] === use;
                            return (
                                <li key={use}>
                                    <button type="button" aria-pressed={on} onClick={() => set({ uses: on ? [] : [use] })} className={cx('h-10 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors duration-fast', on ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-surface-strong')}>
                                        {use}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </header>

            <div className={cx('sticky z-30 border-y border-line bg-white/90 backdrop-blur-md', stickyTop)}>
                <div className="mx-auto flex h-16 max-w-wide items-center gap-2 px-4 sm:px-6">
                    <div className="hidden items-center gap-2 lg:flex">
                        {brands.length > 1 && (
                            <Popover label={t('catalog.brand')} count={filters.brands.length} defaultOpen={demoPopover === 'brand'}>
                                <BrandOptions brands={brands} filters={filters} set={set} idPrefix="pop" />
                            </Popover>
                        )}
                        {uses.length > 0 && (
                            <Popover label={t('catalog.usage')} count={filters.uses.length} defaultOpen={demoPopover === 'use'}>
                                <UseOptions uses={uses} filters={filters} set={set} idPrefix="pop" />
                            </Popover>
                        )}
                        <Popover label={t('catalog.availability')} count={filters.inStock ? 1 : 0}>
                            <StockOptions filters={filters} set={set} idPrefix="pop" />
                        </Popover>
                        <Popover label={t('catalog.price')} count={filters.band ? 1 : 0} defaultOpen={demoPopover === 'price'}>
                            <PriceOptions filters={filters} set={set} idPrefix="pop" />
                        </Popover>
                    </div>
                    <button type="button" onClick={() => setSheetOpen(true)} className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong px-4 text-sm font-medium text-ink lg:hidden">
                        <Icon as={SlidersHorizontal} size={16} />
                        {t('catalog.filters')}
                        {chips.length > 0 && <span className="rounded-full bg-ink px-1.5 text-xs font-semibold leading-5 text-white">{chips.length}</span>}
                    </button>
                    <div className="ms-auto flex items-center gap-4">
                        <p className="hidden text-sm text-ink-muted sm:block" aria-live="polite">
                            {t('catalog.results', { count: results.length })}
                        </p>
                        {sortSelect}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-wide px-4 sm:px-6">
                <p className="mt-4 text-sm text-ink-muted sm:hidden" aria-live="polite">
                    {t('catalog.results', { count: results.length })}
                </p>
                {chips.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        {chips.map(chip => (
                            <button key={chip.label} type="button" onClick={chip.remove} aria-label={t('catalog.removeFilter', { name: chip.label })} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface pe-2.5 ps-3.5 text-sm text-ink hover:bg-surface-strong">
                                {chip.label}
                                <Icon as={X} size={14} />
                            </button>
                        ))}
                        <button type="button" onClick={clearAll} className="ms-1 text-sm font-medium text-ink underline underline-offset-4 hover:text-navy-900">
                            {t('catalog.clearAll')}
                        </button>
                    </div>
                )}
                {results.length ? (
                    <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:mt-10 lg:grid-cols-4 lg:gap-y-14">
                        {results.slice(0, limit).map((product, index) => (
                            <li key={product.id} className="flex">
                                <ProductCardV2 product={product} stats={stats[product.id]} onQuickAdd={onQuickAdd} priority={index < 2} headingLevel={2} className="w-full" />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyResults onClear={clearAll} />
                )}
            </div>

            <Sheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title={t('catalog.filters')}
                footer={<FilterSheetFooter count={results.length} onClear={clearAll} onDone={() => setSheetOpen(false)} disabled={!chips.length} />}
            >
                <FilterSheetBody brands={brands} uses={uses} filters={filters} set={set} idPrefix="sheet" />
            </Sheet>
        </div>
    );
}

export function FilterSheetBody({ brands, uses, filters, set, idPrefix }) {
    const { t } = useLang();
    const groups = [
        brands.length > 1 && [t('catalog.brand'), <BrandOptions key="b" brands={brands} filters={filters} set={set} idPrefix={idPrefix} />],
        uses.length > 0 && [t('catalog.usage'), <UseOptions key="u" uses={uses} filters={filters} set={set} idPrefix={idPrefix} />],
        [t('catalog.availability'), <StockOptions key="s" filters={filters} set={set} idPrefix={idPrefix} />],
        [t('catalog.price'), <PriceOptions key="p" filters={filters} set={set} idPrefix={idPrefix} />],
    ].filter(Boolean);
    return (
        <div className="divide-y divide-line">
            {groups.map(([legend, body], index) => (
                <div key={legend} role="group" aria-labelledby={`${idPrefix}-g${index}`} className="py-5 first:pt-1">
                    <h3 id={`${idPrefix}-g${index}`} className="mb-4 text-[0.9375rem] font-semibold text-ink">
                        {legend}
                    </h3>
                    {body}
                </div>
            ))}
        </div>
    );
}

export function FilterSheetFooter({ count, onClear, onDone, disabled }) {
    const { t } = useLang();
    return (
        <div className="flex items-center gap-3">
            <button type="button" onClick={onClear} disabled={disabled} className="h-12 rounded-full px-5 text-[0.9375rem] font-medium text-ink underline underline-offset-4 disabled:text-ink-muted disabled:no-underline">
                {t('catalog.clearAll')}
            </button>
            <button type="button" onClick={onDone} className="h-12 flex-1 rounded-full bg-navy-900 px-6 text-[0.9375rem] font-semibold text-white hover:bg-navy-800">
                {t('catalog.showResults', { count })}
            </button>
        </div>
    );
}

// Lab specimen: the sheet's content drawn inline inside a phone frame (not modal).
export function FilterSheetSpecimen({ category, initialFilters = EMPTY }) {
    const { t, lang } = useLang();
    const [filters, setFilters] = useState({ ...EMPTY, ...initialFilters });
    const set = changes => setFilters(current => ({ ...current, ...changes }));
    const products = useMemo(() => category.products.map(product => localizeProduct(product, lang)), [category.products, lang]);
    const brands = useMemo(() => tally(products.map(product => product.brand)), [products]);
    const uses = useMemo(() => tally(products.flatMap(product => product.usage || [])).slice(0, 10), [products]);
    const count = products.filter(product => (!filters.brands.length || filters.brands.includes(product.brand)) && (!filters.inStock || productStock(product) === 'in')).length;
    return (
        <div className="flex max-h-[44rem] flex-col overflow-hidden rounded-t-2xl bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <p className="text-lg font-semibold text-ink">{t('catalog.filters')}</p>
                <Icon as={X} size={20} className="text-ink" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <FilterSheetBody brands={brands} uses={uses} filters={filters} set={set} idPrefix="spec" />
            </div>
            <div className="border-t border-line px-5 py-4">
                <FilterSheetFooter count={count} onClear={() => setFilters(EMPTY)} onDone={() => {}} />
            </div>
        </div>
    );
}
