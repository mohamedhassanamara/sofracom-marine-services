import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import useRequireAuth from '../../hooks/useRequireAuth';
import Seo from '../Seo';
import { cx } from '../ui/cx';
import { Icon, LogOut } from '../ui/icons';

const NAV = [
    { href: '/account', key: 'account.nav.profile', exact: true },
    { href: '/account/addresses', key: 'account.nav.addresses' },
    { href: '/account/orders', key: 'account.nav.orders' },
    { href: '/account/quotes', key: 'account.nav.quotes' },
    { href: '/account/reviews', key: 'account.nav.reviews', badge: 'toReview' },
];

// Shell for every /account page: requires sign-in and shows the section nav.
export default function AccountLayout({ title, eyebrow, actions, badges = {}, children }) {
    const { t } = useLang();
    const router = useRouter();
    const { user, loading, signOut } = useRequireAuth();

    if (loading || !user) {
        return (
            <div className="mx-auto max-w-wide px-4 py-12 sm:px-6">
                <p className="text-ink-muted">{t('account.loading')}</p>
            </div>
        );
    }

    const isActive = item =>
        item.exact ? router.pathname === item.href : router.pathname.startsWith(item.href);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    // Desktop: a quiet list with a navy bar on the current page. Phones: underlined tabs.
    const linkClass = active =>
        cx(
            'flex min-h-[2.75rem] shrink-0 items-center justify-between gap-2 whitespace-nowrap border-b-2 px-1 text-[0.9375rem] transition-colors duration-fast lg:border-b-0 lg:border-s-2 lg:px-4',
            active ? 'border-navy-900 font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink'
        );

    return (
        <div className="mx-auto grid max-w-wide gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[15rem_1fr] lg:gap-16 lg:pt-12">
            <Seo title={title} noindex />
            <nav aria-label={t('account.navLabel')} className="-mx-4 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:border-b-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
                <ul className="flex gap-5 lg:sticky lg:top-24 lg:flex-col lg:gap-1">
                    {NAV.map(item => {
                        const active = isActive(item);
                        return (
                            <li key={item.href}>
                                <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                                    {t(item.key)}
                                    {item.badge && badges[item.badge] > 0 && <span className="rounded-full bg-navy-900 px-2 text-xs font-semibold text-white">{badges[item.badge]}</span>}
                                </Link>
                            </li>
                        );
                    })}
                    <li className="lg:mt-4 lg:border-t lg:border-line lg:pt-4">
                        <button type="button" onClick={handleSignOut} className={cx(linkClass(false), 'w-full')}>
                            <span className="flex items-center gap-2">
                                <Icon as={LogOut} size={16} flip />
                                {t('account.nav.signOut')}
                            </span>
                        </button>
                    </li>
                </ul>
            </nav>
            <section className="min-w-0">
                <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{eyebrow}</p>}
                        <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-ink lg:text-title-1">{title}</h1>
                    </div>
                    {actions}
                </header>
                {children}
            </section>
        </div>
    );
}
