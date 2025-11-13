import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    const [searchActive, setSearchActive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [productsIndex, setProductsIndex] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showProductCategories, setShowProductCategories] = useState(false);
    const searchRef = useRef(null);

    const router = useRouter();
    const ensurePath = value => {
        if (!value) return '';
        return value.startsWith('/') ? value : `/${value}`;
    };

    const slugify = value =>
        (value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    const formatCurrency = value =>
        new Intl.NumberFormat('fr-TN', {
            style: 'currency',
            currency: 'TND',
        }).format(Number.isFinite(value) ? value : 0);
    const filteredSuggestions = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return [];
        return productsIndex
            .filter(product => {
                const imageText = (product.image || '').toLowerCase();
                const priceText = formatCurrency(product.price).toLowerCase();
                return (
                    product.title.toLowerCase().includes(term) ||
                    imageText.includes(term) ||
                    priceText.includes(term)
                );
            })
            .slice(0, 6);
    }, [productsIndex, searchTerm]);
    const navigateToSuggestion = suggestion => {
        if (!suggestion?.categorySlug || !suggestion?.id) return;
        setSearchTerm('');
        setSearchActive(false);
        router.push(`/products/${suggestion.categorySlug}/${suggestion.id}`);
    };

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

    useEffect(() => {
        setShowProductCategories(false);
    }, [router.asPath]);

    useEffect(() => {
        let isMounted = true;
        fetch('/assets/data/products.json')
            .then(response => response.json())
            .then(data => {
                if (!isMounted) return;
                const entries = [];
                const normalizedCategories = (data.categories || []).map(category => ({
                    name: category.name,
                    slug: category.slug || slugify(category.name),
                    image: ensurePath(category.image || ''),
                }));
                setCategories(normalizedCategories);

                (data.categories || []).forEach(category => {
                    const categorySlug = category.slug || slugify(category.name);
                    (category.products || []).forEach(product => {
                        const productSlug = slugify(product.title);
                        const id = `${categorySlug}-${productSlug || 'item'}`;
                        entries.push({
                            title: product.title || '',
                            price: Number(product.price) || 0,
                            image: ensurePath(product.image || product.images?.[0] || ''),
                            id,
                            categorySlug,
                        });
                    });
                });
                setProductsIndex(entries);
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = event => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchActive(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchKey = event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (!filteredSuggestions.length) return;
        navigateToSuggestion(filteredSuggestions[0]);
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
                    <nav
                        className={`hidden md:flex items-center gap-8 text-sm font-medium ${
                            searchActive ? 'md:hidden' : ''
                        }`}
                    >
                        {NAV_LINKS.map(link => {
                            const href = resolveLinkHref(link);
                            if (link.key === 'nav.products') {
                                return (
                                    <div
                                        key={link.key}
                                        className="relative"
                                        onMouseEnter={() => setShowProductCategories(true)}
                                        onMouseLeave={() => setShowProductCategories(false)}
                                    >
                                        <Link
                                            href={href}
                                            className="inline-flex items-center gap-1 hover:text-blue-200"
                                        >
                                            {t(link.key)}
                                            {categories.length > 0 && (
                                                <span className="text-xs leading-none">
                                                    ▾
                                                </span>
                                            )}
                                        </Link>
                                        {categories.length > 0 && (
                                            <div
                                                className={`absolute left-0 top-full w-56 rounded-lg bg-white text-gray-900 shadow-xl transition duration-200 z-50 overflow-hidden ${
                                                    showProductCategories
                                                        ? 'opacity-100 pointer-events-auto translate-y-0'
                                                        : 'opacity-0 pointer-events-none -translate-y-1'
                                                }`}
                                            >
                                                <div className="flex flex-col divide-y divide-gray-100">
                                                    {categories.map(category => (
                                                        <Link
                                                            key={category.slug}
                                                            href={`/products/${category.slug}`}
                                                            className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                                                        >
                                                            {category.image && (
                                                                <img
                                                                    src={category.image}
                                                                    alt={`${category.name} category`}
                                                                    className="h-8 w-8 flex-shrink-0 rounded-md object-cover"
                                                                />
                                                            )}
                                                            <span className="font-medium">
                                                                {category.name}
                                                            </span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
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
                        <div className="relative" ref={searchRef}>
                            <input
                                id="siteSearch"
                                type="text"
                                placeholder="Search products…"
                                className={`hidden sm:block px-3 py-1.5 rounded-md bg-white bg-opacity-15 placeholder-black text-black border border-white border-opacity-20 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${
                                    searchActive ? 'md:w-64' : 'md:w-44'
                                }`}
                                onKeyDown={handleSearchKey}
                                onFocus={() => setSearchActive(true)}
                                value={searchTerm}
                                onChange={event => setSearchTerm(event.target.value)}
                            />
                            {searchActive && filteredSuggestions.length > 0 && (
                                <div className="search-dropdown">
                                    {filteredSuggestions.map(suggestion => (
                                        <button
                                            key={suggestion.id}
                                            type="button"
                                            className="search-suggestion"
                                            onClick={() => navigateToSuggestion(suggestion)}
                                        >
                                            {suggestion.image && (
                                                <img
                                                    src={suggestion.image}
                                                    alt={suggestion.title}
                                                    className="search-suggestion-img"
                                                />
                                            )}
                                            <div className="flex flex-col text-left">
                                                <span className="font-semibold text-sm text-gray-900">
                                                    {suggestion.title}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatCurrency(suggestion.price)}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
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
                        className="md:hidden bg-[rgba(11,32,80,0.92)] text-white px-4 py-3"
                    >
                        <div className="flex flex-col gap-3">
                            {NAV_LINKS.map(link => {
                                const href = resolveLinkHref(link);
                                return (
                                    <Link
                                        key={link.key}
                                        href={href}
                                        className="block font-medium hover:text-blue-200"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        {t(link.key)}
                                    </Link>
                                );
                            })}
                        </div>
                        {categories.length > 0 && (
                            <div className="mt-4 border-t border-white/30 pt-3 space-y-1">
                                {categories.map(category => (
                                    <Link
                                        key={category.slug}
                                        href={`/products/${category.slug}`}
                                        className="block font-medium text-sm hover:text-blue-200"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        {category.name}
                                    </Link>
                                ))}
                            </div>
                        )}
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
