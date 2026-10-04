import Link from 'next/link';
import { useMemo } from 'react';
import Seo from '../components/Seo';
import { CONTACT } from '../components/layout/SiteFooter';
import { Button, ProductCard, ResponsiveImage } from '../components/ui';
import { cx } from '../components/ui/cx';
import { Anchor, ArrowRight, Check, ChevronDown, Icon, Mail, MapPin, MessageSquareText, Paintbrush, Phone, Ship, ShoppingCart, Sparkles, Wrench, Zap } from '../components/ui/icons';
import { useLang } from '../contexts/LangContext';
import useAddToCart from '../hooks/useAddToCart';
import useProductStats from '../hooks/useProductStats';
import { localizeCategory, localizeProduct } from '../lib/localize';
import { cardCategory, cardProduct, featuredProducts, getCategories } from '../lib/products';
import { localBusinessJsonLd } from '../lib/seo';

export function getStaticProps() {
    const categories = getCategories();
    return {
        props: {
            categories: categories.map(cardCategory),
            featured: featuredProducts(categories, 8).map(cardProduct),
        },
    };
}

const BRANDS = ['jotun', 'hempel', 'international', 'akzonobel', 'sika', 'crown', 'varta', 'bosch'];

export const SERVICES = [
    { key: 'antifouling', icon: Paintbrush },
    { key: 'gelcoat', icon: Sparkles },
    { key: 'deck', icon: Anchor },
    { key: 'electrical', icon: Zap },
    { key: 'polishing', icon: Wrench },
    { key: 'haulout', icon: Ship },
];

// Placeholder testimonials kept at the owner's request until real ones are collected.
const TESTIMONIALS = [1, 2, 3];
const FAQ = [1, 2, 3, 4, 5];

function SectionHeading({ id, title, subtitle, action, align = 'start' }) {
    return (
        <div className={cx('mb-8 flex flex-wrap items-end justify-between gap-4', align === 'center' && 'flex-col items-center text-center')}>
            <div className="max-w-2xl">
                <h2 id={id} className="text-2xl font-bold text-navy-900 sm:text-3xl">
                    {title}
                </h2>
                {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

function Hero() {
    const { t } = useLang();
    return (
        <section className="relative isolate overflow-hidden bg-navy-950 text-white">
            <ResponsiveImage src="/assets/site/hero-800.webp" alt="" sizes="100vw" priority className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/10 rtl:bg-gradient-to-l" aria-hidden="true" />
            <div className="mx-auto flex min-h-[32rem] max-w-container flex-col justify-center px-4 py-16 sm:px-6 lg:min-h-[36rem]">
                <p className="text-sm font-semibold uppercase tracking-widest text-accent-300">{t('home.hero.eyebrow')}</p>
                <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{t('hero.title')}</h1>
                <p className="mt-4 max-w-xl text-lg text-navy-100">{t('hero.subtitle')}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Button href="/products" variant="accent" size="lg" icon={ShoppingCart}>
                        {t('home.hero.shop')}
                    </Button>
                    <Button href="/quote" variant="inverse" size="lg" icon={MessageSquareText}>
                        {t('nav.quote')}
                    </Button>
                </div>
                <ul className="mt-10 grid max-w-3xl gap-3 text-sm text-navy-100 sm:grid-cols-3">
                    {[1, 2, 3].map(n => (
                        <li key={n} className="flex items-start gap-2">
                            <Icon as={Check} size={18} className="mt-0.5 text-accent-300" />
                            {t(`home.hero.point${n}`)}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function Categories({ categories }) {
    const { t, lang } = useLang();
    return (
        <section className="mx-auto max-w-container px-4 py-16 sm:px-6" aria-labelledby="home-categories">
            <SectionHeading
                id="home-categories"
                title={t('home.categories.title')}
                subtitle={t('home.categories.subtitle')}
                action={
                    <Link href="/products" className="inline-flex items-center gap-1.5 font-semibold text-accent-700 hover:underline">
                        {t('header.allProducts')}
                        <Icon as={ArrowRight} size={18} flip />
                    </Link>
                }
            />
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {categories.map(raw => {
                    const category = localizeCategory(raw, lang);
                    return (
                        <li key={category.slug}>
                            <Link href={`/products/${category.slug}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow duration-base hover:shadow-md">
                                <span className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
                                    <ResponsiveImage src={category.image} alt="" sizes="(min-width: 1024px) 400px, 50vw" className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]" />
                                </span>
                                <span className="flex flex-1 items-center justify-between gap-2 p-3 sm:p-4">
                                    <span>
                                        <span className="block font-semibold text-slate-900">{category.name}</span>
                                        <span className="text-sm text-slate-600">{t('header.productsCount', { count: raw.count })}</span>
                                    </span>
                                    <Icon as={ArrowRight} size={18} flip className="text-navy-700" />
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
        <section className="bg-slate-100 py-16" aria-labelledby="home-featured">
            <div className="mx-auto max-w-container px-4 sm:px-6">
                <SectionHeading
                    id="home-featured"
                    title={t('home.featured.title')}
                    subtitle={t('home.featured.subtitle')}
                    action={
                        <Button href="/products" variant="secondary" iconEnd={ArrowRight} iconFlip>
                            {t('home.featured.all')}
                        </Button>
                    }
                />
                <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {localized.map(product => (
                        <li key={product.id} className="flex">
                            <ProductCard product={product} stats={stats[product.id]} onQuickAdd={addToCart} className="w-full" />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function Services() {
    const { t } = useLang();
    return (
        <section id="services" className="mx-auto max-w-container scroll-mt-32 px-4 py-16 sm:px-6" aria-labelledby="home-services">
            <SectionHeading
                id="home-services"
                title={t('services.title')}
                subtitle={t('home.services.subtitle')}
                action={
                    <Button href="/quote" variant="primary" icon={MessageSquareText}>
                        {t('nav.quote')}
                    </Button>
                }
            />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SERVICES.map(service => (
                    <li key={service.key} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" data-animate>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700">
                            <Icon as={service.icon} size={22} />
                        </span>
                        <span>
                            <h3 className="font-semibold text-slate-900">{t(`home.service.${service.key}.title`)}</h3>
                            <p className="mt-1 text-sm text-slate-600">{t(`home.service.${service.key}.body`)}</p>
                            <Link href={`/quote?service=${service.key}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline">
                                {t('nav.quote')}
                                <Icon as={ArrowRight} size={14} flip />
                            </Link>
                        </span>
                    </li>
                ))}
            </ul>
            <div className="mt-12 rounded-xl bg-navy-900 p-6 text-white sm:p-8" data-animate>
                <h3 className="text-xl font-semibold">{t('home.how.title')}</h3>
                <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(step => (
                        <li key={step} className="flex gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-400 font-bold text-navy-950" aria-hidden="true">
                                {step}
                            </span>
                            <span>
                                <span className="block font-semibold">{t(`home.how.step${step}.title`)}</span>
                                <span className="mt-1 block text-sm text-navy-100">{t(`home.how.step${step}.body`)}</span>
                            </span>
                        </li>
                    ))}
                </ol>
                <Button href="/quote" variant="accent" className="mt-8" icon={MessageSquareText}>
                    {t('nav.quote')}
                </Button>
            </div>
        </section>
    );
}

function Brands() {
    const { t } = useLang();
    return (
        <section id="brands" className="scroll-mt-32 border-y border-slate-200 bg-white py-12" aria-labelledby="home-brands">
            <div className="mx-auto max-w-container px-4 sm:px-6">
                <SectionHeading id="home-brands" align="center" title={t('brands.title')} subtitle={t('brands.subtitle')} />
                <ul className="grid grid-cols-4 items-center gap-6 sm:grid-cols-8">
                    {BRANDS.map(brand => (
                        <li key={brand} className="flex justify-center">
                            <img src={`/assets/brands/${brand}-400.webp`} alt={brand.toUpperCase()} loading="lazy" width="96" height="64" className="h-12 w-auto max-w-full object-contain opacity-80 grayscale transition duration-base hover:opacity-100 hover:grayscale-0 sm:h-14" />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function Location() {
    const { t } = useLang();
    return (
        <section id="about" className="mx-auto grid max-w-container scroll-mt-32 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2" aria-labelledby="home-about">
            <div className="relative overflow-hidden rounded-xl" data-animate>
                <ResponsiveImage src="/assets/site/monastir-1-800.webp" alt={t('monoA.title')} sizes="(min-width: 1024px) 600px, 100vw" className="aspect-[16/9] w-full object-cover" />
                <p className="absolute bottom-3 start-3 rounded-md bg-navy-950/80 px-3 py-1.5 text-sm text-white">
                    {t('monoB.title')} · {t('monoB.subtitle')}
                </p>
            </div>
            <div data-animate>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">{t('about.title')}</p>
                <h2 id="home-about" className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">
                    {t('home.location.title')}
                </h2>
                <p className="mt-4 text-slate-700">{t('home.location.body')}</p>
                <ul className="mt-6 space-y-3">
                    {[1, 2, 3, 4].map(n => (
                        <li key={n} className="flex items-start gap-3 text-slate-800">
                            <Icon as={Check} size={20} className="mt-0.5 text-success-700" />
                            {t(`home.location.fact${n}`)}
                        </li>
                    ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Button href={CONTACT.mapsHref} variant="secondary" icon={MapPin} target="_blank" rel="noreferrer">
                        {t('footer.directions')}
                    </Button>
                    <Button href="/quote" variant="primary" icon={MessageSquareText}>
                        {t('nav.quote')}
                    </Button>
                </div>
            </div>
        </section>
    );
}

function Testimonials() {
    const { t } = useLang();
    return (
        <section className="bg-slate-100 py-16" aria-labelledby="home-testimonials">
            <div className="mx-auto max-w-container px-4 sm:px-6">
                <SectionHeading id="home-testimonials" align="center" title={t('testimonials.title')} />
                <ul className="grid gap-4 md:grid-cols-3">
                    {TESTIMONIALS.map(n => (
                        <li key={n}>
                            <figure className="h-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                                <blockquote className="text-slate-800">“{t(`home.testimonial${n}.quote`)}”</blockquote>
                                <figcaption className="mt-4 text-sm font-medium text-slate-600">{t(`home.testimonial${n}.author`)}</figcaption>
                            </figure>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function Faq() {
    const { t } = useLang();
    return (
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-32 px-4 py-16 sm:px-6" aria-labelledby="home-faq">
            <h2 id="home-faq" className="mb-6 text-2xl font-bold text-navy-900 sm:text-3xl">
                {t('faq.title')}
            </h2>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {FAQ.map(n => (
                    <details key={n} className="group">
                        <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                            {t(`faq.q${n}`)}
                            <Icon as={ChevronDown} size={20} className="shrink-0 text-slate-500 transition-transform duration-fast group-open:rotate-180" />
                        </summary>
                        <p className="px-5 pb-5 text-slate-700">{t(`faq.a${n}`)}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}

function Contact() {
    const { t } = useLang();
    return (
        <section id="contact" className="mx-auto max-w-container scroll-mt-32 px-4 sm:px-6" aria-labelledby="home-contact">
            <div className="grid gap-8 overflow-hidden rounded-xl bg-navy-900 p-6 text-white sm:p-10 lg:grid-cols-[1.3fr_1fr]">
                <div>
                    <h2 id="home-contact" className="text-2xl font-bold sm:text-3xl">
                        {t('contact.title')}
                    </h2>
                    <p className="mt-3 max-w-xl text-navy-100">{t('contact.lead')}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button href="/quote" variant="accent" size="lg" icon={MessageSquareText}>
                            {t('nav.quote')}
                        </Button>
                        <Button href={CONTACT.phoneHref} variant="inverse" size="lg" icon={Phone}>
                            {t('contact.call')}
                        </Button>
                        <Button href={`mailto:${CONTACT.email}`} variant="inverse" size="lg" icon={Mail}>
                            {t('contact.emailUs')}
                        </Button>
                    </div>
                </div>
                <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                        <dt className="font-semibold text-white">{t('contact.address1')}</dt>
                        <dd className="text-navy-100">{t('contact.address2')}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-white">{t('footer.phone')}</dt>
                        <dd className="text-navy-100">
                            <a href={CONTACT.phoneHref} className="hover:underline">
                                <bdi dir="ltr">{CONTACT.phone}</bdi>
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-white">{t('footer.email')}</dt>
                        <dd className="text-navy-100">
                            <a href={`mailto:${CONTACT.email}`} className="hover:underline">
                                {CONTACT.email}
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt className="sr-only">{t('contact.hours')}</dt>
                        <dd className="text-navy-100">{t('contact.hours')}</dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}

export default function HomePage({ categories, featured }) {
    const { t, lang } = useLang();
    return (
        <>
            <Seo title={t('seo.home.title')} description={t('seo.home.description')} path="/" jsonLd={localBusinessJsonLd(lang)} />
            <Hero />
            <Categories categories={categories} />
            <Featured products={featured} />
            <Services />
            <Brands />
            <Location />
            <Testimonials />
            <Faq />
            <Contact />
        </>
    );
}
