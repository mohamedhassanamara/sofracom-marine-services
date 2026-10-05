import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '../../../components/Seo';
import { Breadcrumb, Button, Checkbox, Input, LoadMore, Popover, ProductCard, RangeSlider, Sheet } from '../../../components/ui';
import { ChevronDown, Icon, SlidersHorizontal, X } from '../../../components/ui/icons';
import { useLang } from '../../../contexts/LangContext';
import useAddToCart from '../../../hooks/useAddToCart';
import useProductStats from '../../../hooks/useProductStats';
import { filterProducts, filterQuery, parseFilters, priceBounds } from '../../../lib/catalogFilters';
import { normalizeText } from '../../../lib/catalogIndex';
import { formatNumber, priceRange } from '../../../lib/format';
import { langAttrs } from '../../../lib/i18n/locales';
import { localizeCategory, localizeProduct } from '../../../lib/localize';
import { cardCategory, cardProduct, getCategories, getCategoryBySlug } from '../../../lib/products';
import { breadcrumbJsonLd } from '../../../lib/seo';
import { sortByAlphabet } from '../../../lib/sort';

const PAGE_SIZE = 24;
const SORTS = [
    { value: 'name', key: 'products.controls.sortNameAsc' },
    { value: 'name-desc', key: 'products.controls.sortNameDesc' },
    { value: 'price', key: 'products.controls.sortPriceAsc' },
    { value: 'price-desc', key: 'products.controls.sortPriceDesc' },
];
// A moved price handle applies after this pause (a drag applies on release).
const PRICE_DEBOUNCE_MS = 400;

export async function getStaticPaths({ locales = ['en'] }) {
    const paths = locales.flatMap(locale => getCategories().map(category => ({ params: { categorySlug: category.slug }, locale })));
    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const category = getCategoryBySlug(params.categorySlug);
    if (!category) return { notFound: true };
    return { props: { category: { ...cardCategory(category), products: category.products.map(cardProduct) } } };
}

// Filters live in the URL (?brand=JOTUN&stock=in&min=100&max=500&sort=price&q=…, see
// lib/catalogFilters.js) so a filtered list can be shared and survives the back button.
function useFilters(bounds) {
    const router = useRouter();
    const filters = parseFilters(router.query, bounds);
    const update = changes => {
        const query = { categorySlug: router.query.categorySlug, ...filterQuery({ ...filters, ...changes }, bounds) };
        router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
    };
    return [filters, update];
}

const toggle = (list, value) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
// Counts of each value among products, most common first.
const tally = values => {
    const counts = new Map();
    values.forEach(value => value && counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
};

const optionLabel = (text, count) => (
    <span className="text-[0.9375rem] text-ink">
        {text} {count !== undefined && <span className="text-ink-muted">({count})</span>}
    </span>
);

// Whole dinars in the page language ("1,250" / "1 250").
const useDinars = () => {
    const { lang } = useLang();
    return value => formatNumber(value, lang, { maximumFractionDigits: 0 });
};

// The price slider with Min/Max number fields kept in step. Moving shows the matching count
// at once; the URL (and the product list) follow on release or after a short pause.
function PriceFilter({ bounds, filters, update, countFor, idPrefix }) {
    const { t } = useLang();
    const dinars = useDinars();
    const committed = [filters.min ?? bounds.min, filters.max ?? bounds.max];
    const [draft, setDraft] = useState(committed);
    const [typed, setTyped] = useState(null); // { lo, hi } while a number field is being edited
    const timer = useRef(null);
    useEffect(() => setDraft(committed), [committed[0], committed[1]]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => clearTimeout(timer.current), []);

    const apply = ([lo, hi]) => {
        clearTimeout(timer.current);
        if (lo === committed[0] && hi === committed[1]) return;
        update({ min: lo, max: hi });
    };
    const applySoon = range => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => apply(range), PRICE_DEBOUNCE_MS);
    };
    const fromField = (which, raw) => {
        const number = Math.round(Number(raw));
        if (raw === '' || !Number.isFinite(number)) return draft;
        const clamped = Math.min(bounds.max, Math.max(bounds.min, number));
        return which === 'lo' ? [Math.min(clamped, draft[1]), draft[1]] : [draft[0], Math.max(clamped, draft[0])];
    };
    const field = which => (
        <Input
            id={`${idPrefix}-price-${which}`}
            type="number"
            inputMode="numeric"
            size="sm"
            min={bounds.min}
            max={bounds.max}
            step={1}
            value={typed?.[which] ?? draft[which === 'lo' ? 0 : 1]}
            onChange={event => setTyped(current => ({ ...current, [which]: event.target.value }))}
            onBlur={event => {
                const next = fromField(which, event.target.value);
                setTyped(null);
                setDraft(next);
                apply(next);
            }}
            onKeyDown={event => event.key === 'Enter' && event.currentTarget.blur()}
            className="tabular-nums"
        />
    );

    if (bounds.max <= bounds.min) return <p className="text-sm text-ink-muted">{t('catalog.priceChip', { min: dinars(bounds.min), max: dinars(bounds.max) })}</p>;
    return (
        <div className="flex w-full flex-col gap-4 sm:w-72">
            <RangeSlider
                min={bounds.min}
                max={bounds.max}
                value={draft}
                onChange={setDraft}
                onCommit={applySoon}
                labelMin={t('catalog.priceSliderMin')}
                labelMax={t('catalog.priceSliderMax')}
                valueText={value => t('catalog.priceValue', { value: dinars(value) })}
            />
            <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-ink" htmlFor={`${idPrefix}-price-lo`}>
                    {t('catalog.priceMin')}
                    {field('lo')}
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-ink" htmlFor={`${idPrefix}-price-hi`}>
                    {t('catalog.priceMax')}
                    {field('hi')}
                </label>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-ink-muted" aria-live="polite">
                    {t('catalog.results', { count: countFor(draft[0], draft[1]) })}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setDraft([bounds.min, bounds.max]);
                        apply([bounds.min, bounds.max]);
                    }}
                    disabled={draft[0] === bounds.min && draft[1] === bounds.max}
                    className="font-medium text-ink underline underline-offset-4 hover:text-navy-900 disabled:text-ink-muted disabled:no-underline"
                >
                    {t('catalog.priceFull')}
                </button>
            </div>
        </div>
    );
}

function FilterOptions({ kind, brands, bounds, filters, update, countFor, idPrefix }) {
    const { t } = useLang();
    if (kind === 'brand') {
        return (
            <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
                {brands.map(([brand, count]) => (
                    <Checkbox key={brand} id={`${idPrefix}-b-${brand}`} label={optionLabel(brand, count)} checked={filters.brands.includes(brand)} onChange={() => update({ brands: toggle(filters.brands, brand) })} />
                ))}
            </div>
        );
    }
    if (kind === 'stock') {
        return <Checkbox id={`${idPrefix}-stock`} label={optionLabel(t('catalog.inStockOnly'))} checked={filters.inStock} onChange={() => update({ inStock: !filters.inStock })} />;
    }
    return <PriceFilter bounds={bounds} filters={filters} update={update} countFor={countFor} idPrefix={idPrefix} />;
}

export default function CategoryPage({ category }) {
    const { lang, t } = useLang();
    const router = useRouter();
    const dinars = useDinars();
    const [shown, setShown] = useState(PAGE_SIZE);
    const [sheetOpen, setSheetOpen] = useState(false);
    const stats = useProductStats();
    const addToCart = useAddToCart();

    const localizedCategory = useMemo(() => localizeCategory(category, lang), [category, lang]);
    const products = localizedCategory.products;
    const bounds = useMemo(() => priceBounds(products), [products]);
    const [filters, update] = useFilters(bounds);
    const brands = useMemo(() => tally(products.map(product => product.brand)), [products]);
    useEffect(() => setShown(PAGE_SIZE), [router.asPath]);

    // Search words apply on top of brand / stock / price.
    const searched = useMemo(() => {
        const words = normalizeText(filters.q).split(' ').filter(Boolean);
        if (!words.length) return products;
        return products.filter(product => {
            const haystack = normalizeText(`${product.title} ${product.brand} ${(product.usage || []).join(' ')}`);
            return words.every(word => haystack.includes(word));
        });
    }, [products, filters.q]);
    const brandKey = filters.brands.join('|');
    const countFor = (min, max) => filterProducts(searched, { ...filters, min, max }).length;
    const results = useMemo(() => {
        const matching = filterProducts(searched, filters);
        if (filters.sort === 'price' || filters.sort === 'price-desc') {
            const sorted = [...matching].sort((a, b) => priceRange(a).min - priceRange(b).min);
            return filters.sort === 'price' ? sorted : sorted.reverse();
        }
        const sorted = sortByAlphabet(matching, product => product.title, lang);
        return filters.sort === 'name-desc' ? sorted.reverse() : sorted;
    }, [searched, brandKey, filters.inStock, filters.min, filters.max, filters.sort, lang]); // eslint-disable-line react-hooks/exhaustive-deps

    const priceOn = filters.min !== null || filters.max !== null;
    const chips = [
        ...filters.brands.map(brand => ({ label: brand, remove: () => update({ brands: filters.brands.filter(item => item !== brand) }) })),
        ...(filters.inStock ? [{ label: t('catalog.inStockOnly'), remove: () => update({ inStock: false }) }] : []),
        ...(priceOn ? [{ label: t('catalog.priceChip', { min: dinars(filters.min ?? bounds.min), max: dinars(filters.max ?? bounds.max) }), remove: () => update({ min: null, max: null }) }] : []),
        ...(filters.q ? [{ label: `“${filters.q}”`, remove: () => update({ q: '' }) }] : []),
    ];
    const clearAll = () => update({ brands: [], inStock: false, min: null, max: null, q: '' });
    const groups = [
        brands.length > 1 && { kind: 'brand', label: t('catalog.brand'), count: filters.brands.length },
        { kind: 'stock', label: t('catalog.availability'), count: filters.inStock ? 1 : 0 },
        bounds.max > bounds.min && { kind: 'price', label: t('catalog.price'), count: priceOn ? 1 : 0 },
    ].filter(Boolean);

    return (
        <>
            <Seo
                title={localizedCategory.name}
                description={t('seo.category.description', { category: localizedCategory.name, count: products.length })}
                path={`/products/${category.slug}`}
                image={category.tiles?.[0]?.image || category.image}
                jsonLd={breadcrumbJsonLd(
                    [
                        { name: t('nav.products'), path: '/products' },
                        { name: localizedCategory.name, path: `/products/${category.slug}` },
                    ],
                    lang
                )}
            />
            <header className="mx-auto max-w-wide px-4 pb-8 pt-8 sm:px-6 lg:pb-10 lg:pt-12">
                <Breadcrumb items={[{ label: t('nav.products'), href: '/products' }, { label: localizedCategory.name }]} />
                <h1 className="mt-8 text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-title-1 lg:text-display-2">{localizedCategory.name}</h1>
                {localizedCategory.description && (
                    <p className="mt-4 max-w-2xl text-body-lg text-ink-muted" {...langAttrs(localizedCategory.contentLang.description, lang)}>
                        {localizedCategory.description}
                    </p>
                )}
            </header>

            {/* Sticks under the header (56 px once scrolled, 64 px on desktop). */}
            <div className="sticky top-14 z-30 border-y border-line bg-white/90 backdrop-blur-md lg:top-16">
                <div className="mx-auto flex h-16 max-w-wide items-center gap-2 px-4 sm:px-6">
                    <div className="hidden items-center gap-2 lg:flex" role="group" aria-label={t('catalog.filters')}>
                        {groups.map(group => (
                            <Popover key={group.kind} label={group.label} count={group.count}>
                                <FilterOptions kind={group.kind} brands={brands} bounds={bounds} filters={filters} update={update} countFor={countFor} idPrefix="pop" />
                            </Popover>
                        ))}
                    </div>
                    <button type="button" onClick={() => setSheetOpen(true)} className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line-input px-4 text-sm font-medium text-ink lg:hidden">
                        <Icon as={SlidersHorizontal} size={16} />
                        {t('catalog.filters')}
                        {chips.length > 0 && <span className="rounded-full bg-navy-900 px-1.5 text-xs font-semibold leading-5 text-white">{chips.length}</span>}
                    </button>
                    <div className="ms-auto flex items-center gap-4">
                        <p id="results-count" className="hidden text-sm text-ink-muted sm:block" aria-live="polite">
                            {t('catalog.results', { count: results.length })}
                        </p>
                        <label className="relative flex items-center">
                            <span className="sr-only">{t('catalog.sort')}</span>
                            <select value={filters.sort} onChange={event => update({ sort: event.target.value })} className="h-10 max-w-[11rem] appearance-none truncate rounded-full border border-line-input bg-white pe-9 ps-4 text-sm font-medium text-ink hover:border-navy-900 focus:outline-none sm:max-w-none">
                                {SORTS.map(sort => (
                                    <option key={sort.value} value={sort.value}>
                                        {t(sort.key)}
                                    </option>
                                ))}
                            </select>
                            <Icon as={ChevronDown} size={16} className="pointer-events-none absolute end-3 text-ink" />
                        </label>
                    </div>
                </div>
            </div>

            <section className="mx-auto max-w-wide px-4 sm:px-6" aria-label={t('catalog.results', { count: results.length })}>
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
                    <>
                        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:mt-10 lg:grid-cols-4 lg:gap-y-14">
                            {results.slice(0, shown).map((product, index) => (
                                <li key={product.id} className="flex">
                                    <ProductCard product={localizeProduct(product, lang)} stats={stats[product.id]} onQuickAdd={addToCart} priority={index < 2} headingLevel={2} className="w-full" />
                                </li>
                            ))}
                        </ul>
                        <LoadMore className="mt-14" shown={shown} total={results.length} onMore={() => setShown(count => count + PAGE_SIZE)} />
                    </>
                ) : (
                    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
                        <p className="font-display text-title-2 font-semibold text-ink">{t('catalog.emptyTitle')}</p>
                        <p className="mt-3 text-ink-muted">{t('catalog.emptyBody')}</p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button size="lg" onClick={clearAll}>
                                {t('catalog.clear')}
                            </Button>
                            <Button size="lg" variant="secondary" href="/quote">
                                {t('nav.quote')}
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <Sheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title={t('catalog.filters')}
                footer={
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={clearAll} disabled={!chips.length} className="h-12 whitespace-nowrap rounded-full px-5 text-[0.9375rem] font-medium text-ink underline underline-offset-4 disabled:text-ink-muted disabled:no-underline">
                            {t('catalog.clearAll')}
                        </button>
                        <Button size="lg" fullWidth onClick={() => setSheetOpen(false)}>
                            {t('catalog.showResults', { count: results.length })}
                        </Button>
                    </div>
                }
            >
                <div className="divide-y divide-line">
                    {groups.map(group => (
                        <div key={group.kind} role="group" aria-labelledby={`sheet-${group.kind}`} className="py-5 first:pt-1">
                            <h3 id={`sheet-${group.kind}`} className="mb-4 font-sans text-[0.9375rem] font-semibold tracking-normal text-ink">
                                {group.label}
                            </h3>
                            <FilterOptions kind={group.kind} brands={brands} bounds={bounds} filters={filters} update={update} countFor={countFor} idPrefix="sheet" />
                        </div>
                    ))}
                </div>
            </Sheet>
        </>
    );
}
