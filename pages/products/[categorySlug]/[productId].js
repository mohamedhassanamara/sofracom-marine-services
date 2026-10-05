import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '../../../components/Seo';
import ProductReviews from '../../../components/reviews/ProductReviews';
import { Breadcrumb, Button, Dialog, ProductRail, QuantityStepper, ResponsiveImage } from '../../../components/ui';
import { StockLine, defaultVariantIndex } from '../../../components/ui/ProductCard';
import { cx } from '../../../components/ui/cx';
import { CONTACT } from '../../../components/layout/SiteFooter';
import { ChevronDown, ChevronLeft, ChevronRight, FileText, Icon, MessageSquareText, Phone, ShoppingCart, Truck, ZoomIn } from '../../../components/ui/icons';
import { Stars } from '../../../components/ui/Stars';
import { useCart } from '../../../contexts/CartContext';
import { useLang } from '../../../contexts/LangContext';
import useAddToCart from '../../../hooks/useAddToCart';
import useFormat from '../../../hooks/useFormat';
import useProductStats from '../../../hooks/useProductStats';
import { DELIVERY_FEE } from '../../../lib/constants';
import { imageAt, photoClass } from '../../../lib/images';
import { localizeCategory, localizeProduct } from '../../../lib/localize';
import { cardProduct, getProductById, getProductPaths } from '../../../lib/products';
import { breadcrumbJsonLd, productJsonLd } from '../../../lib/seo';
import { langAttrs } from '../../../lib/i18n/locales';

export async function getStaticPaths({ locales = ['en'] }) {
    const paths = locales.flatMap(locale => getProductPaths().map(path => ({ params: { categorySlug: path.categorySlug, productId: path.productId }, locale })));
    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const entry = getProductById(params.productId);
    if (!entry || entry.category.slug !== params.categorySlug) {
        return { notFound: true };
    }
    const { getStatsSnapshot } = await import('../../../lib/server/statsSnapshot');
    const stats = (await getStatsSnapshot())[entry.product.id] || null;
    // Only the category's own fields (its product list would bloat every product page),
    // plus same-category products for "You may also need" (same brand first, in stock).
    const { products, ...category } = entry.category;
    const others = products.filter(product => product.id !== entry.product.id && product.stock !== 'out');
    const sameBrand = others.filter(product => product.brand && product.brand === entry.product.brand);
    const related = [...sameBrand, ...others.filter(product => !sameBrand.includes(product))].slice(0, 8);
    return {
        props: {
            product: entry.product,
            category: { ...category, products: [] },
            related: related.map(cardProduct),
            stats,
        },
        // Ratings in the structured data refresh hourly; the page itself is static.
        revalidate: 3600,
    };
}

// Main image (click to enlarge) and thumbnails; the lightbox steps through every photo.
function Gallery({ images, title }) {
    const { t } = useLang();
    const [active, setActive] = useState(0);
    const [zoom, setZoom] = useState(false);
    const current = images[active] || images[0];
    const step = delta => setActive(index => (index + delta + images.length) % images.length);
    return (
        <div>
            <button type="button" onClick={() => setZoom(true)} className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-surface" aria-label={`${t('product.zoom')}: ${title}`}>
                <ResponsiveImage key={current} src={current} alt={title} priority={active === 0} sizes="(min-width: 1320px) 700px, (min-width: 1024px) 55vw, 100vw" className={cx('h-full w-full object-contain p-[8%] transition-transform duration-base ease-out can-hover:group-hover:scale-[1.03]', photoClass(current))} />
                <span className="absolute bottom-4 end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-soft" aria-hidden="true">
                    <Icon as={ZoomIn} size={18} />
                </span>
            </button>
            {images.length > 1 && (
                <ul className="mt-4 flex flex-wrap gap-3" aria-label={t('product.images')}>
                    {images.map((src, index) => (
                        <li key={src}>
                            <button type="button" onClick={() => setActive(index)} aria-pressed={index === active} aria-label={t('product.imageN', { n: index + 1, total: images.length })} className={cx('block h-20 w-20 overflow-hidden rounded-xl bg-surface ring-offset-2 transition', index === active ? 'ring-2 ring-navy-900' : 'hover:ring-1 hover:ring-line-strong')}>
                                <img src={imageAt(src, 400)} alt="" loading="lazy" className={cx('h-full w-full object-contain p-2', photoClass(src))} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <Dialog open={zoom} onClose={() => setZoom(false)} title={title} size="xl" bodyClassName="p-0">
                <div className="relative bg-surface">
                    <ResponsiveImage src={current} alt={t('product.imageN', { n: active + 1, total: images.length })} sizes="90vw" className={cx('mx-auto max-h-[75dvh] w-full object-contain', photoClass(current))} />
                    {images.length > 1 && (
                        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
                            <button type="button" onClick={() => step(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft" aria-label={t('ui.previous')}>
                                <Icon as={ChevronLeft} size={20} flip />
                            </button>
                            <button type="button" onClick={() => step(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft" aria-label={t('ui.next')}>
                                <Icon as={ChevronRight} size={20} flip />
                            </button>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    );
}

// Options as chips with their price: a radio group (one tab stop, arrow keys move).
function OptionChips({ variants, value, onChange }) {
    const { t, lang } = useLang();
    const format = useFormat();
    const refs = useRef([]);
    const onKeyDown = event => {
        const rtl = lang === 'ar';
        const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = (value + step + variants.length) % variants.length;
        onChange(next);
        refs.current[next]?.focus();
    };
    return (
        <div className="mt-8">
            <p id="option-label" className="mb-3 text-sm text-ink-muted">
                {t('product.option')}: <span className="font-medium text-ink">{variants[value]?.label}</span>
            </p>
            <div role="radiogroup" aria-labelledby="option-label" className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
                {variants.map((variant, index) => {
                    const selected = index === value;
                    return (
                        <button
                            key={`${variant.label}-${index}`}
                            ref={el => (refs.current[index] = el)}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onChange(index)}
                            className={cx(
                                'flex min-h-[3rem] flex-col justify-center rounded-xl border px-4 py-2 text-start transition-colors duration-fast',
                                selected ? 'border-navy-900 bg-navy-50 ring-1 ring-navy-900' : 'border-line-input bg-white hover:border-navy-900',
                                variant.stock === 'out' && 'opacity-50'
                            )}
                        >
                            <span className={cx('text-sm text-ink', selected ? 'font-semibold' : 'font-medium')}>{variant.label}</span>
                            <span className="text-xs tabular-nums text-ink-muted">
                                <bdi>{format.price(variant.price)}</bdi>
                                {variant.stock !== 'in' && ` · ${t(`stock.${variant.stock}`)}`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Catalog descriptions were often hard-wrapped when typed: join a single line break that
// falls mid-sentence (no punctuation before it, a lowercase letter after); keep the rest
// (lists, one fact per line, paragraphs).
const unwrap = text => String(text).replace(/([^\s.!?:;])[ \t]*\n(?=[ \t]*[a-zà-ÿ(])/g, '$1 ');

// Beside the description on desktop (sticky), below it on phones: call or ask for a quote.
function AdviceCard({ quoteHref }) {
    const { t } = useLang();
    return (
        <aside aria-labelledby="advice-title" className="self-start rounded-2xl bg-surface p-6 lg:sticky lg:top-24 lg:p-7">
            <h2 id="advice-title" className="text-xl font-semibold text-ink">
                {t('product.advice.title')}
            </h2>
            <p className="mt-2 text-ink-muted">{t('product.advice.body')}</p>
            <div className="mt-5 flex flex-col gap-3">
                <a href={CONTACT.phoneHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-navy-900 px-6 text-[0.9375rem] font-semibold text-white transition-colors duration-fast hover:bg-navy-800">
                    <Icon as={Phone} size={18} />
                    <span>
                        {t('product.advice.call')} <bdi dir="ltr">{CONTACT.phone}</bdi>
                    </span>
                </a>
                <Button href={quoteHref} variant="accent" size="lg" icon={MessageSquareText}>
                    {t('nav.quote')}
                </Button>
            </div>
            <p className="mt-4 text-sm text-ink-muted">{t('contact.hours')}</p>
        </aside>
    );
}

// One open/close section below the fold (native <details>).
function Section({ id, title, defaultOpen = false, children }) {
    return (
        <details id={id} open={defaultOpen} className="group scroll-mt-24 border-b border-line">
            <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                <h2 className="text-xl font-semibold text-ink">{title}</h2>
                <Icon as={ChevronDown} size={22} className="shrink-0 transition-transform duration-fast group-open:rotate-180" />
            </summary>
            <div className="pb-8">{children}</div>
        </details>
    );
}

export default function ProductDetailPage({ product, category, related = [], stats = null }) {
    const { lang, t } = useLang();
    const format = useFormat();
    const { addProduct } = useCart();
    const addToCart = useAddToCart();
    const liveStats = useProductStats();
    // Stars only from real reviews: the live stats, else the build-time snapshot.
    const rating = liveStats[product.id] || stats;
    const localizedCategory = useMemo(() => localizeCategory(category, lang), [category, lang]);
    const localized = useMemo(() => localizeProduct(product, lang, category), [product, lang, category]);
    const localizedRelated = useMemo(() => related.map(item => localizeProduct(item, lang)), [related, lang]);
    const variants = localized.variants || [];
    const [variantIndex, setVariantIndex] = useState(() => defaultVariantIndex(product));
    const [quantity, setQuantity] = useState(1);
    const [showSticky, setShowSticky] = useState(false);
    const buyBox = useRef(null);

    const variant = variants[variantIndex] || null;
    const price = variant?.price ?? localized.price ?? 0;
    const stock = variant?.stock ?? localized.stock ?? 'in';
    const description = localized.description || '';
    const productPath = `/products/${category.slug}/${product.id}`;
    const metaDescription = (description || `${localized.title} ${localized.brand || ''}`).replace(/\s+/g, ' ').slice(0, 155);

    // The mobile buy bar appears once the main Add to cart button has scrolled away.
    useEffect(() => {
        let frame = 0;
        const check = () => {
            frame = 0;
            const box = buyBox.current?.getBoundingClientRect();
            setShowSticky(Boolean(box) && box.bottom < 0);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(check);
        };
        check();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            cancelAnimationFrame(frame);
        };
    }, []);

    const add = () => {
        if (stock === 'out') return;
        addProduct(localized, variant, variant ? variantIndex : null, { quantity });
    };
    const quoteHref = `/quote?product=${encodeURIComponent(product.id)}`;
    const hasSpecs = localized.usage.length > 0 || variants.length > 0;

    return (
        <>
            <Seo
                title={[localized.title, localized.brand].filter(Boolean).join(' · ')}
                description={metaDescription}
                path={productPath}
                image={localized.images[0]}
                type="product"
                jsonLd={[
                    productJsonLd({ product: { ...localized, categoryName: localizedCategory.name }, path: productPath, locale: lang, stats }),
                    breadcrumbJsonLd(
                        [
                            { name: t('nav.products'), path: '/products' },
                            { name: localizedCategory.name, path: `/products/${category.slug}` },
                            { name: localized.title, path: productPath },
                        ],
                        lang
                    ),
                ]}
            />
            <div className="mx-auto max-w-wide px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
                <Breadcrumb items={[{ label: t('nav.products'), href: '/products' }, { label: localizedCategory.name, href: `/products/${category.slug}` }, { label: localized.title }]} />

                <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
                    <Gallery images={localized.images} title={localized.title} />

                    <div className="lg:sticky lg:top-24 lg:self-start">
                        {localized.brand && (
                            <Link prefetch={false} href={`/products/${category.slug}?brand=${encodeURIComponent(localized.brand)}`} className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted hover:text-ink">
                                {localized.brand}
                            </Link>
                        )}
                        <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] text-ink lg:text-title-1" {...langAttrs(localized.contentLang.title, lang)}>
                            {localized.title}
                        </h1>
                        {rating?.count > 0 && (
                            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
                                <Stars value={rating.avg} size="sm" />
                                <span>
                                    {Number(rating.avg).toFixed(1)} · {t('ui.reviewsCount', { count: rating.count })}
                                </span>
                            </a>
                        )}
                        <p className="mt-6 text-[1.75rem] font-semibold tabular-nums text-ink">
                            <bdi>{format.price(price)}</bdi>
                        </p>

                        {variants.length > 1 && <OptionChips variants={variants} value={variantIndex} onChange={setVariantIndex} />}

                        <div className="mt-6 text-sm">
                            {stock === 'in' ? (
                                <p className="inline-flex items-center gap-1.5 font-medium text-ink">
                                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success-600" />
                                    {t('stock.in')}
                                </p>
                            ) : (
                                <>
                                    <StockLine stock={stock} className="text-sm" />
                                    <p className="mt-1 text-ink-muted">{t(stock === 'out' ? 'product.outNote' : 'product.onOrderNote')}</p>
                                </>
                            )}
                        </div>

                        <div ref={buyBox} className="mt-6 flex flex-wrap gap-3">
                            <QuantityStepper value={quantity} onChange={setQuantity} size="lg" />
                            <Button size="lg" icon={ShoppingCart} onClick={add} disabled={stock === 'out'} className="h-14 min-w-[12rem] flex-1 text-base">
                                {t('ui.addToCart')}
                            </Button>
                        </div>
                        <Button href={quoteHref} variant="secondary" size="lg" icon={MessageSquareText} fullWidth className="mt-3 h-14 text-base">
                            {t('product.askQuote')}
                        </Button>
                        <p className="mt-6 flex items-center gap-3 border-t border-line pt-6 text-sm text-ink">
                            <Icon as={Truck} size={20} className="shrink-0 text-navy-900" />
                            {t('product.deliveryRow', { fee: format.price(DELIVERY_FEE) })}
                        </p>
                    </div>
                </div>

                <div className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
                <div className="border-t border-line">
                    {description && (
                        <Section id="description" title={t('product.description')} defaultOpen>
                            <div className="whitespace-pre-line text-body-lg leading-relaxed text-ink-muted" {...langAttrs(localized.contentLang.description, lang)}>
                                {unwrap(description)}
                            </div>
                        </Section>
                    )}
                    {hasSpecs && (
                        <Section id="specifications" title={t('product.specs')}>
                            {localized.usage.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="font-sans text-sm font-medium tracking-normal text-ink-muted">{t('product.uses')}</h3>
                                    <ul className="mt-3 flex flex-wrap gap-2">
                                        {localized.usage.map(tag => (
                                            <li key={tag} className="rounded-full bg-surface px-3.5 py-1.5 text-sm text-ink">
                                                {tag}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {variants.length > 0 && (
                                <table className="w-full text-sm">
                                    <caption className="sr-only">{t('product.optionsTable')}</caption>
                                    <thead className="text-ink-muted">
                                        <tr className="border-b border-line">
                                            <th scope="col" className="py-3 pe-4 text-start font-medium">
                                                {t('product.option')}
                                            </th>
                                            <th scope="col" className="py-3 pe-4 text-start font-medium">
                                                {t('product.price')}
                                            </th>
                                            <th scope="col" className="py-3 text-start font-medium">
                                                {t('product.availability')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {variants.map((item, index) => (
                                            <tr key={`${item.label}-${index}`}>
                                                <th scope="row" className="py-3 pe-4 text-start font-medium text-ink">
                                                    {item.label}
                                                </th>
                                                <td className="py-3 pe-4 tabular-nums text-ink">
                                                    <bdi>{format.price(item.price)}</bdi>
                                                </td>
                                                <td className="py-3 text-ink">{t(`stock.${item.stock}`)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Section>
                    )}
                    {localized.datasheet && (
                        <Section id="datasheet" title={t('product.datasheet')}>
                            <Button href={localized.datasheet} variant="secondary" icon={FileText} target="_blank" rel="noreferrer">
                                {t('product.datasheet')} (PDF)
                            </Button>
                        </Section>
                    )}
                </div>
                <AdviceCard quoteHref={quoteHref} />
                </div>

                <ProductReviews productId={product.id} productTitle={localized.title} />

                {localizedRelated.length > 0 && (
                    <section className="mt-20 lg:mt-28" aria-labelledby="related">
                        <h2 id="related" className="text-[1.75rem] font-semibold text-ink lg:text-title-2">
                            {t('product.youMayNeed')}
                        </h2>
                        <ProductRail className="mt-2" products={localizedRelated} stats={liveStats} onQuickAdd={addToCart} label={t('product.youMayNeed')} />
                    </section>
                )}
            </div>

            <div className={cx('fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur transition-transform duration-base lg:hidden', showSticky ? 'translate-y-0' : 'translate-y-full')} aria-hidden={!showSticky} inert={!showSticky}>
                <div className="mx-auto flex max-w-wide items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{localized.title}</p>
                        <p className="text-sm font-semibold tabular-nums text-ink">
                            <bdi>{format.price(price)}</bdi>
                        </p>
                    </div>
                    <Button href={quoteHref} variant="secondary" icon={MessageSquareText} label={t('product.askQuote')} />
                    <Button icon={ShoppingCart} onClick={add} disabled={stock === 'out'}>
                        {t('ui.addToCart')}
                    </Button>
                </div>
            </div>
        </>
    );
}
