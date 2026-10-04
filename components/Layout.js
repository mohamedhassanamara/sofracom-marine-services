import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import SiteHeader from './layout/SiteHeader';
import SiteFooter from './layout/SiteFooter';
import CartDrawer from './cart/CartDrawer';

// Every page: header (with the cart button), one <main>, footer, and the cart drawer.
export default function Layout({ children }) {
    const router = useRouter();
    const { profile } = useAuth();

    // A temporary password set by staff must be replaced right after signing in.
    useEffect(() => {
        // Not on the sign-in pages: they redirect first, so `next` is the real destination.
        const exempt = ['/account/change-password', '/account/login', '/account/signup', '/account/reset'];
        if (profile?.mustChangePassword && !exempt.includes(router.pathname)) {
            router.replace(`/account/change-password?next=${encodeURIComponent(router.asPath)}`);
        }
    }, [profile, router]);

    // Gentle fade-in of [data-animate] sections (shown immediately with reduced motion).
    useEffect(() => {
        const elements = document.querySelectorAll('[data-animate]:not(.in-view)');
        if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            elements.forEach(element => element.classList.add('in-view'));
            return undefined;
        }
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        elements.forEach(element => observer.observe(element));
        return () => observer.disconnect();
    }, [router.asPath]);

    return (
        <div id="top" className="flex min-h-screen flex-col">
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
                {children}
            </main>
            <SiteFooter />
            <CartDrawer />
        </div>
    );
}
