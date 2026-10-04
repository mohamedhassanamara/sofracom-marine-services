import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Seo from '../../../components/Seo';
import { Breadcrumb, Button, Checkbox, Drawer, EmptyState, Input, LoadMore, ProductCard, Select } from '../../../components/ui';
import { productStock } from '../../../components/ui/ProductCard';
import { Icon, Search, SlidersHorizontal, X } from '../../../components/ui/icons';
import { useLang } from '../../../contexts/LangContext';
import useAddToCart from '../../../hooks/useAddToCart';
import useProductStats from '../../../hooks/useProductStats';
import { normalizeText } from '../../../lib/catalogIndex';
import { priceRange } from '../../../lib/format';
import { localizeCategory, localizeProduct } from '../../../lib/localize';
import { cardCategory, cardProduct, getCategories, getCategoryBySlug } from '../../../lib/products';
import { breadcrumbJsonLd } from '../../../lib/seo';
import { langAttrs } from '../../../lib/i18n/locales';
import { sortByAlphabet } from '../../../lib/sort';

const PAGE_SIZE = 24;
const SORTS = [
    { value: 'name', key: 'products.controls.sortNameAsc' },
    { value: 'name-desc', key: 'products.controls.sortNameDesc' },
    { value: 'price', key: 'products.controls.sortPriceAsc' },
    { value: 'price-desc', key: 'products.controls.sortPriceDesc' },
];

export async function getStaticPaths({ locales = ['en'] }) {
    const categories = getCategories();
    const paths = locales.flatMap(locale =>
        categories.map(category => ({
            params: { categorySlug: category.slug },
            locale,
        }))
    );
    return {
        paths,
        fallback: false,
    };
}

export async function getStaticProps({ params }) {
    const category = getCategoryBySlug(params.categorySlug);
    if (!category) {
        return { notFound: true };
    }
    return {
        props: {
            category: { ...cardCategory(category), products: category.products.map(cardProduct) },
            categories: getCategories().map(cardCategory),
        },
    };
}

// Filters live in the URL (?brand=JOTUN&use=Antifouling&stock=in&sort=price&q=…) so a
// filtered list can be shared and survives the back button.
const asList = value => (Array.isArray(value) ? value : value ? [value] : []);

function useFilters() {
    const router = useRouter();
    const query = router.query;
    const filters = {
        brands: asList(query.brand),
        uses: asList(query.use),
        inStock: query.stock === 'in',
        sort: SORTS.some(sort => sort.value === query.sort) ? query.sort : 'name',
        q: typeof query.q === 'string' ? query.q : '',
    };
    const update = changes => {
        const next = { ...filters, ...changes };
        const params = { categorySlug: query.categorySlug };
        if (next.brands.length) params.brand = next.brands;
        if (next.uses.length) params.use = next.uses;
        if (next.inStock) params.stock = 'in';
        if (next.sort !== 'name') params.sort = next.sort;
        if (next.q) params.q = next.q;
        router.replace({ pathname: router.pathname, query: params }, undefined, { shallow: true, scroll: false });
    };
    return [filters, update];
}

const toggle = (list, value) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

function FilterPanel({ filters, update, brands, uses, idPrefix }) {
    const { t } = useLang();
    return (
        <div className="flex flex-col gap-6">
            {brands.length > 1 && (
                <fieldset>
                    <legend className="mb-3 text-sm font-semibold text-slate-900">{t('catalog.brand')}</legend>
                    <div className="flex flex-col gap-2.5">
                        {brands.map(([brand, count]) => (
                            <Checkbox
                                key={brand}
                                id={`${idPrefix}-brand-${brand}`}
                                label={
                                    <span>
                                        {brand} <span className="text-slate-500">({count})</span>
                                    </span>
                                }
                                checked={filters.brands.includes(brand)}
                                onChange={() => update({ brands: toggle(filters.brands, brand) })}
                            />
                        ))}
                    </div>
                </fieldset>
            )}
            {uses.length > 0 && (
                <fieldset>
                    <legend className="mb-3 text-sm font-semibold text-slate-900">{t('catalog.usage')}</legend>
                    <div className="flex flex-col gap-2.5">
                        {uses.map(([use, count]) => (
                            <Checkbox
                                key={use}
                                id={`${idPrefix}-use-${use}`}
                                label={
                                    <span>
                                        {use} <span className="text-slate-500">({count})</span>
                                    </span>
                                }
                                checked={filters.uses.includes(use)}
                                onChange={() => update({ uses: toggle(filters.uses, use) })}
                            />
                        ))}
                    </div>
                </fieldset>
            )}
            <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-900">{t('catalog.availability')}</legend>
                <Checkbox id={`${idPrefix}-stock`} label={t('catalog.inStockOnly')} checked={filters.inStock} onChange={() => update({ inStock: !filters.inStock })} />
            </fieldset>
        </div>
    );
}

// Counts of each value among products, most common first.
const tally = values => {
    const counts = new Map();
    values.forEach(value => value && counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
};

export default function CategoryPage({ category, categories }) {
    const { lang, t } = useLang();
    const router = useRouter();
    const [filters, update] = useFilters();
    const [shown, setShown] = useState(PAGE_SIZE);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchDraft, setSearchDraft] = useState(filters.q);
    const stats = useProductStats();
    const addToCart = useAddToCart();

    const localizedCategory = useMemo(() => localizeCategory(category, lang), [category, lang]);
    const products = localizedCategory.products;
    const brands = useMemo(() => tally(products.map(product => product.brand)), [products]);
    const uses = useMemo(() => tally(products.flatMap(product => product.usage || [])).slice(0, 12), [products]);

    useEffect(() => setSearchDraft(filters.q), [filters.q]);
    useEffect(() => setShown(PAGE_SIZE), [router.asPath]);

    const results = useMemo(() => {
        const words = normalizeText(filters.q).split(' ').filter(Boolean);
        const matching = products.filter(product => {
            if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
            if (filters.uses.length && !filters.uses.some(use => (product.usage || []).includes(use))) return false;
            if (filters.inStock && productStock(product) !== 'in') return false;
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
    }, [products, filters.brands, filters.uses, filters.inStock, filters.q, filters.sort, lang]);

    const active = [
        ...filters.brands.map(brand => ({ label: brand, remove: () => update({ brands: filters.brands.filter(item => item !== brand) }) })),
        ...filters.uses.map(use => ({ label: use, remove: () => update({ uses: filters.uses.filter(item => item !== use) }) })),
        ...(filters.inStock ? [{ label: t('catalog.inStockOnly'), remove: () => update({ inStock: false }) }] : []),
        ...(filters.q ? [{ label: `“${filters.q}”`, remove: () => update({ q: '' }) }] : []),
    ];
    const clearAll = () => update({ brands: [], uses: [], inStock: false, q: '' });

    return (
        <>
            <Seo
                title={localizedCategory.name}
                description={t('seo.category.description', { category: localizedCategory.name, count: products.length })}
                path={`/products/${category.slug}`}
                image={category.image}
                jsonLd={breadcrumbJsonLd(
                    [
                        { name: t('nav.products'), path: '/products' },
                        { name: localizedCategory.name, path: `/products/${category.slug}` },
                    ],
                    lang
                )}
            />
            <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
                <Breadcrumb items={[{ label: t('nav.products'), href: '/products' }, { label: localizedCategory.name }]} />
                <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
                    <div className="max-w-3xl">
                        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{localizedCategory.name}</h1>
                        {localizedCategory.description && (
                            <p className="mt-2 text-slate-600" {...langAttrs(localizedCategory.contentLang.description, lang)}>
                                {localizedCategory.description}
                            </p>
                        )}
                    </div>
                </header>

                <nav aria-label={t('catalog.categories')} className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <ul className="flex gap-2 pb-1">
                        {categories.map(raw => {
                            const current = raw.slug === category.slug;
                            return (
                                <li key={raw.slug}>
                                    <Link
                                        href={`/products/${raw.slug}`}
                                        scroll={false}
                                        aria-current={current ? 'page' : undefined}
                                        className={`inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium ${current ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
                                    >
                                        {localizeCategory(raw, lang).name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
                    <aside className="hidden lg:block" aria-label={t('catalog.filters')}>
                        <div className="sticky top-32">
                            <FilterPanel filters={filters} update={update} brands={brands} uses={uses} idPrefix="side" />
                        </div>
                    </aside>

                    <section aria-labelledby="results-count">
                        <div className="flex flex-wrap items-center gap-3">
                            <form
                                role="search"
                                aria-label={t('catalog.searchIn', { category: localizedCategory.name })}
                                className="relative min-w-[12rem] flex-1"
                                onSubmit={event => {
                                    event.preventDefault();
                                    update({ q: searchDraft.trim() });
                                }}
                            >
                                <label htmlFor="category-search" className="sr-only">
                                    {t('catalog.searchIn', { category: localizedCategory.name })}
                                </label>
                                <Icon as={Search} size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <Input id="category-search" type="search" className="ps-10" placeholder={t('catalog.searchIn', { category: localizedCategory.name })} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} onBlur={() => searchDraft.trim() !== filters.q && update({ q: searchDraft.trim() })} />
                            </form>
                            <Button variant="secondary" icon={SlidersHorizontal} className="lg:hidden" onClick={() => setDrawerOpen(true)}>
                                {t('catalog.filters')}
                                {active.length > 0 && <span className="ms-1 rounded-full bg-navy-900 px-2 text-xs text-white">{active.length}</span>}
                            </Button>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <span className="whitespace-nowrap">{t('catalog.sort')}</span>
                                <Select value={filters.sort} onChange={event => update({ sort: event.target.value })} className="min-w-[11rem]">
                                    {SORTS.map(sort => (
                                        <option key={sort.value} value={sort.value}>
                                            {t(sort.key)}
                                        </option>
                                    ))}
                                </Select>
                            </label>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <p id="results-count" className="me-2 text-sm font-medium text-slate-700" aria-live="polite">
                                {t('catalog.results', { count: results.length })}
                            </p>
                            {active.map(filter => (
                                <button key={filter.label} type="button" onClick={filter.remove} className="inline-flex h-8 items-center gap-1 rounded-full border border-navy-200 bg-navy-50 ps-3 pe-2 text-sm font-medium text-navy-800 hover:bg-navy-100" aria-label={t('catalog.removeFilter', { name: filter.label })}>
                                    {filter.label}
                                    <Icon as={X} size={14} />
                                </button>
                            ))}
                            {active.length > 1 && (
                                <button type="button" onClick={clearAll} className="text-sm font-semibold text-accent-700 hover:underline">
                                    {t('catalog.clear')}
                                </button>
                            )}
                        </div>

                        {results.length ? (
                            <>
                                <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                                    {results.slice(0, shown).map((product, index) => (
                                        <li key={product.id} className="flex">
                                            <ProductCard product={localizeProduct(product, lang)} stats={stats[product.id]} onQuickAdd={addToCart} priority={index < 2} headingLevel={2} className="w-full" />
                                        </li>
                                    ))}
                                </ul>
                                <LoadMore className="mt-10" shown={shown} total={results.length} onMore={() => setShown(count => count + PAGE_SIZE)} />
                            </>
                        ) : (
                            <EmptyState
                                className="mt-6"
                                icon={Search}
                                title={t('catalog.emptyTitle')}
                                description={t('catalog.emptyBody')}
                                action={
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <Button variant="secondary" onClick={clearAll}>
                                            {t('catalog.clear')}
                                        </Button>
                                        <Button href="/quote" variant="primary">
                                            {t('nav.quote')}
                                        </Button>
                                    </div>
                                }
                            />
                        )}
                    </section>
                </div>
            </div>

            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={t('catalog.filters')}
                side="start"
                footer={
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={clearAll} disabled={!active.length}>
                            {t('catalog.clear')}
                        </Button>
                        <Button fullWidth onClick={() => setDrawerOpen(false)}>
                            {t('catalog.showResults', { count: results.length })}
                        </Button>
                    </div>
                }
            >
                <FilterPanel filters={filters} update={update} brands={brands} uses={uses} idPrefix="drawer" />
            </Drawer>
        </>
    );
}
