import Link from 'next/link';
import { useMemo } from 'react';
import Seo from '../components/Seo';
import { CONTACT } from '../components/layout/SiteFooter';
import { CategoryArt, ProductRail, ResponsiveImage } from '../components/ui';
import HeroImage from '../components/ui/HeroImage';
import { cx } from '../components/ui/cx';
import { Anchor, ArrowRight, Award, Check, ChevronDown, Icon, MapPin, MessageCircle, Paintbrush, Phone, Ship, Sparkles, Truck, Wrench, Zap } from '../components/ui/icons';
import { useLang } from '../contexts/LangContext';
import useAddToCart from '../hooks/useAddToCart';
import useProductStats from '../hooks/useProductStats';
import { localizeCategory, localizeProduct } from '../lib/localize';
import { cardCategory, cardProduct, featuredProducts, getCategories, getProductById } from '../lib/products';
import { localBusinessJsonLd } from '../lib/seo';
import { HERO, SERVICE_CARDS } from '../lib/siteMedia';

export function getStaticProps() {
    const categories = getCategories();
    return {
        props: {
            categories: categories.map(cardCategory),
            featured: featuredProducts(categories, 10).map(cardProduct),
            // Service cards: a photo, or the listed products' (cutout) images.
            serviceCards: SERVICE_CARDS.map(card => ({
                key: card.key,
                photo: card.photo || null,
                position: card.position || null,
                zoom: card.zoom || null,
                images: (card.products || []).map(id => getProductById(id)?.product.image).filter(Boolean),
            })),
        },
    };
}

const BRANDS = ['jotun', 'hempel', 'international', 'akzonobel', 'sika', 'crown', 'varta', 'bosch'];

// Every service (the quote form lists the same keys); the first three get a large card.
export const SERVICES = [
    { key: 'antifouling', icon: Paintbrush },
    { key: 'gelcoat', icon: Sparkles },
    { key: 'deck', icon: Anchor },
    { key: 'electrical', icon: Zap },
    { key: 'polishing', icon: Wrench },
    { key: 'haulout', icon: Ship },
];
const FAQ = [1, 2, 3, 4, 5];
const TRUST = [
    { icon: Truck, key: 'trust.berth' },
    { icon: MessageCircle, key: 'trust.advice' },
    { icon: Award, key: 'trust.brands' },
    { icon: MapPin, key: 'trust.local' },
];

// Sections alternate white and surface; the background change is the separator (no hairlines).
const section = 'mx-auto max-w-wide px-4 py-14 sm:px-6 sm:py-24 lg:py-28';
const pill = 'inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[0.9375rem] font-semibold transition-colors duration-fast';

function SectionHeading({ id, title, subtitle, action }) {
    return (
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-14">
            <div className="max-w-2xl">
                <h2 id={id} className="text-[2rem] font-semibold leading-[1.1] text-ink lg:text-title-1">
                    {title}
                </h2>
                {subtitle && <p className="mt-4 text-body-lg text-ink-muted">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

const MoreLink = ({ href, children }) => (
    <Link prefetch={false} href={href} className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-navy-900 underline-offset-4 hover:underline">
        {children}
        <Icon as={ArrowRight} size={18} flip />
    </Link>
);

// The marina photo edge to edge, a light shade only behind the text (bottom / start side).
function Hero() {
    const { t } = useLang();
    return (
        <section className="relative isolate flex min-h-[34rem] items-end overflow-hidden bg-navy-900 sm:min-h-[40rem] lg:h-[min(86vh,48rem)]">
            <HeroImage image={HERO.image} mobile={HERO.mobile} position={HERO.position} className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950/80 via-navy-950/25 to-transparent" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-navy-950/45 to-transparent lg:block rtl:bg-gradient-to-l" />
            <div className="mx-auto w-full max-w-wide px-4 pb-20 sm:px-6 sm:pb-24 lg:pb-32">
                <div className="max-w-[46rem]">
                    <h1 className="text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.025em] text-white sm:text-display-2 lg:text-display-1">{t('home.v2.title')}</h1>
                    <p className="mt-5 max-w-[32rem] text-body-lg text-white/90">{t('home.v2.subtitle')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link prefetch={false} href="/products" className={cx(pill, 'bg-white text-ink hover:bg-surface')}>
                            {t('home.v2.shop')}
                        </Link>
                        <Link prefetch={false} href="/quote" className={cx(pill, 'bg-accent-600 text-white hover:bg-accent-700')}>
                            {t('nav.quote')}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// A white card overlapping the bottom of the hero (2×2 on phones, one row on desktop).
function TrustBar() {
    const { t } = useLang();
    return (
        <section aria-label={t('trust.label')} className="relative z-10 -mt-10 px-4 sm:px-6">
            <ul className="mx-auto grid max-w-wide grid-cols-2 gap-x-4 gap-y-5 rounded-xl bg-white px-5 py-5 shadow-md sm:px-8 lg:grid-cols-4 lg:py-6">
                {TRUST.map(item => (
                    <li key={item.key} className="flex items-center gap-3 text-sm font-semibold text-ink lg:justify-center">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700" aria-hidden="true">
                            <Icon as={item.icon} size={20} />
                        </span>
                        {t(item.key)}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Categories({ categories }) {
    const { t, lang } = useLang();
    return (
        <section className={section} aria-labelledby="home-categories">
            <SectionHeading id="home-categories" title={t('home.categories.title')} subtitle={t('home.categories.subtitle')} action={<MoreLink href="/products">{t('header.allProducts')}</MoreLink>} />
            <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {categories.map(raw => {
                    const category = localizeCategory(raw, lang);
                    return (
                        <li key={category.slug}>
                            <Link
                                prefetch={false}
                                href={`/products/${category.slug}`}
                                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface transition duration-base ease-out hover:-translate-y-1 hover:bg-surface-strong sm:aspect-[4/3]"
                            >
                                <CategoryArt
                                    images={raw.tiles.map(tile => tile.image)}
                                    fallback={raw.image}
                                    sizes="(min-width: 1024px) 300px, 45vw"
                                    tight
                                    className="!absolute inset-x-[6%] bottom-[5%] top-[25%] !bg-transparent sm:top-[22%]"
                                />
                                <span className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
                                    <span>
                                        <span className="block font-display text-lg font-semibold leading-tight tracking-[-0.01em] text-ink">{category.name}</span>
                                        <span className="mt-1 block text-sm text-ink-muted">{t('header.productsCount', { count: raw.count })}</span>
                                    </span>
                                    <span
                                        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-colors duration-fast group-hover:bg-navy-900 group-hover:text-white sm:flex"
                                        aria-hidden="true"
                                    >
                                        <Icon as={ArrowRight} size={18} flip />
                                    </span>
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function Featured({ products }) {
    const { t, lang } = useLang();
    const stats = useProductStats();
    const addToCart = useAddToCart();
    const localized = useMemo(() => products.map(product => localizeProduct(product, lang)), [products, lang]);
    return (
        <section className="bg-surface" aria-labelledby="home-featured">
            <div className={section}>
                <SectionHeading id="home-featured" title={t('home.featured.title')} subtitle={t('home.featured.subtitle')} action={<MoreLink href="/products">{t('home.featured.all')}</MoreLink>} />
                <ProductRail products={localized} stats={stats} onQuickAdd={addToCart} label={t('home.featured.title')} onSurface />
            </div>
        </section>
    );
}

function ServiceImage({ card }) {
    if (card.photo)
        return (
            <div className="h-full w-full" style={card.zoom ? { transform: `scale(${card.zoom})`, transformOrigin: card.position || 'center' } : undefined}>
                <ResponsiveImage
                    src={card.photo}
                    alt=""
                    sizes="(min-width: 768px) 800px, 100vw"
                    style={card.position ? { objectPosition: card.position } : undefined}
                    className="h-full w-full object-cover transition-transform duration-base ease-out group-hover:scale-[1.03]"
                />
            </div>
        );
    return <CategoryArt images={card.images} sizes="(min-width: 1024px) 260px, 50vw" className="h-full w-full" />;
}

// Three photo cards (navy shade at the bottom, white text, the whole card links to the quote
// form for that service), then the other services as chips.
function Services({ cards }) {
    const { t } = useLang();
    const others = SERVICES.filter(service => !cards.some(card => card.key === service.key));
    return (
        <section id="services" className={cx(section, 'scroll-mt-20')} aria-labelledby="home-services">
            <SectionHeading id="home-services" title={t('services.title')} subtitle={t('home.services.subtitle')} />
            <ul className="grid gap-5 md:grid-cols-3 md:gap-6">
                {cards.map(card => (
                    <li key={card.key} className="group relative aspect-square overflow-hidden rounded-2xl bg-navy-900 md:aspect-[4/5]">
                        <div className="absolute inset-0">
                            <ServiceImage card={card} />
                        </div>
                        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/55 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 lg:p-7">
                            <h3 className="text-xl font-semibold text-white">{t(`home.service.${card.key}.title`)}</h3>
                            <p className="mt-2 text-navy-100">{t(`home.service.${card.key}.body`)}</p>
                            <Link
                                prefetch={false}
                                href={`/quote?service=${card.key}`}
                                className="mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-white underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline"
                            >
                                {t('nav.quote')}
                                <Icon as={ArrowRight} size={16} flip />
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
            {others.length > 0 && (
                <div className="mt-10 flex flex-wrap items-center gap-3">
                    <p className="me-2 text-sm font-medium text-ink-muted">{t('home.v2.alsoTitle')}</p>
                    {others.map(service => (
                        <Link
                            key={service.key}
                            prefetch={false}
                            href={`/quote?service=${service.key}`}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-line-input px-4 text-sm font-medium text-ink hover:border-navy-900"
                        >
                            <Icon as={service.icon} size={16} className="text-navy-900" />
                            {t(`home.service.${service.key}.title`)}
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

// Four numbered steps on the surface band: navy circles joined by a dashed line on desktop.
function HowItWorks() {
    const { t } = useLang();
    return (
        <section className="bg-surface" aria-labelledby="home-how">
            <div className={section}>
                <h2 id="home-how" className="text-[2rem] font-semibold leading-[1.1] text-ink lg:text-title-1">
                    {t('home.how.title')}
                </h2>
                <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(step => (
                        <li key={step} className="relative">
                            {step < 4 && <span aria-hidden="true" className="absolute -end-10 start-14 top-5 hidden border-t-2 border-dashed border-line-input lg:block" />}
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 font-display text-base font-semibold tabular-nums text-white" aria-hidden="true">
                                {step}
                            </span>
                            <span className="mt-5 block text-lg font-semibold text-ink">{t(`home.how.step${step}.title`)}</span>
                            <span className="mt-2 block text-ink-muted">{t(`home.how.step${step}.body`)}</span>
                        </li>
                    ))}
                </ol>
                <Link prefetch={false} href="/quote" className={cx(pill, 'mt-12 bg-navy-900 text-white hover:bg-navy-800')}>
                    {t('nav.quote')}
                </Link>
            </div>
        </section>
    );
}

// Full-colour logos at one height, evenly spaced.
function Brands() {
    const { t } = useLang();
    return (
        <section id="brands" className="scroll-mt-20" aria-labelledby="home-brands">
            <div className="mx-auto max-w-wide px-4 py-14 sm:px-6 lg:py-20">
                <h2 id="home-brands" className="text-center font-sans text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {t('brands.title')}
                </h2>
                <ul className="mt-8 grid grid-cols-4 items-center gap-x-6 gap-y-8 lg:grid-cols-8">
                    {BRANDS.map(brand => (
                        <li key={brand} className="flex justify-center">
                            <img src={`/assets/brands/${brand}-400.webp`} alt={brand.toUpperCase()} loading="lazy" width="120" height="32" className="h-6 w-auto max-w-full object-contain sm:h-8" />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function About() {
    const { t } = useLang();
    return (
        <section id="about" className="scroll-mt-20" aria-labelledby="home-about">
            <div className={cx(section, 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20')}>
                <div className="overflow-hidden rounded-2xl">
                    <ResponsiveImage src="/assets/site/monastir-2-800.webp" alt={t('monoA.title')} sizes="(min-width: 1024px) 640px, 100vw" className="aspect-[4/3] w-full object-cover" />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-700">{t('about.title')}</p>
                    <h2 id="home-about" className="mt-4 text-[2rem] font-semibold leading-[1.1] text-ink lg:text-title-1">
                        {t('home.location.title')}
                    </h2>
                    <p className="mt-5 text-body-lg text-ink-muted">{t('home.location.body')}</p>
                    <ul className="mt-8 space-y-4">
                        {[1, 2, 3, 4].map(n => (
                            <li key={n} className="flex items-start gap-3 text-ink">
                                <Icon as={Check} size={20} className="mt-0.5 shrink-0 text-navy-900" />
                                {t(`home.location.fact${n}`)}
                            </li>
                        ))}
                    </ul>
                    <a
                        href={CONTACT.mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-8 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink underline-offset-4 hover:underline"
                    >
                        <Icon as={MapPin} size={18} />
                        {t('footer.directions')}
                    </a>
                </div>
            </div>
        </section>
    );
}

function Faq() {
    const { t } = useLang();
    return (
        <section id="faq" className="scroll-mt-20 bg-surface" aria-labelledby="home-faq">
            <div className={cx(section, 'grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20')}>
                <h2 id="home-faq" className="text-[2rem] font-semibold leading-[1.1] text-ink lg:text-title-1">
                    {t('faq.title')}
                </h2>
                <div className="divide-y divide-line-strong border-y border-line-strong">
                    {FAQ.map(n => (
                        <details key={n} className="group">
                            <summary className="flex min-h-[4rem] cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.0625rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
                                {t(`faq.q${n}`)}
                                <Icon as={ChevronDown} size={20} className="shrink-0 transition-transform duration-fast group-open:rotate-180" />
                            </summary>
                            <p className="max-w-2xl pb-6 text-ink-muted">{t(`faq.a${n}`)}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

// An inset navy card above the footer (not a full-width band, so it never meets the footer).
function Closing() {
    const { t } = useLang();
    return (
        <section className="mx-auto max-w-wide px-4 py-14 sm:px-6 lg:py-20" aria-labelledby="home-cta">
            <div className="flex flex-col gap-8 rounded-3xl bg-navy-900 px-6 py-12 text-white sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-16 lg:py-16">
                <div className="max-w-2xl">
                    <h2 id="home-cta" className="text-[2rem] font-semibold leading-[1.1] lg:text-title-1">
                        {t('home.v2.ctaTitle')}
                    </h2>
                    <p className="mt-4 text-body-lg text-navy-100">{t('home.v2.ctaBody')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link prefetch={false} href="/quote" className={cx(pill, 'bg-accent-600 text-white hover:bg-accent-700')}>
                        {t('home.v2.ctaButton')}
                    </Link>
                    <a href={CONTACT.phoneHref} className={cx(pill, 'border border-white text-white hover:bg-white/10')}>
                        <Icon as={Phone} size={18} />
                        <bdi dir="ltr">{CONTACT.phone}</bdi>
                    </a>
                </div>
            </div>
        </section>
    );
}

export default function HomePage({ categories, featured, serviceCards }) {
    const { t, lang } = useLang();
    return (
        <>
            <Seo title={t('seo.home.title')} description={t('seo.home.description')} path="/" image={HERO.image} jsonLd={localBusinessJsonLd(lang)} />
            <Hero />
            <TrustBar />
            <Categories categories={categories} />
            <Featured products={featured} />
            <Services cards={serviceCards} />
            <HowItWorks />
            <Brands />
            <About />
            <Faq />
            <Closing />
        </>
    );
}

// The closing card brings its own spacing above the footer.
HomePage.flushFooter = true;
