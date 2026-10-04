import { useRouter } from 'next/router';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import { searchProducts } from '../../lib/catalogIndex';
import { cx } from '../ui/cx';
import { Icon, Search } from '../ui/icons';
import Price from '../ui/Price';

// Catalog search with suggestions (ARIA combobox): ↓/↑ move through suggestions, Enter
// opens the highlighted product (or the results page), Escape closes. Prices are the same
// "from" price as the product cards and the cart.
export default function SearchBox({ className, onNavigate, variant = 'dark', label }) {
    const { t, lang } = useLang();
    const router = useRouter();
    const { index, load } = useCatalogIndex();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const wrapper = useRef(null);
    const listId = `search-${useId().replace(/:/g, '')}`;

    // Keep the box in sync with /search?q=…
    useEffect(() => {
        if (router.pathname === '/search' && typeof router.query.q === 'string') setQuery(router.query.q);
    }, [router.pathname, router.query.q]);

    useEffect(() => {
        const close = event => {
            if (!wrapper.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    useEffect(() => setOpen(false), [router.asPath]);

    const results = useMemo(() => (query.trim() ? searchProducts(index, query, lang).slice(0, 6) : []), [index, query, lang]);
    const showList = open && query.trim().length > 0 && Boolean(index);
    const optionCount = results.length + 1; // + "see all results"

    const goToResults = () => {
        const term = query.trim();
        if (!term) return;
        setOpen(false);
        onNavigate?.();
        router.push({ pathname: '/search', query: { q: term } });
    };
    const goToProduct = product => {
        setOpen(false);
        setQuery('');
        onNavigate?.();
        router.push(`/products/${product.categorySlug}/${product.id}`);
    };
    const choose = position => (position >= 0 && position < results.length ? goToProduct(results[position]) : goToResults());

    const onKeyDown = event => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive(current => (current + 1) % optionCount);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive(current => (current <= 0 ? optionCount - 1 : current - 1));
        } else if (event.key === 'Escape') {
            if (open) {
                event.preventDefault();
                setOpen(false);
            } else setQuery('');
        } else if (event.key === 'Enter' && showList && active >= 0) {
            event.preventDefault();
            choose(active);
        }
    };

    const optionId = position => `${listId}-${position}`;
    const dark = variant === 'dark';

    return (
        <form
            ref={wrapper}
            role="search"
            aria-label={label || t('search.label')}
            className={cx('relative', className)}
            onSubmit={event => {
                event.preventDefault();
                goToResults();
            }}
        >
            <label htmlFor={`${listId}-input`} className="sr-only">
                {t('search.label')}
            </label>
            <Icon as={Search} size={18} className={cx('pointer-events-none absolute start-3 top-1/2 -translate-y-1/2', dark ? 'text-navy-200' : 'text-slate-500')} />
            <input
                id={`${listId}-input`}
                type="search"
                role="combobox"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
                autoComplete="off"
                enterKeyHint="search"
                placeholder={t('search.placeholder')}
                value={query}
                onFocus={() => {
                    load();
                    setOpen(true);
                }}
                onChange={event => {
                    setQuery(event.target.value);
                    setActive(-1);
                    setOpen(true);
                }}
                onKeyDown={onKeyDown}
                className={cx(
                    'h-11 w-full rounded-md border pe-3 ps-10 text-base transition-colors duration-fast focus:outline-none focus:ring-2',
                    dark
                        ? 'border-white/20 bg-white/10 text-white placeholder:text-navy-200 hover:bg-white/15 focus:border-accent-400 focus:bg-white focus:text-slate-900 focus:ring-accent-400/40 focus:placeholder:text-slate-500'
                        : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-accent-600 focus:ring-accent-200'
                )}
            />
            <button type="submit" className="sr-only">
                {t('search.submit')}
            </button>
            <div className={cx('absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg', !showList && 'hidden')}>
                <ul id={listId} role="listbox" aria-label={t('search.suggestions')}>
                    {results.map((product, position) => (
                        <li
                            key={product.id}
                            id={optionId(position)}
                            role="option"
                            aria-selected={active === position}
                            onMouseDown={event => {
                                event.preventDefault();
                                goToProduct(product);
                            }}
                            onMouseEnter={() => setActive(position)}
                            className={cx('flex cursor-pointer items-center gap-3 px-3 py-2', active === position && 'bg-navy-50')}
                        >
                            <img src={product.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md bg-slate-50 object-contain" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{product.title[lang] || product.title.en}</span>
                                <span className="block truncate text-sm text-slate-600">{product.brand}</span>
                            </span>
                            <Price value={product.price} from={product.varies} size="sm" />
                        </li>
                    ))}
                    {!results.length && <li role="option" aria-disabled="true" aria-selected="false" className="px-3 py-3 text-sm text-slate-600">{t('search.noResults', { q: query.trim() })}</li>}
                    <li
                        id={optionId(results.length)}
                        role="option"
                        aria-selected={active === results.length}
                        onMouseDown={event => {
                            event.preventDefault();
                            goToResults();
                        }}
                        onMouseEnter={() => setActive(results.length)}
                        className={cx('cursor-pointer border-t border-slate-200 px-3 py-2.5 text-sm font-semibold text-accent-700', active === results.length && 'bg-navy-50')}
                    >
                        {t('search.seeAll', { q: query.trim() })}
                    </li>
                </ul>
            </div>
        </form>
    );
}
