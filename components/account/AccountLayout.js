import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import useRequireAuth from '../../hooks/useRequireAuth';
import Seo from '../Seo';

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
            <div className="account-shell">
                <p className="ui-muted">{t('account.loading')}</p>
            </div>
        );
    }

    const isActive = item =>
        item.exact ? router.pathname === item.href : router.pathname.startsWith(item.href);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <div className="account-shell">
            <Seo title={title} noindex />
            <nav className="account-nav" aria-label={t('account.navLabel')}>
                {NAV.map(item => (
                    <Link key={item.href} href={item.href} className={isActive(item) ? 'active' : ''}>
                        {t(item.key)}
                        {item.badge && badges[item.badge] > 0 && (
                            <span className="account-nav__badge">{badges[item.badge]}</span>
                        )}
                    </Link>
                ))}
                <button type="button" onClick={handleSignOut}>
                    {t('account.nav.signOut')}
                </button>
            </nav>
            <section>
                <header className="account-header">
                    <div>
                        {eyebrow && <p className="account-eyebrow">{eyebrow}</p>}
                        <h1>{title}</h1>
                    </div>
                    {actions}
                </header>
                {children}
            </section>
        </div>
    );
}
