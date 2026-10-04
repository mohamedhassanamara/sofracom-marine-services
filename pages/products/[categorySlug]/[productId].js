import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '../../../components/Seo';
import ProductReviews from '../../../components/reviews/ProductReviews';
import { Badge, Breadcrumb, Button, Price, ProductCard, QuantityStepper, RatingSummary, ResponsiveImage, StockBadge } from '../../../components/ui';
import { defaultVariantIndex } from '../../../components/ui/ProductCard';
import { cx } from '../../../components/ui/cx';
import { AlertTriangle, FileText, Icon, Info, MessageSquareText, ShoppingCart, Truck } from '../../../components/ui/icons';
import { useCart } from '../../../contexts/CartContext';
import { useLang } from '../../../contexts/LangContext';
import useAddToCart from '../../../hooks/useAddToCart';
import useProductStats from '../../../hooks/useProductStats';
import { imageAt } from '../../../lib/images';
import { localizeCategory, localizeProduct } from '../../../lib/localize';
import { cardProduct, getProductById, getProductPaths } from '../../../lib/products';
import { breadcrumbJsonLd, productJsonLd } from '../../../lib/seo';

export async function getStaticPaths({ locales = ['en'] }) {
    const paths = locales.flatMap(locale =>
        getProductPaths().map(path => ({
            params: {
                categorySlug: path.categorySlug,
                productId: path.productId,
            },
            locale,
        }))
    );
    return {
        paths,
        fallback: false,
    };
}

export async function getStaticProps({ params }) {
    const entry = getProductById(params.productId);
    if (!entry || entry.category.slug !== params.categorySlug) {
        return { notFound: true };
    }
    const { getStatsSnapshot } = await import('../../../lib/server/statsSnapshot');
    const stats = (await getStatsSnapshot())[entry.product.id] || null;
    // Only the category's own fields (its product list would bloat every product page),
    // plus a few related products for the bottom of the page.
    const { products, ...category } = entry.category;
    const others = products.filter(product => product.id !== entry.product.id);
    const sameBrand = others.filter(product => product.brand && product.brand === entry.product.brand);
    const related = [...sameBrand, ...others.filter(product => !sameBrand.includes(product))].filter(product => product.stock !== 'out').slice(0, 4);
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

const READ_MORE_LENGTH = 600;

function Gallery({ images, title }) {
    const { t } = useLang();
    const [active, setActive] = useState(0);
    const current = images[active] || images[0];
    return (
        <div className="flex flex-col gap-3">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                <ResponsiveImage key={current} src={current} alt={title} priority={active === 0} sizes="(min-width: 1024px) 600px, 100vw" className="h-full w-full object-contain p-6" />
            </div>
            {images.length > 1 && (
                <ul className="flex flex-wrap gap-2" aria-label={t('product.images')}>
                    {images.map((src, index) => (
                        <li key={src}>
                            <button
                                type="button"
                                onClick={() => setActive(index)}
                                aria-pressed={index === active}
                                aria-label={t('product.imageN', { n: index + 1, total: images.length })}
                                className={cx('h-20 w-20 overflow-hidden rounded-md border-2 bg-white p-1 transition-colors duration-fast', index === active ? 'border-navy-900' : 'border-slate-200 hover:border-slate-400')}
                            >
                                <img src={imageAt(src, 400)} alt="" loading="lazy" className="h-full w-full object-contain" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Options as chips: a radio group (one tab stop, arrow keys move) with label and price.
function OptionChips({ variants, value, onChange }) {
    const { t, lang } = useLang();
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
        <div>
            <p id="option-label" className="mb-2 text-sm font-semibold text-slate-900">
                {t('product.option')}: <span className="font-normal text-slate-700">{variants[value]?.label}</span>
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
                                'flex min-h-[2.75rem] flex-col items-start justify-center rounded-md border-2 px-3 py-1.5 text-start transition-colors duration-fast',
                                selected ? 'border-navy-900 bg-navy-50' : 'border-slate-300 bg-white hover:border-slate-400',
                                variant.stock === 'out' && 'opacity-60'
                            )}
                        >
                            <span className="text-sm font-semibold text-slate-900">{variant.label}</span>
                            <span className="text-xs text-slate-600">
                                <Price value={variant.price} size="sm" className="!text-xs !font-normal !text-slate-600" />
                                {variant.stock !== 'in' && ` · ${t(`stock.${variant.stock}`)}`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function ProductDetailPage({ product, category, related = [], stats = null }) {
    const { lang, t } = useLang();
    const { addProduct } = useCart();
    const addToCart = useAddToCart();
    const liveStats = useProductStats();
    const rating = liveStats[product.id] || stats;
    const localizedCategory = useMemo(() => localizeCategory(category, lang), [category, lang]);
    const localized = useMemo(() => localizeProduct(product, lang, category), [product, lang, category]);
    const variants = localized.variants || [];
    const [variantIndex, setVariantIndex] = useState(() => defaultVariantIndex(product));
    const [quantity, setQuantity] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const [showSticky, setShowSticky] = useState(false);
    const buyBox = useRef(null);

    const variant = variants[variantIndex] || null;
    const price = variant?.price ?? localized.price ?? 0;
    const stock = variant?.stock ?? localized.stock ?? 'in';
    const description = localized.description || '';
    const longDescription = description.length > READ_MORE_LENGTH;
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
            <div className="mx-auto max-w-container px-4 pb-28 pt-6 sm:px-6 lg:pb-8">
                <Breadcrumb items={[{ label: t('nav.products'), href: '/products' }, { label: localizedCategory.name, href: `/products/${category.slug}` }, { label: localized.title }]} />

                <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
                    <Gallery images={localized.images} title={localized.title} />

                    <div className="flex flex-col gap-5">
                        <div>
                            {localized.brand && (
                                <Link href={`/products/${category.slug}?brand=${encodeURIComponent(localized.brand)}`} className="text-sm font-semibold uppercase tracking-wide text-accent-700 hover:underline">
                                    {localized.brand}
                                </Link>
                            )}
                            <h1 className="mt-1 text-2xl font-bold leading-tight text-navy-900 sm:text-3xl">{localized.title}</h1>
                            {rating?.count > 0 && (
                                <a href="#reviews" className="mt-2 inline-block hover:underline">
                                    <RatingSummary stats={rating} size="md" />
                                </a>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Price value={price} size="xl" className="!text-3xl" />
                            <StockBadge stock={stock} />
                        </div>
                        {stock === 'on-order' && (
                            <p className="flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-800">
                                <Icon as={Info} size={18} className="mt-0.5" />
                                {t('product.onOrderNote')}
                            </p>
                        )}
                        {stock === 'out' && (
                            <p className="flex items-start gap-2 rounded-md bg-danger-50 p-3 text-sm text-danger-800">
                                <Icon as={AlertTriangle} size={18} className="mt-0.5" />
                                {t('product.outNote')}
                            </p>
                        )}

                        {variants.length > 1 && <OptionChips variants={variants} value={variantIndex} onChange={setVariantIndex} />}

                        <div ref={buyBox} className="flex flex-wrap items-center gap-3">
                            <QuantityStepper value={quantity} onChange={setQuantity} />
                            <Button size="lg" icon={ShoppingCart} onClick={add} disabled={stock === 'out'} className="min-w-[12rem] flex-1">
                                {t('ui.addToCart')}
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button href={quoteHref} variant="secondary" icon={MessageSquareText}>
                                {t('product.askQuote')}
                            </Button>
                            {localized.datasheet && (
                                <Button href={localized.datasheet} variant="ghost" icon={FileText} target="_blank" rel="noreferrer">
                                    {t('product.datasheet')}
                                </Button>
                            )}
                        </div>
                        <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
                            <Icon as={Truck} size={18} className="mt-0.5 text-navy-700" />
                            {t('product.delivery')}
                        </p>
                    </div>
                </div>

                <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
                    <section aria-labelledby="product-description">
                        <h2 id="product-description" className="text-xl font-semibold text-navy-900">
                            {t('product.description')}
                        </h2>
                        {description && (
                            <div className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">
                                {expanded || !longDescription ? description : `${description.slice(0, READ_MORE_LENGTH)}…`}
                            </div>
                        )}
                        {longDescription && (
                            <button type="button" className="mt-2 font-semibold text-accent-700 hover:underline" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
                                {expanded ? t('product.showLess') : t('product.readMore')}
                            </button>
                        )}
                        {localized.usage.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-slate-900">{t('product.uses')}</h3>
                                <ul className="mt-2 flex flex-wrap gap-2">
                                    {localized.usage.map(tag => (
                                        <li key={tag}>
                                            <Badge tone="primary">{tag}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                    {variants.length > 0 && (
                        <section aria-labelledby="product-options">
                            <h2 id="product-options" className="text-xl font-semibold text-navy-900">
                                {t('product.optionsTable')}
                            </h2>
                            <table className="mt-3 w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
                                <thead className="bg-slate-50 text-start text-slate-600">
                                    <tr>
                                        <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                                            {t('product.option')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                                            {t('product.price')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                                            {t('product.availability')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {variants.map((item, index) => (
                                        <tr key={`${item.label}-${index}`}>
                                            <th scope="row" className="px-4 py-2.5 text-start font-medium text-slate-900">
                                                {item.label}
                                            </th>
                                            <td className="px-4 py-2.5">
                                                <Price value={item.price} size="sm" />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <StockBadge stock={item.stock} size="sm" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}
                </div>

                <div id="reviews" className="scroll-mt-32">
                    <ProductReviews productId={product.id} productTitle={localized.title} />
                </div>

                {related.length > 0 && (
                    <section className="mt-16" aria-labelledby="related">
                        <h2 id="related" className="mb-6 text-xl font-semibold text-navy-900">
                            {t('product.related', { category: localizedCategory.name })}
                        </h2>
                        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                            {related.map(item => (
                                <li key={item.id} className="flex">
                                    <ProductCard product={localizeProduct(item, lang)} stats={liveStats[item.id]} onQuickAdd={addToCart} className="w-full" />
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <div
                className={cx(
                    'fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur transition-transform duration-base lg:hidden',
                    showSticky ? 'translate-y-0' : 'translate-y-full'
                )}
                aria-hidden={!showSticky}
                inert={!showSticky}
            >
                <div className="mx-auto flex max-w-container items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{localized.title}</p>
                        <Price value={price} size="md" />
                    </div>
                    <Button icon={ShoppingCart} onClick={add} disabled={stock === 'out'}>
                        {t('ui.addToCart')}
                    </Button>
                </div>
            </div>
        </>
    );
}
