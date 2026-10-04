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
            <div className="mx-auto max-w-container px-4 py-10 sm:px-6">
                <p className="text-slate-600">{t('account.loading')}</p>
            </div>
        );
    }

    const isActive = item =>
        item.exact ? router.pathname === item.href : router.pathname.startsWith(item.href);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const linkClass = active =>
        cx(
            'flex min-h-[2.75rem] shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-colors duration-fast',
            active ? 'bg-navy-900 text-white' : 'text-slate-700 hover:bg-slate-100'
        );

    return (
        <div className="mx-auto grid max-w-container gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_1fr] lg:gap-10">
            <Seo title={title} noindex />
            <nav aria-label={t('account.navLabel')} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
                <ul className="flex gap-1 lg:sticky lg:top-32 lg:flex-col">
                    {NAV.map(item => {
                        const active = isActive(item);
                        return (
                            <li key={item.href}>
                                <Link href={item.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                                    {t(item.key)}
                                    {item.badge && badges[item.badge] > 0 && (
                                        <span className={cx('rounded-full px-2 text-xs', active ? 'bg-white text-navy-900' : 'bg-accent-400 text-navy-950')}>{badges[item.badge]}</span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                    <li className="lg:mt-2 lg:border-t lg:border-slate-200 lg:pt-2">
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
                <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">{eyebrow}</p>}
                        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>
                    </div>
                    {actions}
                </header>
                {children}
            </section>
        </div>
    );
}
