import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Seo from '../components/Seo';
import { Breadcrumb, Button, LoadMore, ProductCard, Skeleton } from '../components/ui';
import { cx } from '../components/ui/cx';
import { ChevronDown, Icon, Search } from '../components/ui/icons';
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
            <div className="mx-auto max-w-wide px-4 pt-8 sm:px-6 lg:pt-12">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('search.title') }]} />
                <form
                    role="search"
                    aria-label={t('search.title')}
                    className="mt-8 flex max-w-3xl items-center gap-3 border-b border-navy-900 pb-3"
                    onSubmit={event => {
                        event.preventDefault();
                        setParams({ q: draft.trim(), category: '' });
                    }}
                >
                    <label htmlFor="search-page-input" className="sr-only">
                        {t('search.label')}
                    </label>
                    <Icon as={Search} size={24} className="shrink-0 text-ink" />
                    <input id="search-page-input" type="search" enterKeyHint="search" value={draft} onChange={event => setDraft(event.target.value)} placeholder={t('search.placeholder')} className="min-w-0 flex-1 bg-transparent font-display text-xl font-medium text-ink placeholder:text-ink-muted focus:outline-none sm:text-[1.75rem]" />
                    <Button type="submit">{t('search.submit')}</Button>
                </form>

                <h1 className="mt-10 text-[2rem] font-semibold leading-[1.1] text-ink lg:text-title-1" aria-live="polite">
                    {query ? (index ? t('search.resultsFor', { count: results.length, q: query }) : t('ui.loading')) : t('search.title')}
                </h1>
                {!query && <p className="mt-3 text-body-lg text-ink-muted">{t('search.prompt')}</p>}

                {query && index && matches.length > 0 && (
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
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
                                            className={cx('inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium transition-colors duration-fast', active ? 'bg-navy-900 text-white' : 'bg-surface text-ink hover:bg-surface-strong')}
                                        >
                                            {item.slug ? item.name[lang] || item.name.en : item.name.en}
                                            <span className={active ? 'text-white/70' : 'text-ink-muted'}>({count})</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <label className="relative flex items-center gap-3 text-sm text-ink-muted">
                            <span>{t('catalog.sort')}</span>
                            <select value={sort} onChange={event => setParams({ sort: event.target.value })} className="h-10 appearance-none rounded-full border border-line-strong bg-white pe-9 ps-4 text-sm font-medium text-ink hover:border-navy-900 focus:outline-none">
                                {SORTS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.value === 'relevance' ? '—' : t(option.key)}
                                    </option>
                                ))}
                            </select>
                            <Icon as={ChevronDown} size={16} className="pointer-events-none absolute end-3 text-ink" />
                        </label>
                    </div>
                )}

                {query && !index && (
                    <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-4">
                        {Array.from({ length: 8 }, (_, i) => (
                            <li key={i}>
                                <Skeleton className="aspect-square rounded-xl" />
                            </li>
                        ))}
                    </ul>
                )}

                {query && index && results.length > 0 && (
                    <>
                        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-14">
                            {results.slice(0, shown).map(entry => (
                                <li key={entry.id} className="flex">
                                    <ProductCard product={indexToCardProduct(entry, lang)} stats={stats[entry.id]} onQuickAdd={addToCart} headingLevel={2} className="w-full" />
                                </li>
                            ))}
                        </ul>
                        <LoadMore className="mt-14" shown={shown} total={results.length} onMore={() => setShown(count => count + PAGE_SIZE)} />
                    </>
                )}

                {query && index && !matches.length && (
                    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
                        <p className="font-display text-title-2 font-semibold text-ink">{t('search.emptyTitle', { q: query })}</p>
                        <p className="mt-3 text-ink-muted">{t('search.emptyBody')}</p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button size="lg" variant="secondary" href="/products">
                                {t('header.allProducts')}
                            </Button>
                            <Button size="lg" href="/quote?service=products">
                                {t('nav.quote')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
