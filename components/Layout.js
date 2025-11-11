import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../contexts/LangContext';

const NAV_LINKS = [
    { href: '#home', key: 'nav.home', type: 'anchor' },
    { href: '#about', key: 'nav.about', type: 'anchor' },
    { href: '#brands', key: 'nav.brands', type: 'anchor' },
    { href: '/products', key: 'nav.products', type: 'page' },
    { href: '#services', key: 'nav.services', type: 'anchor' },
    { href: '#contact', key: 'nav.contact', type: 'anchor' },
];

const resolveLinkHref = link => {
    if (link.type === 'anchor') {
        const target = link.href.startsWith('#') ? link.href.slice(1) : link.href;
        return target ? `/#${target}` : '/';
    }
    return link.href;
};

export default function Layout({ children }) {
    const { lang, setLang, t } = useLang();
    const [isNavSolid, setIsNavSolid] = useState(false);
    const [showToTop, setShowToTop] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const sections = useMemo(
        () => ['home', 'about', 'brands', 'services', 'contact'],
        []
    );
    const router = useRouter();

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                setIsNavSolid(window.scrollY > 40);
                setShowToTop(window.scrollY > 500);
                ticking = false;
            });
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const elements = document.querySelectorAll('[data-animate]');
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );
        elements.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [router.asPath]);

    useEffect(() => {
        const tiltCards = Array.from(document.querySelectorAll('[data-tilt]'));
        const handlers = new Map();
        tiltCards.forEach(card => {
            const move = e => {
                const rect = card.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width;
                const py = (e.clientY - rect.top) / rect.height;
                const rx = (0.5 - py) * 12;
                const ry = (px - 0.5) * 12;
                card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
            };
            const reset = () => {
                card.style.transform = 'rotateX(0) rotateY(0)';
            };
            card.addEventListener('mousemove', move);
            card.addEventListener('mouseleave', reset);
            handlers.set(card, { move, reset });
        });
        return () => {
            handlers.forEach((handler, card) => {
                card.removeEventListener('mousemove', handler.move);
                card.removeEventListener('mouseleave', handler.reset);
            });
        };
    }, [router.asPath]);

    useEffect(() => {
        setMenuOpen(false);
    }, [router.asPath]);

    const handleSearchKey = event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const query = event.currentTarget.value.trim().toLowerCase();
        if (!query) return;
        const matchedSection = sections.find(id => id.includes(query));
        if (matchedSection) {
            document
                .getElementById(matchedSection)
                ?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        const cards = Array.from(
            document.querySelectorAll('#brands .brand-card')
        );
        const hit = cards.find(card =>
            card.textContent.toLowerCase().includes(query)
        );
        if (hit) {
            hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
            hit.classList.add('ring', 'ring-4', 'ring-blue-300');
            window.setTimeout(
                () => hit.classList.remove('ring', 'ring-4', 'ring-blue-300'),
                1500
            );
        }
    };

    const handleLangChange = event => {
        setLang(event.target.value);
    };

    const handleBackToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div>
            <header
                id="top"
                className={`sticky top-0 z-40 text-white transition-colors duration-300 ${
                    isNavSolid ? 'nav-solid' : 'nav-glass'
                }`}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/logo.jpeg"
                            alt="SOFRACOM Logo"
                            className="h-10 w-10 rounded-lg ring-2 ring-white ring-opacity-30"
                        />
                        <span className="text-xl font-extrabold tracking-wide">
                            SOFRACOM
                        </span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                        {NAV_LINKS.map(link => {
                            const href = resolveLinkHref(link);
                            return (
                                <Link
                                    key={link.key}
                                    href={href}
                                    className="hover:text-blue-200"
                                >
                                    {t(link.key)}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="flex items-center gap-3">
                        <input
                            id="siteSearch"
                            type="text"
                            placeholder="Search…"
                            className="hidden sm:block px-3 py-1.5 rounded-md bg-white bg-opacity-15 placeholder-black text-black border border-white border-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            onKeyDown={handleSearchKey}
                        />
                        <select
                            id="lang"
                            className="px-3 py-1.5 rounded-md bg-white bg-opacity-15 text-black border border-white border-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={lang}
                            onChange={handleLangChange}
                        >
                            <option value="en">EN</option>
                            <option value="fr">FR</option>
                            <option value="ar">AR</option>
                        </select>
                        <button
                            id="mobileMenuBtn"
                            type="button"
                            className="md:hidden rounded-full border border-white border-opacity-40 p-2"
                            onClick={() => setMenuOpen(open => !open)}
                            aria-label="Toggle navigation"
                        >
                            ☰
                        </button>
                    </div>
                </div>
                {menuOpen && (
                    <div
                        id="mobileMenu"
                        className="md:hidden bg-white/90 text-gray-900 px-4 py-3"
                    >
                        <div className="flex flex-col gap-3">
                            {NAV_LINKS.map(link => {
                                const href = resolveLinkHref(link);
                                return (
                                    <Link
                                        key={link.key}
                                        href={href}
                                        className="block font-medium"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        {t(link.key)}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </header>

            <main>{children}</main>

            <footer className="site-footer mt-16">
                <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8 text-white">
                    <div>
                        <h3 className="font-bold">SOFRACOM</h3>
                        <p className="text-sm mt-2 opacity-80">
                            Marine coatings & supplies in Monastir. Products,
                            expertise, and partner yard for hassle-free projects.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold">{t('footer.quick')}</h4>
                        <ul className="mt-2 space-y-1 text-sm">
                            <li>
                                <a href="#home" className="hover:underline">
                                    {t('nav.home')}
                                </a>
                            </li>
                            <li>
                                <a href="#about" className="hover:underline">
                                    {t('nav.about')}
                                </a>
                            </li>
                            <li>
                                <a href="#brands" className="hover:underline">
                                    {t('nav.brands')}
                                </a>
                            </li>
                            <li>
                                <a href="#services" className="hover:underline">
                                    {t('nav.services')}
                                </a>
                            </li>
                            <li>
                                <a href="#contact" className="hover:underline">
                                    {t('nav.contact')}
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold">Monastir</h4>
                        <p className="text-sm mt-2 opacity-80">
                            {t('footer.monastir')}
                        </p>
                    </div>
                </div>
                <div className="border-t border-blue-900">
                    <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-xs opacity-70">
                        <span>
                            © {new Date().getFullYear()} SOFRACOM. All rights
                            reserved.
                        </span>
                        <button
                            type="button"
                            className="hover:underline"
                            onClick={handleBackToTop}
                        >
                            Back to top
                        </button>
                    </div>
                </div>
            </footer>

            <button
                id="toTop"
                className={`fixed bottom-6 right-6 px-4 py-2 rounded-full bg-blue-900 text-white shadow-lg ${
                    showToTop ? 'show' : ''
                }`}
                type="button"
                onClick={handleBackToTop}
            >
                ↑
            </button>
        </div>
    );
}
