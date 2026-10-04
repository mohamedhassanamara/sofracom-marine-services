import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Seo from '../components/Seo';
import { Breadcrumb, Button, EmptyState, Input, LoadMore, ProductCard, Select, Skeleton } from '../components/ui';
import { cx } from '../components/ui/cx';
import { Icon, Search } from '../components/ui/icons';
import { useLang } from '../contexts/LangContext';
import useAddToCart from '../hooks/useAddToCart';
import useCatalogIndex from '../hooks/useCatalogIndex';
import useProductStats from '../hooks/useProductStats';
import { indexToCardProduct, searchProducts } from '../lib/catalogIndex';

const PAGE_SIZE = 24;
const SORTS = [
    { value: 'relevance', key: 'search.title' },
    { value: 'price', key: 'products.controls.sortPriceAsc' },
    { value: 'price-desc', key: 'products.controls.sortPriceDesc' },
];

// Results come from the same slim index as the header suggestions, so prices match the
// cards and the cart. Nothing is preloaded into the page.
export default function SearchPage() {
    const router = useRouter();
    const { lang, t } = useLang();
    const { index, load } = useCatalogIndex();
    const stats = useProductStats();
    const addToCart = useAddToCart();
    const query = typeof router.query.q === 'string' ? router.query.q : '';
    const category = typeof router.query.category === 'string' ? router.query.category : '';
    const sort = SORTS.some(option => option.value === router.query.sort) ? router.query.sort : 'relevance';
    const [draft, setDraft] = useState(query);
    const [shown, setShown] = useState(PAGE_SIZE);

    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => setDraft(query), [query]);
    useEffect(() => setShown(PAGE_SIZE), [query, category, sort]);

    const setParams = changes => {
        const next = { q: query, category, sort, ...changes };
        const params = {};
        if (next.q) params.q = next.q;
        if (next.category) params.category = next.category;
        if (next.sort !== 'relevance') params.sort = next.sort;
        router.replace({ pathname: '/search', query: params }, undefined, { shallow: true, scroll: false });
    };

    const matches = useMemo(() => (index && query.trim() ? searchProducts(index, query, lang) : []), [index, query, lang]);
    const counts = useMemo(() => {
        const map = new Map();
        matches.forEach(product => map.set(product.categorySlug, (map.get(product.categorySlug) || 0) + 1));
        return map;
    }, [matches]);
    const results = useMemo(() => {
        const filtered = category ? matches.filter(product => product.categorySlug === category) : matches;
        if (sort === 'relevance') return filtered;
        const sorted = [...filtered].sort((a, b) => a.price - b.price);
        return sort === 'price' ? sorted : sorted.reverse();
    }, [matches, category, sort]);

    return (
        <>
            <Seo title={query ? `${t('seo.search.title')}: ${query}` : t('seo.search.title')} path="/search" noindex />
            <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('search.title') }]} />
                <form
                    role="search"
                    aria-label={t('search.title')}
                    className="mt-4 flex max-w-2xl gap-2"
                    onSubmit={event => {
                        event.preventDefault();
                        setParams({ q: draft.trim(), category: '' });
                    }}
                >
                    <label htmlFor="search-page-input" className="sr-only">
                        {t('search.label')}
                    </label>
                    <div className="relative flex-1">
                        <Icon as={Search} size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <Input id="search-page-input" type="search" enterKeyHint="search" className="ps-10" value={draft} onChange={event => setDraft(event.target.value)} placeholder={t('search.placeholder')} />
                    </div>
                    <Button type="submit">{t('search.submit')}</Button>
                </form>

                <h1 className="mt-6 text-2xl font-bold text-navy-900" aria-live="polite">
                    {query ? (index ? t('search.resultsFor', { count: results.length, q: query }) : t('ui.loading')) : t('search.title')}
                </h1>
                {!query && <p className="mt-2 text-slate-600">{t('search.prompt')}</p>}

                {query && index && matches.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <ul className="flex flex-wrap gap-2" aria-label={t('catalog.categories')}>
                            {[{ slug: '', name: { en: t('search.allCategories') } }, ...index.categories.filter(item => counts.has(item.slug))].map(item => {
                                const active = item.slug === category;
                                const count = item.slug ? counts.get(item.slug) : matches.length;
                                return (
                                    <li key={item.slug || 'all'}>
                                        <button
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setParams({ category: item.slug })}
                                            className={cx('inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium', active ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')}
                                        >
                                            {item.slug ? item.name[lang] || item.name.en : item.name.en}
                                            <span className={active ? 'text-navy-100' : 'text-slate-500'}>({count})</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <span>{t('catalog.sort')}</span>
                            <Select value={sort} onChange={event => setParams({ sort: event.target.value })} className="min-w-[11rem]">
                                {SORTS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.value === 'relevance' ? '—' : t(option.key)}
                                    </option>
                                ))}
                            </Select>
                        </label>
                    </div>
                )}

                {query && !index && (
                    <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                        {Array.from({ length: 8 }, (_, i) => (
                            <li key={i}>
                                <Skeleton className="aspect-[3/4]" />
                            </li>
                        ))}
                    </ul>
                )}

                {query && index && results.length > 0 && (
                    <>
                        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {results.slice(0, shown).map(entry => (
                                <li key={entry.id} className="flex">
                                    <ProductCard product={indexToCardProduct(entry, lang)} stats={stats[entry.id]} onQuickAdd={addToCart} headingLevel={2} className="w-full" />
                                </li>
                            ))}
                        </ul>
                        <LoadMore className="mt-10" shown={shown} total={results.length} onMore={() => setShown(count => count + PAGE_SIZE)} />
                    </>
                )}

                {query && index && !matches.length && (
                    <EmptyState
                        className="mt-6"
                        icon={Search}
                        title={t('search.emptyTitle', { q: query })}
                        description={t('search.emptyBody')}
                        action={
                            <div className="flex flex-wrap justify-center gap-3">
                                <Button href="/products" variant="secondary">
                                    {t('header.allProducts')}
                                </Button>
                                <Button href="/quote?service=products">{t('nav.quote')}</Button>
                            </div>
                        }
                    />
                )}
            </div>
        </>
    );
}
