import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import { formatPhone } from '../../lib/identity';
import { LOCALES } from '../../lib/i18n/locales';
import { authLink } from '../../lib/redirect';
import CategoryArt from '../ui/CategoryArt';
import { cx } from '../ui/cx';
import { ArrowRight, ChevronDown, Icon, Menu, Search, ShoppingCart, User } from '../ui/icons';

// Loaded the first time they open: neither is needed to show the page.
const MobileMenu = dynamic(() => import('./MobileMenu'), { ssr: false });
const SearchOverlay = dynamic(() => import('./SearchOverlay'), { ssr: false });

// The Gallery link only once the gallery has enough entries (lib/siteSettings.js).
export const SHOW_GALLERY_LINK = process.env.SHOW_GALLERY_LINK === '1';
export const NAV_LINKS = [
    { href: '/#services', key: 'nav.services' },
    ...(SHOW_GALLERY_LINK ? [{ href: '/gallery', key: 'nav.gallery' }] : []),
    { href: '/#about', key: 'nav.about' },
];
export const LANGUAGE_NAMES = { en: 'English', fr: 'Français', ar: 'العربية' };

const iconButton = 'relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors duration-fast hover:bg-surface';
const navLink = 'inline-flex h-10 items-center gap-1 rounded-full px-4 text-[0.9375rem] font-medium text-ink transition-colors duration-fast hover:bg-surface';

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
            <select value={lang} onChange={event => setLang(event.target.value)} className="h-10 cursor-pointer appearance-none rounded-full bg-transparent pe-7 ps-3 text-sm font-medium uppercase text-ink hover:bg-surface focus:outline-none">
                {LOCALES.map(locale => (
                    <option key={locale} value={locale} lang={locale}>
                        {locale.toUpperCase()} · {LANGUAGE_NAMES[locale]}
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
    const { user, email, profile, loading } = useAuth();
    // Static pages only know their query string after hydration: add it once mounted.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (loading) return <span className="h-10 w-10" aria-hidden="true" />;
    const name = profile?.name || user?.displayName || email || formatPhone(profile?.phone) || '';
    const back = mounted ? router.asPath : router.asPath.split('?')[0];
    return (
        <Link prefetch={false} href={user ? '/account' : authLink('login', back)} className={iconButton} aria-label={user ? t('nav.account') : t('nav.signIn')} title={user ? name : undefined}>
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

function CartButton() {
    const { t } = useLang();
    const { count, openCart, loaded } = useCart();
    const shown = loaded ? count : 0;
    return (
        <button type="button" onClick={openCart} className={iconButton} aria-label={t('header.cartLabel', { count: shown })}>
            <Icon as={ShoppingCart} size={20} />
            {shown > 0 && (
                <span className="absolute -end-0.5 top-0 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent-400 px-1 text-[0.6875rem] font-bold text-navy-950" aria-hidden="true">
                    {shown > 99 ? '99+' : shown}
                </span>
            )}
        </button>
    );
}

// Shop: a disclosure (click, or hover with a mouse) opening a panel of category tiles.
// Escape closes it and returns focus; tabbing out of it closes it.
function ShopMenu() {
    const { t, lang } = useLang();
    const router = useRouter();
    const { index, load } = useCatalogIndex();
    const [open, setOpen] = useState(false);
    const button = useRef(null);
    const panel = useRef(null);
    const hoverTimer = useRef(null);

    useEffect(() => setOpen(false), [router.asPath]);
    useEffect(() => {
        if (!open) return undefined;
        const onDown = event => {
            if (!panel.current?.contains(event.target) && !button.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);
    useEffect(() => () => clearTimeout(hoverTimer.current), []);

    const show = () => {
        load();
        setOpen(true);
    };
    const hover = next => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(next ? show : () => setOpen(false), next ? 120 : 200);
    };

    return (
        <li
            className="static"
            onMouseEnter={() => hover(true)}
            onMouseLeave={() => hover(false)}
            onKeyDown={event => {
                // From the button or anywhere in the panel.
                if (event.key === 'Escape' && open) {
                    clearTimeout(hoverTimer.current);
                    setOpen(false);
                    button.current?.focus();
                }
            }}
        >
            <button ref={button} type="button" aria-expanded={open} aria-controls="shop-menu" onClick={() => (open ? setOpen(false) : show())} onFocus={load} className={cx(navLink, open && 'bg-surface')}>
                {t('nav.shop')}
                <Icon as={ChevronDown} size={16} className={cx('transition-transform duration-fast', open && 'rotate-180')} />
            </button>
            <div
                ref={panel}
                id="shop-menu"
                hidden={!open}
                onBlur={event => {
                    if (!panel.current?.contains(event.relatedTarget) && event.relatedTarget !== button.current) setOpen(false);
                }}
                className="absolute inset-x-0 top-full z-40 border-b border-line bg-white"
            >
                <div className="mx-auto grid max-w-wide gap-10 px-6 py-10 lg:grid-cols-[1fr_15rem]">
                    <ul className="grid grid-cols-3 gap-x-6 gap-y-8">
                        {(index?.categories || []).map(category => (
                            <li key={category.slug}>
                                <Link prefetch={false} href={`/products/${category.slug}`} className="group block">
                                    <CategoryArt images={category.tiles} sizes="160px" className="aspect-[16/10] rounded-xl" />
                                    <span className="mt-3 block text-[0.9375rem] font-medium text-ink group-hover:underline">{category.name[lang] || category.name.en}</span>
                                    <span className="text-sm text-ink-muted">{t('header.productsCount', { count: category.count })}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-col justify-end gap-4 border-s border-line ps-8">
                        <p className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">{t('header.servicesPitch')}</p>
                        <p className="text-sm text-ink-muted">{t('header.servicesPitchBody')}</p>
                        <Link prefetch={false} href="/quote" className="inline-flex h-10 w-fit items-center rounded-full bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700">
                            {t('nav.quote')}
                        </Link>
                        <Link prefetch={false} href="/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline">
                            {t('header.allProducts')}
                            <Icon as={ArrowRight} size={16} flip />
                        </Link>
                    </div>
                </div>
            </div>
        </li>
    );
}

// Sticky white header with a hairline border: logo · centred nav · search, Get a quote,
// language, account, cart. On scroll it gets translucent (blurred) and shorter. Phones:
// menu · logo · search · account · cart; the menu holds the links, language and Get a quote.
export default function SiteHeader() {
    const { t } = useLang();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [used, setUsed] = useState({ menu: false, search: false });
    const [scrolled, setScrolled] = useState(false);
    useCatalogIndex({ prefetch: true });

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    useEffect(() => setMenuOpen(false), [router.asPath]);
    const openMenu = () => (setUsed(current => ({ ...current, menu: true })), setMenuOpen(true));
    const openSearch = () => (setUsed(current => ({ ...current, search: true })), setSearchOpen(true));

    return (
        <header className={cx('sticky top-0 z-40 border-b border-line transition-colors duration-base', scrolled ? 'bg-white/85 backdrop-blur-md' : 'bg-white')}>
            <div className={cx('mx-auto grid max-w-wide grid-cols-[1fr_auto] items-center gap-4 px-4 transition-[height] duration-base sm:px-6 lg:grid-cols-[1fr_auto_1fr]', scrolled ? 'h-14 lg:h-16' : 'h-16 lg:h-[4.5rem]')}>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={openMenu} className={cx(iconButton, '-ms-2 lg:hidden')} aria-label={t('header.menu')} aria-expanded={menuOpen}>
                        <Icon as={Menu} size={22} />
                    </button>
                    <Logo />
                </div>
                <nav aria-label={t('header.mainNav')} className="hidden lg:block">
                    <ul className="flex items-center gap-1">
                        <ShopMenu />
                        {NAV_LINKS.map(item => (
                            <li key={item.key}>
                                <Link prefetch={false} href={item.href} className={navLink}>
                                    {t(item.key)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <button type="button" onClick={openSearch} aria-haspopup="dialog" className={iconButton} aria-label={t('header.openSearch')}>
                        <Icon as={Search} size={20} />
                    </button>
                    <Link prefetch={false} href="/quote" className="mx-1 hidden h-10 items-center whitespace-nowrap rounded-full bg-accent-600 px-4 text-sm font-semibold text-white transition-colors duration-fast hover:bg-accent-700 lg:inline-flex">
                        {t('nav.quote')}
                    </Link>
                    <LanguageMenu />
                    <AccountButton />
                    <CartButton />
                </div>
            </div>
            {used.menu && <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />}
            {used.search && <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />}
        </header>
    );
}
