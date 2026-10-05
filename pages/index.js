import Link from 'next/link';
import { useMemo } from 'react';
import Seo from '../components/Seo';
import { CONTACT } from '../components/layout/SiteFooter';
import { CategoryArt, ProductRail, ResponsiveImage } from '../components/ui';
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

const section = 'mx-auto max-w-wide px-4 py-14 sm:px-6 sm:py-24 lg:py-32';
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
    <Link prefetch={false} href={href} className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink underline-offset-4 hover:underline">
        {children}
        <Icon as={ArrowRight} size={18} flip />
    </Link>
);

// The marina photo edge to edge, a light shade only behind the text (bottom / start side).
function Hero() {
    const { t } = useLang();
    return (
        <section className="relative isolate flex min-h-[34rem] items-end overflow-hidden bg-ink sm:min-h-[40rem] lg:h-[min(86vh,48rem)]">
            <ResponsiveImage src={HERO.image} alt="" sizes="100vw" priority className="absolute inset-0 -z-10 h-full w-full object-cover" style={{ objectPosition: HERO.position }} />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/30 to-transparent lg:block rtl:bg-gradient-to-l" />
            <div className="mx-auto w-full max-w-wide px-4 pb-12 sm:px-6 sm:pb-16 lg:pb-24">
                <div className="max-w-[46rem]">
                    <h1 className="text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.025em] text-white sm:text-display-2 lg:text-display-1">{t('home.v2.title')}</h1>
                    <p className="mt-5 max-w-[32rem] text-body-lg text-white/90">{t('home.v2.subtitle')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link prefetch={false} href="/products" className={cx(pill, 'bg-white text-ink hover:bg-surface')}>
                            {t('home.v2.shop')}
                        </Link>
                        <Link prefetch={false} href="/quote" className={cx(pill, 'border border-white/70 text-white hover:bg-white/10')}>
                            {t('nav.quote')}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

function TrustBar() {
    const { t } = useLang();
    return (
        <section aria-label={t('trust.label')} className="border-b border-line">
            <ul className="mx-auto grid max-w-wide grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:py-7">
                {TRUST.map(item => (
                    <li key={item.key} className="flex items-center gap-3 text-sm font-medium text-ink lg:justify-center">
                        <Icon as={item.icon} size={20} className="shrink-0 text-navy-900" />
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
                            <Link prefetch={false} href={`/products/${category.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface sm:aspect-[4/3]">
                                <CategoryArt
                                    images={raw.tiles.map(tile => tile.image)}
                                    fallback={raw.image}
                                    sizes="(min-width: 1024px) 220px, 30vw"
                                    className="!absolute inset-x-0 bottom-0 top-[26%] sm:top-[22%]"
                                />
                                <span className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
                                    <span>
                                        <span className="block font-display text-[1.0625rem] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-xl">{category.name}</span>
                                        <span className="mt-1 block text-sm text-ink-muted">{t('header.productsCount', { count: raw.count })}</span>
                                    </span>
                                    <span
                                        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-colors duration-fast group-hover:bg-ink group-hover:text-white sm:flex"
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
        <section className="border-t border-line" aria-labelledby="home-featured">
            <div className={section}>
                <SectionHeading id="home-featured" title={t('home.featured.title')} subtitle={t('home.featured.subtitle')} action={<MoreLink href="/products">{t('home.featured.all')}</MoreLink>} />
                <ProductRail products={localized} stats={stats} onQuickAdd={addToCart} label={t('home.featured.title')} />
            </div>
        </section>
    );
}

function ServiceImage({ card }) {
    if (card.photo)
        return (
            <ResponsiveImage
                src={card.photo}
                alt=""
                sizes="(min-width: 1024px) 420px, 100vw"
                className="h-full w-full object-cover transition-transform duration-base ease-out group-hover:scale-[1.03]"
            />
        );
    return <CategoryArt images={card.images} sizes="(min-width: 1024px) 260px, 50vw" className="h-full w-full" />;
}

function Services({ cards }) {
    const { t } = useLang();
    const others = SERVICES.filter(service => !cards.some(card => card.key === service.key));
    return (
        <section id="services" className={cx(section, 'scroll-mt-20')} aria-labelledby="home-services">
            <SectionHeading id="home-services" title={t('services.title')} subtitle={t('home.services.subtitle')} />
            <ul className="grid gap-x-6 gap-y-12 md:grid-cols-3">
                {cards.map(card => (
                    <li key={card.key} className="group flex flex-col">
                        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-surface md:aspect-[4/5]">
                            <ServiceImage card={card} />
                        </div>
                        <h3 className="mt-6 text-xl font-semibold text-ink">{t(`home.service.${card.key}.title`)}</h3>
                        <p className="mt-2 text-ink-muted">{t(`home.service.${card.key}.body`)}</p>
                        {/* A visible quote link on every card, phones included. */}
                        <Link
                            prefetch={false}
                            href={`/quote?service=${card.key}`}
                            className="mt-4 inline-flex items-center gap-1.5 self-start text-[0.9375rem] font-semibold text-navy-900 underline-offset-4 hover:underline"
                        >
                            {t('nav.quote')}
                            <Icon as={ArrowRight} size={16} flip />
                        </Link>
                    </li>
                ))}
            </ul>
            {others.length > 0 && (
                <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-8">
                    <p className="me-2 text-sm font-medium text-ink-muted">{t('home.v2.alsoTitle')}</p>
                    {others.map(service => (
                        <Link
                            key={service.key}
                            prefetch={false}
                            href={`/quote?service=${service.key}`}
                            className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink"
                        >
                            <Icon as={service.icon} size={16} className="text-navy-900" />
                            {t(`home.service.${service.key}.title`)}
                        </Link>
                    ))}
                </div>
            )}

            <div className="mt-20 lg:mt-28">
                <h3 className="text-2xl font-semibold text-ink lg:text-title-2">{t('home.how.title')}</h3>
                <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(step => (
                        <li key={step} className="border-t border-ink pt-5">
                            <span className="font-display text-sm font-semibold tabular-nums text-ink-muted" aria-hidden="true">
                                {String(step).padStart(2, '0')}
                            </span>
                            <span className="mt-3 block text-lg font-semibold text-ink">{t(`home.how.step${step}.title`)}</span>
                            <span className="mt-2 block text-ink-muted">{t(`home.how.step${step}.body`)}</span>
                        </li>
                    ))}
                </ol>
                <Link prefetch={false} href="/quote" className={cx(pill, 'mt-10 bg-navy-900 text-white hover:bg-navy-800')}>
                    {t('nav.quote')}
                </Link>
            </div>
        </section>
    );
}

function Brands() {
    const { t } = useLang();
    return (
        <section id="brands" className="scroll-mt-20 border-y border-line" aria-labelledby="home-brands">
            <div className="mx-auto max-w-wide px-4 py-12 sm:px-6 lg:py-16">
                <h2 id="home-brands" className="text-center font-sans text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {t('brands.title')}
                </h2>
                <ul className="mt-8 grid grid-cols-4 items-center gap-x-6 gap-y-8 lg:grid-cols-8">
                    {BRANDS.map(brand => (
                        <li key={brand} className="flex justify-center">
                            <img
                                src={`/assets/brands/${brand}-400.webp`}
                                alt={brand.toUpperCase()}
                                loading="lazy"
                                width="96"
                                height="48"
                                className="h-12 w-auto max-w-full object-contain opacity-80 mix-blend-multiply grayscale transition duration-base hover:opacity-100 hover:grayscale-0 sm:h-16"
                            />
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
        <section id="about" className="scroll-mt-20 bg-surface" aria-labelledby="home-about">
            <div className={cx(section, 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20')}>
                <div className="overflow-hidden rounded-2xl">
                    <ResponsiveImage src="/assets/site/monastir-2-800.webp" alt={t('monoA.title')} sizes="(min-width: 1024px) 640px, 100vw" className="aspect-[4/3] w-full object-cover" />
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy-900">{t('about.title')}</p>
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
        <section id="faq" className={cx(section, 'grid scroll-mt-20 gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20')} aria-labelledby="home-faq">
            <h2 id="home-faq" className="text-[2rem] font-semibold leading-[1.1] text-ink lg:text-title-1">
                {t('faq.title')}
            </h2>
            <div className="divide-y divide-line border-y border-line">
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
        </section>
    );
}

// The page's one dark section.
function Closing() {
    const { t } = useLang();
    return (
        <section className="bg-navy-900 text-white" aria-labelledby="home-cta">
            <div className="mx-auto flex max-w-wide flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-24">
                <div className="max-w-2xl">
                    <h2 id="home-cta" className="text-[2rem] font-semibold leading-[1.1] lg:text-title-1">
                        {t('home.v2.ctaTitle')}
                    </h2>
                    <p className="mt-4 text-body-lg text-navy-100">{t('home.v2.ctaBody')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link prefetch={false} href="/quote" className={cx(pill, 'bg-white text-ink hover:bg-surface')}>
                        {t('home.v2.ctaButton')}
                    </Link>
                    <a href={CONTACT.phoneHref} className={cx(pill, 'border border-white/50 text-white hover:bg-white/10')}>
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
            <Brands />
            <About />
            <Faq />
            <Closing />
        </>
    );
}

// The closing band sits right above the footer: no gap between them.
HomePage.flushFooter = true;
