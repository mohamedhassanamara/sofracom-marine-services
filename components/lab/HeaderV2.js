import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import useFormat from '../../hooks/useFormat';
import { indexToCardProduct, searchProducts } from '../../lib/catalogIndex';
import { LOCALES } from '../../lib/i18n/locales';
import { localizeCategory } from '../../lib/localize';
import { authLink } from '../../lib/redirect';
import { cx } from '../ui/cx';
import { ArrowRight, ChevronDown, Icon, Menu, Search, ShoppingCart, User, X } from '../ui/icons';
import ResponsiveImage from '../ui/ResponsiveImage';

// v2 header (design lab): white, thin bottom border, logo · centred nav · actions.
// `demo` props pin a state for the lab's specimens: scrolled, search open, shop menu open.
const NAV = [
    { href: '/#services', key: 'nav.services' },
    { href: '/gallery', key: 'nav.gallery' },
    { href: '/#about', key: 'nav.about' },
];

const iconButton = 'relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors duration-fast hover:bg-surface';

function Logo() {
    const { t } = useLang();
    return (
        <Link prefetch={false} href="/" className="flex shrink-0 items-center gap-2.5 rounded-md" aria-label={t('header.home')}>
            <img src="/assets/site/logo-400.webp" alt="" width="36" height="36" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-[1.0625rem] font-bold tracking-[0.04em] text-ink">SOFRACOM</span>
        </Link>
    );
}

function LanguageMenu() {
    const { t, lang, setLang } = useLang();
    return (
        <label className="relative hidden items-center lg:flex">
            <span className="sr-only">{t('header.language')}</span>
            <select value={lang} onChange={event => setLang(event.target.value)} className="h-10 appearance-none rounded-full bg-transparent pe-7 ps-3 text-sm font-medium uppercase text-ink hover:bg-surface focus:outline-none">
                {LOCALES.map(locale => (
                    <option key={locale} value={locale} lang={locale}>
                        {locale.toUpperCase()}
                    </option>
                ))}
            </select>
            <Icon as={ChevronDown} size={14} className="pointer-events-none absolute end-2.5 text-ink-muted" />
        </label>
    );
}

function AccountButton() {
    const { t } = useLang();
    const router = useRouter();
    const { user, profile, email } = useAuth();
    const name = profile?.name || user?.displayName || email || '';
    // The query string only exists on the client for static pages: add it after hydration.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const back = mounted ? router.asPath : router.asPath.split('?')[0];
    return (
        <Link prefetch={false} href={user ? '/account' : authLink('login', back)} className={iconButton} aria-label={user ? t('nav.account') : t('nav.signIn')}>
            {user ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white" aria-hidden="true">
                    {(name[0] || '?').toUpperCase()}
                </span>
            ) : (
                <Icon as={User} size={20} />
            )}
        </Link>
    );
}

function CartButton({ demoCount }) {
    const { t } = useLang();
    const { count, openCart, loaded } = useCart();
    const shown = demoCount ?? (loaded ? count : 0);
    return (
        <button type="button" onClick={openCart} className={iconButton} aria-label={t('header.cartLabel', { count: shown })}>
            <Icon as={ShoppingCart} size={20} />
            {shown > 0 && (
                <span className="absolute -end-0.5 top-0 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-navy-900 px-1 text-[0.6875rem] font-semibold text-white" aria-hidden="true">
                    {shown > 99 ? '99+' : shown}
                </span>
            )}
        </button>
    );
}

// The shop panel: one image tile per category, all products link.
export function MegaPanel({ categories }) {
    const { t, lang } = useLang();
    return (
        <div className="mx-auto grid max-w-wide gap-8 px-6 py-10 lg:grid-cols-[1fr_16rem]">
            <ul className="grid grid-cols-3 gap-x-6 gap-y-8">
                {categories.map(raw => {
                    const category = localizeCategory(raw, lang);
                    return (
                        <li key={category.slug}>
                            <Link prefetch={false} href={`/products/${category.slug}`} className="group block">
                                <span className="block aspect-[16/10] overflow-hidden rounded-xl bg-surface">
                                    <ResponsiveImage src={category.image} alt="" sizes="300px" className="h-full w-full object-contain p-3 transition-transform duration-base ease-out group-hover:scale-[1.03]" />
                                </span>
                                <span className="mt-3 block text-[0.9375rem] font-medium text-ink group-hover:underline">{category.name}</span>
                                <span className="text-sm text-ink-muted">{t('header.productsCount', { count: category.count })}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            <div className="flex flex-col justify-end gap-3 border-s border-line ps-8">
                <p className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">{t('header.shopTitle')}</p>
                <Link prefetch={false} href="/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline">
                    {t('header.allProducts')}
                    <Icon as={ArrowRight} size={16} flip />
                </Link>
            </div>
        </div>
    );
}

// The search panel: a big input, popular categories and product thumbnails (featured until
// you type, then live results from the cached catalog index).
export function SearchPanel({ categories, featured = [], onClose, autoFocus = true, demoQuery = '' }) {
    const { t, lang } = useLang();
    const router = useRouter();
    const format = useFormat();
    const { index, load } = useCatalogIndex();
    const [query, setQuery] = useState(demoQuery);
    const input = useRef(null);
    useEffect(() => {
        load();
        if (autoFocus) input.current?.focus();
    }, [autoFocus, load]);
    const results = query.trim() && index ? searchProducts(index, query, lang).slice(0, 8).map(entry => indexToCardProduct(entry, lang)) : featured.slice(0, 8);

    return (
        <div className="mx-auto max-w-wide px-4 pb-10 pt-6 sm:px-6">
            <form
                role="search"
                onSubmit={event => {
                    event.preventDefault();
                    if (query.trim()) router.push({ pathname: '/search', query: { q: query.trim() } });
                }}
                className="flex items-center gap-3 border-b border-ink pb-3"
            >
                <Icon as={Search} size={24} className="shrink-0 text-ink" />
                <label htmlFor="v2-search" className="sr-only">
                    {t('search.label')}
                </label>
                <input
                    ref={input}
                    id="v2-search"
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={t('search.placeholder')}
                    className="min-w-0 flex-1 bg-transparent font-display text-xl font-medium text-ink placeholder:text-ink-muted focus:outline-none sm:text-[1.75rem]"
                />
                {onClose && (
                    <button type="button" onClick={onClose} className={iconButton} aria-label={t('header.closeSearch')}>
                        <Icon as={X} size={22} />
                    </button>
                )}
            </form>
            <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_1fr]">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{t('search.popularCategories')}</h2>
                    <ul className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-3">
                        {categories.map(raw => (
                            <li key={raw.slug}>
                                <Link prefetch={false} href={`/products/${raw.slug}`} className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm text-ink hover:border-ink lg:h-auto lg:border-0 lg:px-0 lg:text-[0.9375rem] lg:hover:underline">
                                    {localizeCategory(raw, lang).name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{t('search.topProducts')}</h2>
                    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
                        {results.map(product => (
                            <li key={product.id}>
                                <Link prefetch={false} href={`/products/${product.categorySlug}/${product.id}`} className="group block">
                                    <span className="block aspect-square overflow-hidden rounded-xl bg-surface">
                                        <ResponsiveImage src={product.image} alt="" sizes="200px" className="h-full w-full object-contain p-[10%] mix-blend-multiply transition-transform duration-base ease-out group-hover:scale-[1.03]" />
                                    </span>
                                    <span className="mt-2 line-clamp-2 text-sm font-medium text-ink group-hover:underline">{product.title}</span>
                                    <span className="text-sm tabular-nums text-ink-muted">
                                        <bdi>{format.price(product.price)}</bdi>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default function HeaderV2({ categories = [], featured = [], sticky = true, demoScrolled, demoSearch = false, demoMega = false, demoCartCount, demoQuery }) {
    const { t } = useLang();
    const [scrolledLive, setScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(demoSearch);
    const [megaOpen, setMegaOpen] = useState(demoMega);
    const searchButton = useRef(null);
    const scrolled = demoScrolled ?? scrolledLive;

    useEffect(() => {
        if (demoScrolled !== undefined) return undefined;
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [demoScrolled]);

    useEffect(() => {
        if (!searchOpen || demoSearch) return undefined;
        const onKey = event => {
            if (event.key === 'Escape') {
                setSearchOpen(false);
                searchButton.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [searchOpen, demoSearch]);

    return (
        <header className={cx(sticky ? 'sticky top-0' : 'relative', 'z-40 border-b transition-colors duration-base', scrolled ? 'border-line bg-white/80 backdrop-blur-md' : 'border-line bg-white')}>
            <div className={cx('mx-auto grid max-w-wide grid-cols-[1fr_auto] items-center gap-4 px-4 transition-[height] duration-base sm:px-6 lg:grid-cols-[1fr_auto_1fr]', scrolled ? 'h-14' : 'h-16 lg:h-[4.5rem]')}>
                <div className="flex items-center gap-1">
                    <button type="button" className={cx(iconButton, '-ms-2 lg:hidden')} aria-label={t('header.menu')}>
                        <Icon as={Menu} size={22} />
                    </button>
                    <Logo />
                </div>
                <nav aria-label={t('header.mainNav')} className="hidden lg:block">
                    <ul className="flex items-center gap-1">
                        <li>
                            <button type="button" aria-expanded={megaOpen} onClick={() => setMegaOpen(open => !open)} className="inline-flex h-10 items-center gap-1 rounded-full px-4 text-[0.9375rem] font-medium text-ink hover:bg-surface">
                                {t('nav.shop')}
                                <Icon as={ChevronDown} size={16} className={cx('transition-transform duration-fast', megaOpen && 'rotate-180')} />
                            </button>
                        </li>
                        {NAV.map(item => (
                            <li key={item.key}>
                                <Link prefetch={false} href={item.href} className="inline-flex h-10 items-center rounded-full px-4 text-[0.9375rem] font-medium text-ink hover:bg-surface">
                                    {t(item.key)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <button ref={searchButton} type="button" onClick={() => setSearchOpen(open => !open)} aria-expanded={searchOpen} className={iconButton} aria-label={t('header.openSearch')}>
                        <Icon as={Search} size={20} />
                    </button>
                    <Link prefetch={false} href="/quote" className="mx-1 hidden h-10 items-center rounded-full border border-ink px-4 text-sm font-medium text-ink transition-colors duration-fast hover:bg-ink hover:text-white lg:inline-flex">
                        {t('nav.quote')}
                    </Link>
                    <LanguageMenu />
                    <AccountButton />
                    <CartButton demoCount={demoCartCount} />
                </div>
            </div>
            {megaOpen && (
                <div className="absolute inset-x-0 top-full hidden border-b border-line bg-white lg:block">
                    <MegaPanel categories={categories} />
                </div>
            )}
            {searchOpen && (
                <div className="absolute inset-x-0 top-0 z-50 min-h-full border-b border-line bg-white shadow-soft">
                    <SearchPanel categories={categories} featured={featured} autoFocus={!demoSearch} demoQuery={demoQuery} onClose={() => (setSearchOpen(false), searchButton.current?.focus())} />
                </div>
            )}
        </header>
    );
}
