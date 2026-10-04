import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import { formatPhone } from '../../lib/identity';
import { authLink } from '../../lib/redirect';
import { LOCALES } from '../../lib/i18n/locales';
import Button from '../ui/Button';
import { cx } from '../ui/cx';
import { Drawer } from '../ui/Dialog';
import { ArrowRight, ChevronDown, Globe, Icon, Menu, MessageSquareText, ShoppingCart, User } from '../ui/icons';
import { Segmented } from '../ui/Tabs';
import SearchBox from './SearchBox';

export const NAV_LINKS = [
    { href: '/#services', key: 'nav.services' },
    { href: '/gallery', key: 'nav.gallery' },
    { href: '/#about', key: 'nav.about' },
    { href: '/#contact', key: 'nav.contact' },
];
export const LANGUAGE_NAMES = { en: 'English', fr: 'Français', ar: 'العربية' };

function Logo() {
    const { t } = useLang();
    return (
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md" aria-label={t('header.home')}>
            <img src="/assets/site/logo-400.webp" alt="" width="40" height="40" className="h-10 w-10 rounded-md ring-1 ring-white/25" />
            <span className="text-lg font-bold tracking-wide text-white">SOFRACOM</span>
        </Link>
    );
}

function LanguageSelect({ className }) {
    const { t, lang, setLang } = useLang();
    return (
        <label className={cx('relative flex items-center', className)}>
            <span className="sr-only">{t('header.language')}</span>
            <Icon as={Globe} size={16} className="pointer-events-none absolute start-2.5 text-navy-200" />
            <select
                value={lang}
                onChange={event => setLang(event.target.value)}
                className="h-10 appearance-none rounded-md border border-white/20 bg-transparent pe-3 ps-8 text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-400/60 [&>option]:text-slate-900"
            >
                {LOCALES.map(locale => (
                    <option key={locale} value={locale} lang={locale}>
                        {LANGUAGE_NAMES[locale]}
                    </option>
                ))}
            </select>
        </label>
    );
}

function AccountLink({ compact }) {
    const { t } = useLang();
    const router = useRouter();
    const { user, email, profile, loading } = useAuth();
    const name = profile?.name || user?.displayName || email || formatPhone(profile?.phone) || '';
    if (loading) return <span className="h-10 w-10" aria-hidden="true" />;
    const href = user ? '/account' : authLink('login', router.asPath);
    const label = user ? t('nav.account') : t('nav.signIn');
    return (
        <Link href={href} className="flex h-10 min-w-[2.5rem] items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-white hover:bg-white/10" aria-label={compact ? label : undefined} title={user ? name : undefined}>
            {user ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400 text-sm font-bold text-navy-950" aria-hidden="true">
                    {(name[0] || '?').toUpperCase()}
                </span>
            ) : (
                <Icon as={User} size={20} />
            )}
            {!compact && <span className="max-w-[9rem] truncate">{label}</span>}
        </Link>
    );
}

function CartButton() {
    const { t } = useLang();
    const { count, openCart, loaded } = useCart();
    const shown = loaded ? count : 0;
    return (
        <button type="button" onClick={openCart} className="relative flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10" aria-label={t('header.cartLabel', { count: shown })}>
            <Icon as={ShoppingCart} size={22} />
            {shown > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent-400 px-1 text-xs font-bold text-navy-950" aria-hidden="true">
                    {shown > 99 ? '99+' : shown}
                </span>
            )}
        </button>
    );
}

// Disclosure menu: click (or hover) opens, Escape closes and returns focus, leaving with Tab closes.
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

    const show = () => {
        load();
        setOpen(true);
    };
    const hoverOpen = () => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(show, 120);
    };
    const hoverClose = () => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setOpen(false), 200);
    };

    return (
        <li className="static" onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
            <button
                ref={button}
                type="button"
                aria-expanded={open}
                aria-controls="shop-menu"
                onClick={() => (open ? setOpen(false) : show())}
                onFocus={load}
                className={cx('flex h-11 items-center gap-1 rounded-md px-3 text-sm font-semibold hover:bg-white/10', open && 'bg-white/10')}
            >
                {t('nav.shop')}
                <Icon as={ChevronDown} size={16} className={cx('transition-transform duration-fast', open && 'rotate-180')} />
            </button>
            <div
                ref={panel}
                id="shop-menu"
                hidden={!open}
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        setOpen(false);
                        button.current?.focus();
                    }
                }}
                onBlur={event => {
                    if (!panel.current?.contains(event.relatedTarget) && event.relatedTarget !== button.current) setOpen(false);
                }}
                className="absolute inset-x-0 top-full z-40 border-t border-slate-200 bg-white text-slate-900 shadow-lg"
            >
                <div className="mx-auto grid max-w-container gap-8 px-6 py-6 lg:grid-cols-[1fr_18rem]">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{t('header.shopTitle')}</p>
                        <ul className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                            {(index?.categories || []).map(category => (
                                <li key={category.slug}>
                                    <Link href={`/products/${category.slug}`} className="flex items-center gap-3 rounded-md p-2 hover:bg-slate-50">
                                        <img src={category.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md bg-slate-100 object-cover" />
                                        <span className="min-w-0">
                                            <span className="block truncate font-semibold">{category.name[lang] || category.name.en}</span>
                                            <span className="block text-sm text-slate-600">{t('header.productsCount', { count: category.count })}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link href="/products" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline">
                            {t('header.allProducts')}
                            <Icon as={ArrowRight} size={16} flip />
                        </Link>
                    </div>
                    <div className="rounded-lg bg-navy-50 p-5">
                        <p className="font-semibold text-navy-900">{t('header.servicesPitch')}</p>
                        <p className="mt-2 text-sm text-slate-700">{t('header.servicesPitchBody')}</p>
                        <Button href="/quote" variant="primary" size="sm" icon={MessageSquareText} className="mt-4">
                            {t('nav.quote')}
                        </Button>
                    </div>
                </div>
            </div>
        </li>
    );
}

function MobileMenu({ open, onClose }) {
    const { t, lang, setLang } = useLang();
    const { index, load } = useCatalogIndex();
    useEffect(() => {
        if (open) load();
    }, [open, load]);
    const link = 'flex min-h-[2.75rem] items-center rounded-md px-3 font-medium text-slate-900 hover:bg-slate-100';
    return (
        <Drawer open={open} onClose={onClose} title={t('header.menu')} side="start">
            <nav aria-label={t('header.mainNav')} className="flex flex-col gap-6">
                <div>
                    <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{t('header.shopTitle')}</p>
                    <ul>
                        <li>
                            <Link href="/products" className={cx(link, 'font-semibold')} onClick={onClose}>
                                {t('header.allProducts')}
                            </Link>
                        </li>
                        {(index?.categories || []).map(category => (
                            <li key={category.slug}>
                                <Link href={`/products/${category.slug}`} className={link} onClick={onClose}>
                                    {category.name[lang] || category.name.en}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <ul className="border-t border-slate-200 pt-4">
                    {NAV_LINKS.map(item => (
                        <li key={item.key}>
                            <Link href={item.href} className={link} onClick={onClose}>
                                {t(item.key)}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <Link href="/track" className={link} onClick={onClose}>
                            {t('footer.trackOrder')}
                        </Link>
                    </li>
                </ul>
                <div className="border-t border-slate-200 px-3 pt-4">
                    <p className="mb-2 text-sm font-medium text-slate-800">{t('header.language')}</p>
                    <Segmented label={t('header.language')} value={lang} onChange={setLang} options={LOCALES.map(locale => ({ value: locale, label: LANGUAGE_NAMES[locale] }))} />
                </div>
                <Button href="/quote" variant="accent" icon={MessageSquareText} fullWidth onClick={onClose}>
                    {t('nav.quote')}
                </Button>
            </nav>
        </Drawer>
    );
}

// Sticky navy header. Desktop: logo · search · language · account · cart · Get a quote, then
// the nav row (Shop mega menu, Services, Gallery, About, Contact). Phones: menu · logo ·
// account · cart, then search + quote. Fits 360 px wide, signed in or not.
export default function SiteHeader() {
    const { t } = useLang();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    useCatalogIndex({ prefetch: true });
    useEffect(() => setMenuOpen(false), [router.asPath]);

    return (
        <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-md">
            <a href="#main" className="sr-only rounded-md bg-white px-4 py-2 font-semibold text-navy-900 focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50">
                {t('header.skip')}
            </a>
            <div className="mx-auto flex max-w-container items-center gap-2 px-4 py-2.5 lg:gap-6 lg:px-6 lg:py-3">
                <button type="button" onClick={() => setMenuOpen(true)} className="-ms-2 flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10 lg:hidden" aria-label={t('header.menu')} aria-expanded={menuOpen}>
                    <Icon as={Menu} size={24} />
                </button>
                <Logo />
                <SearchBox className="hidden max-w-xl flex-1 lg:block" />
                <div className="ms-auto flex items-center gap-1 lg:gap-2">
                    <LanguageSelect className="hidden lg:flex" />
                    <span className="hidden lg:block">
                        <AccountLink />
                    </span>
                    <span className="lg:hidden">
                        <AccountLink compact />
                    </span>
                    <CartButton />
                    <Button href="/quote" variant="accent" icon={MessageSquareText} className="ms-2 hidden lg:inline-flex">
                        {t('nav.quote')}
                    </Button>
                </div>
            </div>
            <nav aria-label={t('header.mainNav')} className="relative hidden border-t border-white/10 lg:block">
                <ul className="mx-auto flex max-w-container items-center gap-1 px-4">
                    <ShopMenu />
                    {NAV_LINKS.map(item => (
                        <li key={item.key}>
                            <Link href={item.href} className="flex h-11 items-center rounded-md px-3 text-sm font-semibold text-navy-100 hover:bg-white/10 hover:text-white">
                                {t(item.key)}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="flex gap-2 px-4 pb-3 lg:hidden">
                <SearchBox className="min-w-0 flex-1" />
                <Button href="/quote" variant="accent" icon={MessageSquareText} className="shrink-0 px-3">
                    {t('header.quoteShort')}
                </Button>
            </div>
            <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </header>
    );
}
