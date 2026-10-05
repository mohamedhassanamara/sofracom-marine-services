import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Seo from '../../../components/Seo';
import { Breadcrumb, Button, Checkbox, LoadMore, Popover, ProductCard, Radio, Sheet } from '../../../components/ui';
import { productStock } from '../../../components/ui/ProductCard';
import { cx } from '../../../components/ui/cx';
import { ChevronDown, Icon, SlidersHorizontal, X } from '../../../components/ui/icons';
import { useLang } from '../../../contexts/LangContext';
import useAddToCart from '../../../hooks/useAddToCart';
import useFormat from '../../../hooks/useFormat';
import useProductStats from '../../../hooks/useProductStats';
import { normalizeText } from '../../../lib/catalogIndex';
import { priceRange } from '../../../lib/format';
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
// Price bands (DT), by the product's lowest price.
const BANDS = [
    { id: 'u50', min: 0, max: 50 },
    { id: '50-200', min: 50, max: 200 },
    { id: '200-500', min: 200, max: 500 },
    { id: 'o500', min: 500, max: Infinity },
];

export async function getStaticPaths({ locales = ['en'] }) {
    const paths = locales.flatMap(locale => getCategories().map(category => ({ params: { categorySlug: category.slug }, locale })));
    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const category = getCategoryBySlug(params.categorySlug);
    if (!category) return { notFound: true };
    return { props: { category: { ...cardCategory(category), products: category.products.map(cardProduct) } } };
}

// Filters live in the URL (?brand=JOTUN&use=Antifouling&stock=in&price=50-200&sort=price&q=…)
// so a filtered list can be shared and survives the back button.
const asList = value => (Array.isArray(value) ? value : value ? [value] : []);

function useFilters() {
    const router = useRouter();
    const query = router.query;
    const filters = {
        brands: asList(query.brand),
        uses: asList(query.use),
        inStock: query.stock === 'in',
        band: BANDS.some(band => band.id === query.price) ? query.price : '',
        sort: SORTS.some(sort => sort.value === query.sort) ? query.sort : 'name',
        q: typeof query.q === 'string' ? query.q : '',
    };
    const update = changes => {
        const next = { ...filters, ...changes };
        const params = { categorySlug: query.categorySlug };
        if (next.brands.length) params.brand = next.brands;
        if (next.uses.length) params.use = next.uses;
        if (next.inStock) params.stock = 'in';
        if (next.band) params.price = next.band;
        if (next.sort !== 'name') params.sort = next.sort;
        if (next.q) params.q = next.q;
        router.replace({ pathname: router.pathname, query: params }, undefined, { shallow: true, scroll: false });
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

const optionLabel = (text, count) => (
    <span className="text-[0.9375rem] text-ink">
        {text} {count !== undefined && <span className="text-ink-muted">({count})</span>}
    </span>
);

function FilterOptions({ kind, brands, uses, filters, update, idPrefix }) {
    const { t } = useLang();
    const bandLabel = useBandLabel();
    if (kind === 'brand') {
        return (
            <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
                {brands.map(([brand, count]) => (
                    <Checkbox key={brand} id={`${idPrefix}-b-${brand}`} label={optionLabel(brand, count)} checked={filters.brands.includes(brand)} onChange={() => update({ brands: toggle(filters.brands, brand) })} />
                ))}
            </div>
        );
    }
    if (kind === 'use') {
        return (
            <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
                {uses.map(([use, count]) => (
                    <Checkbox key={use} id={`${idPrefix}-u-${use}`} label={optionLabel(use, count)} checked={filters.uses.includes(use)} onChange={() => update({ uses: toggle(filters.uses, use) })} />
                ))}
            </div>
        );
    }
    if (kind === 'stock') {
        return <Checkbox id={`${idPrefix}-stock`} label={optionLabel(t('catalog.inStockOnly'))} checked={filters.inStock} onChange={() => update({ inStock: !filters.inStock })} />;
    }
    return (
        <div className="flex flex-col gap-3">
            {[null, ...BANDS].map(band => (
                <Radio key={band?.id || 'any'} id={`${idPrefix}-p-${band?.id || 'any'}`} name={`${idPrefix}-price`} label={optionLabel(bandLabel(band))} checked={filters.band === (band?.id || '')} onChange={() => update({ band: band?.id || '' })} />
            ))}
        </div>
    );
}

export default function CategoryPage({ category }) {
    const { lang, t } = useLang();
    const router = useRouter();
    const bandLabel = useBandLabel();
    const [filters, update] = useFilters();
    const [shown, setShown] = useState(PAGE_SIZE);
    const [sheetOpen, setSheetOpen] = useState(false);
    const stats = useProductStats();
    const addToCart = useAddToCart();

    const localizedCategory = useMemo(() => localizeCategory(category, lang), [category, lang]);
    const products = localizedCategory.products;
    const brands = useMemo(() => tally(products.map(product => product.brand)), [products]);
    const uses = useMemo(() => tally(products.flatMap(product => product.usage || [])).slice(0, 12), [products]);
    useEffect(() => setShown(PAGE_SIZE), [router.asPath]);

    const results = useMemo(() => {
        const words = normalizeText(filters.q).split(' ').filter(Boolean);
        const band = BANDS.find(item => item.id === filters.band);
        const matching = products.filter(product => {
            if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
            if (filters.uses.length && !filters.uses.some(use => (product.usage || []).includes(use))) return false;
            if (filters.inStock && productStock(product) !== 'in') return false;
            if (band) {
                const { min } = priceRange(product);
                if (min < band.min || min >= band.max) return false;
            }
            if (words.length) {
                const haystack = normalizeText(`${product.title} ${product.brand} ${(product.usage || []).join(' ')}`);
                if (!words.every(word => haystack.includes(word))) return false;
            }
            return true;
        });
        if (filters.sort === 'price' || filters.sort === 'price-desc') {
            const sorted = [...matching].sort((a, b) => priceRange(a).min - priceRange(b).min);
            return filters.sort === 'price' ? sorted : sorted.reverse();
        }
        const sorted = sortByAlphabet(matching, product => product.title, lang);
        return filters.sort === 'name-desc' ? sorted.reverse() : sorted;
    }, [products, filters.brands, filters.uses, filters.inStock, filters.band, filters.q, filters.sort, lang]);

    const chips = [
        ...filters.brands.map(brand => ({ label: brand, remove: () => update({ brands: filters.brands.filter(item => item !== brand) }) })),
        ...filters.uses.map(use => ({ label: use, remove: () => update({ uses: filters.uses.filter(item => item !== use) }) })),
        ...(filters.inStock ? [{ label: t('catalog.inStockOnly'), remove: () => update({ inStock: false }) }] : []),
        ...(filters.band ? [{ label: bandLabel(BANDS.find(band => band.id === filters.band)), remove: () => update({ band: '' }) }] : []),
        ...(filters.q ? [{ label: `“${filters.q}”`, remove: () => update({ q: '' }) }] : []),
    ];
    const clearAll = () => update({ brands: [], uses: [], inStock: false, band: '', q: '' });
    const groups = [
        brands.length > 1 && { kind: 'brand', label: t('catalog.brand'), count: filters.brands.length },
        uses.length > 0 && { kind: 'use', label: t('catalog.usage'), count: filters.uses.length },
        { kind: 'stock', label: t('catalog.availability'), count: filters.inStock ? 1 : 0 },
        { kind: 'price', label: t('catalog.price'), count: filters.band ? 1 : 0 },
    ].filter(Boolean);
    const pillClass = on => cx('h-10 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors duration-fast', on ? 'bg-navy-900 text-white' : 'bg-surface text-ink hover:bg-surface-strong');

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
                {uses.length > 0 && (
                    <nav aria-label={t('catalog.usage')} className="-mx-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
                        <ul className="flex gap-2">
                            <li>
                                <button type="button" aria-pressed={!filters.uses.length} onClick={() => update({ uses: [] })} className={pillClass(!filters.uses.length)}>
                                    {t('catalog.allUses')}
                                </button>
                            </li>
                            {uses.slice(0, 8).map(([use]) => {
                                const on = filters.uses.length === 1 && filters.uses[0] === use;
                                return (
                                    <li key={use}>
                                        <button type="button" aria-pressed={on} onClick={() => update({ uses: on ? [] : [use] })} className={pillClass(on)}>
                                            {use}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                )}
            </header>

            {/* Sticks under the header (56 px once scrolled, 64 px on desktop). */}
            <div className="sticky top-14 z-30 border-y border-line bg-white/90 backdrop-blur-md lg:top-16">
                <div className="mx-auto flex h-16 max-w-wide items-center gap-2 px-4 sm:px-6">
                    <div className="hidden items-center gap-2 lg:flex" role="group" aria-label={t('catalog.filters')}>
                        {groups.map(group => (
                            <Popover key={group.kind} label={group.label} count={group.count}>
                                <FilterOptions kind={group.kind} brands={brands} uses={uses} filters={filters} update={update} idPrefix="pop" />
                            </Popover>
                        ))}
                    </div>
                    <button type="button" onClick={() => setSheetOpen(true)} className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong px-4 text-sm font-medium text-ink lg:hidden">
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
                            <select value={filters.sort} onChange={event => update({ sort: event.target.value })} className="h-10 max-w-[11rem] appearance-none truncate rounded-full border border-line-strong bg-white pe-9 ps-4 text-sm font-medium text-ink hover:border-navy-900 focus:outline-none sm:max-w-none">
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
                        <button type="button" onClick={clearAll} disabled={!chips.length} className="h-12 rounded-full px-5 text-[0.9375rem] font-medium text-ink underline underline-offset-4 disabled:text-ink-muted disabled:no-underline">
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
                            <FilterOptions kind={group.kind} brands={brands} uses={uses} filters={filters} update={update} idPrefix="sheet" />
                        </div>
                    ))}
                </div>
            </Sheet>
        </>
    );
}
