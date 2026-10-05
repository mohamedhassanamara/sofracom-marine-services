import fs from 'fs';
import path from 'path';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { Inter_Tight, Manrope, Plus_Jakarta_Sans } from 'next/font/google';
import Seo from '../components/Seo';
import CategoryV2, { EmptyResults, FilterSheetSpecimen } from '../components/lab/CategoryV2';
import HeaderV2 from '../components/lab/HeaderV2';
import { HeroFullBleed, HeroSplit, TrustBar } from '../components/lab/HeroV2';
import ProductCardV2 from '../components/lab/ProductCardV2';
import ProductTopV2 from '../components/lab/ProductTopV2';
import { useLang } from '../contexts/LangContext';
import useAddToCart from '../hooks/useAddToCart';
import useProductStats from '../hooks/useProductStats';
import { LOCALES } from '../lib/i18n/locales';
import { localizeCategory, localizeProduct } from '../lib/localize';
import { cardCategory, cardProduct, featuredProducts, getCategories, getCategoryBySlug, getProductById } from '../lib/products';

// /design-lab: the v2 visual direction, side by side, to choose from. Development only
// (404 in production builds unless DESIGN_LAB=1), noindex, drawn without the site chrome.
// Lab captions are English on purpose; the specimens use the real translations.

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap', preload: false });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap', preload: false });
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap', preload: false });
const FONTS = {
    manrope: { name: 'Manrope', font: manrope },
    jakarta: { name: 'Plus Jakarta Sans', font: jakarta },
    'inter-tight': { name: 'Inter Tight', font: interTight },
};

const SAMPLE_PRODUCT = 'p_bamzqzdm';
const SAMPLE_CATEGORY = 'antifouling-coatings';

export async function getStaticProps() {
    if (process.env.NODE_ENV === 'production' && process.env.DESIGN_LAB !== '1') return { notFound: true };
    const categories = getCategories();
    const all = categories.flatMap(category => category.products);
    const withPhoto = all.filter(product => product.image && !product.image.includes('logo'));
    const stockOf = product => {
        const variants = product.variants || [];
        if (!variants.length) return product.stock || 'in';
        const stocks = variants.map(variant => variant.stock);
        return stocks.includes('in') ? 'in' : stocks.includes('on-order') ? 'on-order' : 'out';
    };
    // Real products covering every card state.
    const picks = [];
    const take = (test, note) => {
        const product = withPhoto.find(item => !picks.some(pick => pick.product.id === item.id) && test(item));
        if (product) picks.push({ product, note });
    };
    take(product => stockOf(product) === 'in' && (product.variants || []).length <= 1 && (product.images || []).length > 1, 'In stock · 2nd photo on hover · sample rating');
    take(product => stockOf(product) === 'in' && (product.variants || []).length > 2 && new Set(product.variants.map(variant => variant.price)).size > 1, 'Options (from price) · sample rating');
    take(product => stockOf(product) === 'on-order', 'On order');
    take(product => stockOf(product) === 'out', 'Out of stock (no +)');
    take(product => stockOf(product) === 'in' && (product.variants || []).length <= 1 && product.brand === 'SIKA', 'In stock, no rating');
    take(product => stockOf(product) === 'in' && (product.variants || []).length > 1 && product.categorySlug !== picks[1]?.product.categorySlug, 'Options, no rating');
    take(product => stockOf(product) === 'in' && product.categorySlug === 'hardware-tools', 'Tool photo');
    take(product => stockOf(product) === 'in' && (product.variants || []).length <= 1 && product.categorySlug === 'oils-filters-batteries', 'Small pack');

    const entry = getProductById(SAMPLE_PRODUCT);
    const category = getCategoryBySlug(SAMPLE_CATEGORY);
    let cutouts = [];
    try {
        cutouts = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/design-lab/cutouts/manifest.json'), 'utf-8'));
    } catch {
        cutouts = [];
    }
    return {
        props: {
            categories: categories.map(cardCategory),
            featured: featuredProducts(categories, 8).map(cardProduct),
            cards: picks.map(pick => ({ product: cardProduct(pick.product), note: pick.note })),
            category: { ...cardCategory(category), products: category.products.map(cardProduct) },
            product: { ...entry.product, categorySlug: entry.category.slug },
            cutouts,
        },
    };
}

// Made-up ratings so the rating line can be judged (the emulator has few reviews).
const SAMPLE_STATS = [
    { count: 12, avg: 4.6 },
    { count: 3, avg: 4 },
];

function Caption({ index, title, children }) {
    return (
        <div lang="en" dir="ltr" className="mx-auto max-w-wide px-4 pb-4 pt-16 text-left sm:px-6">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
                {String(index).padStart(2, '0')} · {title}
            </p>
            {children && <p className="mt-1 max-w-3xl text-sm text-ink-muted">{children}</p>}
        </div>
    );
}

function Frame({ label, className, children }) {
    return (
        <div className={className}>
            <p lang="en" dir="ltr" className="mx-auto max-w-wide px-4 pb-2 text-left text-xs font-medium text-ink-muted sm:px-6">
                {label}
            </p>
            <div className="relative overflow-hidden border-y border-dashed border-line-strong">{children}</div>
        </div>
    );
}

export default function DesignLab({ categories, featured, cards, category, product, cutouts }) {
    const router = useRouter();
    const { lang, t } = useLang();
    const realStats = useProductStats();
    const addToCart = useAddToCart();
    const fontKey = FONTS[router.query.font] ? router.query.font : 'manrope';
    const [useCutouts, setUseCutouts] = useState(false);
    const cutoutFor = useMemo(() => Object.fromEntries(cutouts.map(item => [item.id, item.cutout])), [cutouts]);

    const cardStats = (id, index) => realStats[id] || SAMPLE_STATS[index] || null;
    const swap = item => (useCutouts && cutoutFor[item.id] ? { ...item, image: cutoutFor[item.id], image2: null } : item);
    const localizedCategory = useMemo(() => localizeCategory(category, lang), [category, lang]);
    const topBrand = useMemo(() => {
        const counts = {};
        category.products.forEach(item => item.brand && (counts[item.brand] = (counts[item.brand] || 0) + 1));
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    }, [category.products]);
    const setFont = key => router.replace({ pathname: router.pathname, query: { ...router.query, font: key } }, undefined, { shallow: true, scroll: false });
    const display = FONTS[fontKey].font.style.fontFamily;

    return (
        <div className="lab min-h-screen bg-white text-ink">
            <Seo title="Design lab" path="/design-lab" noindex />
            <style jsx global>{`
                .lab {
                    --font-display: ${display}, var(--font-arabic);
                }
                :root:lang(ar) .lab {
                    --font-display: var(--font-arabic), ${display};
                }
                .lab h1,
                .lab h2,
                .lab h3 {
                    font-family: var(--font-display);
                }
            `}</style>

            <div lang="en" dir="ltr" className="sticky top-0 z-50 flex h-12 items-center gap-4 overflow-x-auto bg-ink px-4 text-sm text-white sm:px-6">
                <span className="whitespace-nowrap font-semibold">Design lab · v2</span>
                <span className="hidden whitespace-nowrap text-white/60 sm:inline">dev only, not part of the site</span>
                <span className="ms-auto flex items-center gap-1">
                    {Object.entries(FONTS).map(([key, value]) => (
                        <button key={key} type="button" aria-pressed={key === fontKey} onClick={() => setFont(key)} className={`whitespace-nowrap rounded-full px-3 py-1 ${key === fontKey ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`}>
                            {value.name}
                        </button>
                    ))}
                </span>
                <span className="flex items-center gap-1">
                    {LOCALES.map(locale => (
                        <button key={locale} type="button" aria-pressed={locale === lang} onClick={() => router.push({ pathname: router.pathname, query: router.query }, undefined, { locale })} className={`rounded-full px-2.5 py-1 uppercase ${locale === lang ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`}>
                            {locale}
                        </button>
                    ))}
                </span>
            </div>

            <main id="main">
                <Caption index={1} title="Header">
                    White, hairline border, centred nav. On scroll it turns translucent with a blur and gets shorter. Search opens a large panel with thumbnails; Shop opens a panel of category images.
                </Caption>
                <div className="flex flex-col gap-8">
                    <Frame label="Default">
                        <HeaderV2 sticky={false} categories={categories} featured={featured} demoScrolled={false} demoCartCount={2} />
                    </Frame>
                    <Frame label="Scrolled (over the hero photo)">
                        <div className="relative h-40 overflow-hidden">
                            <img src="/assets/site/monastir-1-800.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
                            <div className="absolute inset-x-0 top-0">
                                <HeaderV2 sticky={false} categories={categories} featured={featured} demoScrolled demoCartCount={2} />
                            </div>
                        </div>
                    </Frame>
                    <Frame label="Shop menu open (desktop)" className="hidden lg:block">
                        <div className="relative h-[27rem]">
                            <HeaderV2 sticky={false} categories={categories} featured={featured} demoScrolled={false} demoMega />
                        </div>
                    </Frame>
                    <Frame label="Search open">
                        <div className="relative h-[46rem] sm:h-[38rem]">
                            <HeaderV2 sticky={false} categories={categories} featured={featured} demoScrolled={false} demoSearch />
                        </div>
                    </Frame>
                </div>

                <Caption index={2} title="Hero A · full-bleed photo">
                    The marina photo edge to edge, a light shade only behind the text. White primary button on the photo.
                </Caption>
                <HeroFullBleed priority />
                <TrustBar />

                <Caption index={3} title="Hero B · split">
                    Text on the start side, photo on the end side. Navy primary button.
                </Caption>
                <HeroSplit />
                <TrustBar />

                <Caption index={4} title="Heading font">
                    Same headline, section title and card title in each option, 600–700 weight, −0.02 to −0.03em tracking. Arabic always uses IBM Plex Sans Arabic at the same weight. Switch the whole lab with the buttons in the top bar.
                </Caption>
                <div className="mx-auto grid max-w-wide gap-6 px-4 sm:px-6 lg:grid-cols-3">
                    {Object.entries(FONTS).map(([key, value]) => (
                        <div key={key} className={`rounded-2xl p-8 ${key === fontKey ? 'bg-surface ring-2 ring-ink' : 'bg-surface'}`}>
                            <p lang="en" dir="ltr" className="text-left text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                                {value.name}
                            </p>
                            <p className="mt-6 text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.03em]" style={{ fontFamily: `${lang === 'ar' ? 'var(--font-arabic), ' : ''}${value.font.style.fontFamily}` }}>
                                {t('home.v2.title')}
                            </p>
                            <p className="mt-6 text-title-2 font-semibold" style={{ fontFamily: `${lang === 'ar' ? 'var(--font-arabic), ' : ''}${value.font.style.fontFamily}` }}>
                                {t('home.categories.title')}
                            </p>
                            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.1em] text-ink-muted" style={{ fontFamily: value.font.style.fontFamily }}>
                                JOTUN · HEMPEL · SIKA
                            </p>
                            <p className="mt-2 text-lg font-semibold tracking-[-0.01em]" style={{ fontFamily: value.font.style.fontFamily }}>
                                SeaForce Active 2.5L · 341.887 DT
                            </p>
                            <p className="mt-4 text-body-lg text-ink-muted">{t('home.v2.subtitle')}</p>
                        </div>
                    ))}
                </div>

                <Caption index={5} title="Product card">
                    Real products. Hover a card for the + button and the second photo (always visible on touch screens). The last card shows the option picker open; on phones it becomes a bottom sheet. Ratings on the first two cards are samples.
                </Caption>
                <div lang="en" dir="ltr" className="mx-auto flex max-w-wide items-center gap-3 px-4 pb-6 text-left text-sm sm:px-6">
                    <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={useCutouts} onChange={event => setUseCutouts(event.target.checked)} className="h-4 w-4 accent-navy-900" />
                        Use the cutout photos where one exists (section 08)
                    </label>
                </div>
                <ul className="mx-auto grid max-w-wide grid-cols-2 gap-x-4 gap-y-10 px-4 sm:gap-x-6 sm:px-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-14">
                    {cards.map(({ product: item, note }, index) => (
                        <li key={item.id} className="flex flex-col">
                            <ProductCardV2 product={swap(localizeProduct(item, lang))} stats={cardStats(item.id, index)} onQuickAdd={addToCart} />
                            <p lang="en" dir="ltr" className="mt-3 text-left font-mono text-[0.6875rem] text-ink-muted">
                                {note}
                            </p>
                        </li>
                    ))}
                    {cards[1] && (
                        <li className="flex flex-col">
                            <ProductCardV2 product={swap(localizeProduct(cards[1].product, lang))} stats={SAMPLE_STATS[1]} onQuickAdd={addToCart} demoPickerOpen />
                            <p lang="en" dir="ltr" className="mt-3 text-left font-mono text-[0.6875rem] text-ink-muted">
                                Option picker open
                            </p>
                        </li>
                    )}
                </ul>

                <Caption index={6} title="Category page">
                    No sidebar. Big title, one line, use pills; a sticky toolbar with filter popovers (Brand open here, one brand active), count and sort; removable chips; 4 / 3 / 2 columns.
                </Caption>
                <div className="bg-white">
                    <CategoryV2 key={lang} category={localizedCategory} stats={realStats} onQuickAdd={addToCart} initialFilters={{ brands: topBrand ? [topBrand] : [] }} demoPopover="brand" stickyTop="top-12" />
                </div>
                <div className="mx-auto mt-16 grid max-w-wide gap-8 px-4 sm:px-6 lg:grid-cols-2">
                    <div>
                        <p lang="en" dir="ltr" className="pb-2 text-left text-xs font-medium text-ink-muted">
                            Empty result
                        </p>
                        <div className="rounded-2xl border border-dashed border-line-strong">
                            <EmptyResults onClear={() => {}} />
                        </div>
                    </div>
                    <div>
                        <p lang="en" dir="ltr" className="pb-2 text-left text-xs font-medium text-ink-muted">
                            Phones: Filters → bottom sheet
                        </p>
                        <div className="mx-auto flex h-[44rem] w-full max-w-[390px] flex-col justify-end overflow-hidden rounded-[2rem] bg-ink/50 pt-24">
                            <FilterSheetSpecimen category={localizedCategory} initialFilters={{ brands: topBrand ? [topBrand] : [] }} />
                        </div>
                    </div>
                </div>

                <Caption index={7} title="Product page · top">
                    Large gallery (click to enlarge), sticky info column: brand, title, rating, price, option chips with their price, stock, quantity + Add to cart, Ask for a quote, delivery line.
                </Caption>
                <ProductTopV2 key={lang} product={localizeProduct(product, lang)} stats={realStats[product.id] || SAMPLE_STATS[0]} onAdd={addToCart} />

                <Caption index={8} title="Photo cutouts (10 samples)">
                    {cutouts.length
                        ? 'Generated on this computer by scripts/cutouts.mjs: background removed, trimmed, centred on a square with the same margin. Originals are untouched; each pair would be approved or rejected in the admin.'
                        : 'No samples yet: run node scripts/cutouts.mjs --sample 10.'}
                </Caption>
                <ul className="mx-auto grid max-w-wide grid-cols-1 gap-6 px-4 pb-24 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
                    {cutouts.map(item => (
                        <li key={item.id}>
                            <div className="grid grid-cols-2 gap-2">
                                <figure>
                                    <div className="aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-line">
                                        <img src={`/${item.original.replace(/^\//, '').replace(/-800\.webp$/, '-400.webp')}`} alt="" className="h-full w-full object-contain" />
                                    </div>
                                    <figcaption lang="en" dir="ltr" className="mt-1 text-left text-[0.6875rem] text-ink-muted">
                                        Original
                                    </figcaption>
                                </figure>
                                <figure>
                                    <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                                        <img src={item.cutout.replace(/-800\.webp$/, '-400.webp')} alt="" className="h-full w-full object-contain" />
                                    </div>
                                    <figcaption lang="en" dir="ltr" className="mt-1 text-left text-[0.6875rem] text-ink-muted">
                                        Cutout
                                    </figcaption>
                                </figure>
                            </div>
                            <p className="mt-2 line-clamp-1 text-sm text-ink">{item.title}</p>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}

DesignLab.bareLayout = true;
