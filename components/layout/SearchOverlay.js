import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import useFormat from '../../hooks/useFormat';
import { indexToCardProduct, searchProducts } from '../../lib/catalogIndex';
import { photoClass } from '../../lib/images';
import { Icon, Search, X } from '../ui/icons';
import ResponsiveImage from '../ui/ResponsiveImage';

// Search: a panel docked under the top edge (a native modal <dialog>, so the page is inert,
// Escape closes it and focus goes back to the search button). Popular categories and a few
// products until you type, then live results with thumbnails; Enter opens /search.
const LIMIT = 8;

// A spread of in-stock products, one category after another (shown before typing).
function startingProducts(index) {
    const pools = (index?.categories || []).map(category => (index.products || []).filter(product => product.categorySlug === category.slug && product.stock === 'in' && product.image));
    const picked = [];
    for (let round = 0; picked.length < LIMIT && pools.some(pool => pool[round]); round += 1) {
        for (const pool of pools) if (pool[round] && picked.length < LIMIT) picked.push(pool[round]);
    }
    return picked;
}

export default function SearchOverlay({ open, onClose }) {
    const { t, lang } = useLang();
    const router = useRouter();
    const format = useFormat();
    const { index, load } = useCatalogIndex();
    const [query, setQuery] = useState('');
    const dialog = useRef(null);
    const input = useRef(null);
    const returnFocus = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const node = dialog.current;
        if (!node) return;
        if (open && !node.open) {
            returnFocus.current = document.activeElement;
            load();
            node.showModal();
            input.current?.focus();
        } else if (!open && node.open) node.close();
    }, [open, load]);
    useEffect(() => {
        const node = dialog.current;
        const handleClose = () => {
            const target = returnFocus.current;
            returnFocus.current = null;
            if (target && document.contains(target)) target.focus();
        };
        node?.addEventListener('close', handleClose);
        return () => node?.removeEventListener('close', handleClose);
    }, []);
    // Close after following a link (a real route change, not the first render).
    const lastPath = useRef(router.asPath);
    useEffect(() => {
        if (lastPath.current === router.asPath) return;
        lastPath.current = router.asPath;
        onCloseRef.current?.();
    }, [router.asPath]);

    const term = query.trim();
    const matches = useMemo(() => (term && index ? searchProducts(index, term, lang) : null), [index, term, lang]);
    const products = (matches || startingProducts(index)).slice(0, LIMIT).map(entry => indexToCardProduct(entry, lang));

    return (
        <dialog
            ref={dialog}
            aria-label={t('search.label')}
            onCancel={event => {
                event.preventDefault();
                onCloseRef.current?.();
            }}
            onMouseDown={event => event.target === dialog.current && onCloseRef.current?.()}
            className="ui-search m-0 max-h-[100dvh] w-full max-w-none overflow-y-auto bg-white p-0 text-ink backdrop:bg-navy-950/40 open:block"
        >
            {open && (
                <div className="mx-auto max-w-wide px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
                    <form
                        role="search"
                        onSubmit={event => {
                            event.preventDefault();
                            if (term) router.push({ pathname: '/search', query: { q: term } });
                        }}
                        className="flex items-center gap-3 border-b border-navy-900 pb-3"
                    >
                        <Icon as={Search} size={24} className="shrink-0" />
                        <label htmlFor="site-search" className="sr-only">
                            {t('search.label')}
                        </label>
                        <input
                            ref={input}
                            id="site-search"
                            type="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder={t('search.placeholder')}
                            className="min-w-0 flex-1 bg-transparent font-display text-xl font-medium placeholder:text-ink-muted focus:outline-none sm:text-[1.75rem] [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        <button type="button" onClick={() => onCloseRef.current?.()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface" aria-label={t('header.closeSearch')}>
                            <Icon as={X} size={22} />
                        </button>
                    </form>
                    <p className="sr-only" aria-live="polite">
                        {matches ? (matches.length ? t('catalog.results', { count: matches.length }) : t('search.noResults')) : ''}
                    </p>

                    <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_1fr]">
                        <div>
                            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{t('search.popularCategories')}</h2>
                            <ul className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-3">
                                {(index?.categories || []).map(category => (
                                    <li key={category.slug}>
                                        <Link prefetch={false} href={`/products/${category.slug}`} className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm hover:border-navy-900 lg:h-auto lg:border-0 lg:px-0 lg:text-[0.9375rem] lg:hover:underline">
                                            {category.name[lang] || category.name.en}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{matches ? t('search.suggestions') : t('search.topProducts')}</h2>
                            {matches && !matches.length ? (
                                <p className="mt-4 text-ink-muted">{t('search.noResults')}</p>
                            ) : (
                                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
                                    {products.map(product => (
                                        <li key={product.id}>
                                            <Link prefetch={false} href={`/products/${product.categorySlug}/${product.id}`} className="group block">
                                                <span className="block aspect-square overflow-hidden rounded-xl bg-surface">
                                                    <ResponsiveImage src={product.image} alt="" sizes="200px" className={`h-full w-full object-contain p-[10%] transition-transform duration-base ease-out group-hover:scale-[1.03] ${photoClass(product.image)}`} />
                                                </span>
                                                <span className="mt-2 line-clamp-2 text-sm font-medium group-hover:underline">{product.title}</span>
                                                <span className="text-sm tabular-nums text-ink-muted">
                                                    {product.variants.length > 1 && new Set(product.variants.map(variant => variant.price)).size > 1 ? `${t('ui.from')} ` : ''}
                                                    <bdi>{format.price(product.price)}</bdi>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {matches?.length > 0 && (
                                <Link prefetch={false} href={{ pathname: '/search', query: { q: term } }} className="mt-8 inline-flex h-11 items-center rounded-full border border-navy-900 px-5 text-sm font-semibold hover:bg-navy-900 hover:text-white">
                                    {t('search.seeAll', { q: term })}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </dialog>
    );
}
