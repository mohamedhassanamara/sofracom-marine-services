import Link from 'next/link';
import { useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import useFormat from '../../hooks/useFormat';
import { DELIVERY_FEE } from '../../lib/constants';
import { langAttrs } from '../../lib/i18n/locales';
import Dialog from '../ui/Dialog';
import { cx } from '../ui/cx';
import { ChevronLeft, ChevronRight, Icon, MessageSquareText, Minus, Plus, ShoppingCart, Truck, ZoomIn } from '../ui/icons';
import ResponsiveImage from '../ui/ResponsiveImage';
import { Stars } from '../ui/Stars';
import { defaultVariantIndex } from '../ui/ProductCard';
import { StockLine } from './ProductCardV2';
import { pill } from './HeroV2';

// − n + as one pill, 56 px tall like the Add to cart button next to it.
function PillStepper({ value, onChange, min = 1, max = 99 }) {
    const { t } = useLang();
    const clamp = n => Math.max(min, Math.min(max, Math.round(Number(n) || min)));
    const button = 'flex h-14 w-12 items-center justify-center rounded-full text-ink hover:bg-surface disabled:text-ink-muted disabled:hover:bg-transparent';
    return (
        <div role="group" aria-label={t('ui.quantity')} className="inline-flex h-14 items-center rounded-full border border-line-strong px-1">
            <button type="button" className={button} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={t('ui.decrease')}>
                <Icon as={Minus} size={16} />
            </button>
            <input type="number" inputMode="numeric" min={min} max={max} value={value} onChange={event => onChange(clamp(event.target.value))} aria-label={t('ui.quantity')} className="w-10 bg-transparent text-center text-base font-semibold tabular-nums text-ink [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none" />
            <button type="button" className={button} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={t('ui.increase')}>
                <Icon as={Plus} size={16} />
            </button>
        </div>
    );
}

// v2 product page, above the fold (design lab): large gallery (click to enlarge) and a
// sticky info column: brand, title, rating, price, option chips with their price, stock,
// quantity + Add to cart, Ask for a quote, delivery line.
export default function ProductTopV2({ product, stats, onAdd }) {
    const { t, lang } = useLang();
    const format = useFormat();
    const images = (product.images?.length ? product.images : [product.image]).filter(Boolean);
    const [active, setActive] = useState(0);
    const [zoom, setZoom] = useState(false);
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const [variantIndex, setVariantIndex] = useState(defaultVariantIndex(product));
    const [quantity, setQuantity] = useState(1);
    const variant = variants[variantIndex] || null;
    const price = variant ? variant.price : product.price;
    const stock = variant ? variant.stock : product.stock;
    const step = delta => setActive(index => (index + delta + images.length) % images.length);

    return (
        <div className="mx-auto grid max-w-wide gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16 lg:py-12">
            <div>
                <button type="button" onClick={() => setZoom(true)} className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-surface" aria-label={t('product.zoom')}>
                    <ResponsiveImage src={images[active]} alt={product.title} sizes="(min-width: 1024px) 55vw, 100vw" priority className="h-full w-full object-contain p-[8%] mix-blend-multiply transition-transform duration-base ease-out group-hover:scale-[1.03]" />
                    <span className="absolute bottom-4 end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-soft" aria-hidden="true">
                        <Icon as={ZoomIn} size={18} />
                    </span>
                </button>
                {images.length > 1 && (
                    <ul className="mt-4 flex gap-3" aria-label={t('product.images')}>
                        {images.map((src, index) => (
                            <li key={src}>
                                <button type="button" onClick={() => setActive(index)} aria-pressed={index === active} aria-label={t('product.imageN', { n: index + 1, total: images.length })} className={cx('block h-20 w-20 overflow-hidden rounded-xl bg-surface ring-offset-2 transition', index === active ? 'ring-2 ring-ink' : 'hover:ring-1 hover:ring-line-strong')}>
                                    <ResponsiveImage src={src} alt="" sizes="80px" className="h-full w-full object-contain p-2 mix-blend-multiply" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
                {product.brand && (
                    <Link prefetch={false} href={`/products/${product.categorySlug}?brand=${encodeURIComponent(product.brand)}`} className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted hover:text-ink">
                        {product.brand}
                    </Link>
                )}
                <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] text-ink lg:text-title-1" {...langAttrs(product.contentLang?.title || 'en', lang)}>
                    {product.title}
                </h1>
                {stats?.count > 0 && (
                    <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
                        <Stars value={stats.avg} size="sm" />
                        <span>
                            {Number(stats.avg).toFixed(1)} · {t('ui.reviewsCount', { count: stats.count })}
                        </span>
                    </a>
                )}
                <p className="mt-6 text-[1.75rem] font-semibold tabular-nums text-ink">
                    <bdi>{format.price(price)}</bdi>
                </p>

                {variants.length > 1 && (
                    <fieldset className="mt-8">
                        <legend className="mb-3 text-sm font-medium text-ink">{t('product.option')}</legend>
                        <div className="flex flex-wrap gap-2">
                            {variants.map((option, index) => (
                                <label key={`${option.label}-${index}`} className={cx('relative flex min-h-[3rem] cursor-pointer flex-col justify-center rounded-xl border px-4 py-2 text-start transition-colors duration-fast has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-600', index === variantIndex ? 'border-ink bg-white' : 'border-line hover:border-line-strong', option.stock === 'out' && 'opacity-50')}>
                                    <input type="radio" name="v2-option" className="sr-only" checked={index === variantIndex} onChange={() => setVariantIndex(index)} />
                                    <span className="text-sm font-medium text-ink">{option.label}</span>
                                    <span className="text-xs tabular-nums text-ink-muted">{option.stock === 'out' ? t('stock.out') : <bdi>{format.price(option.price)}</bdi>}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                <div className="mt-6 flex items-center gap-2 text-sm">
                    {stock === 'in' ? (
                        <p className="inline-flex items-center gap-1.5 font-medium text-ink">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success-600" />
                            {t('stock.in')}
                        </p>
                    ) : (
                        <StockLine stock={stock} className="text-sm" />
                    )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <PillStepper value={quantity} onChange={setQuantity} />
                    <button type="button" disabled={stock === 'out'} onClick={() => onAdd?.(product, variant, variantIndex, quantity)} className={cx(pill, 'h-14 min-w-[12rem] flex-1 gap-2 bg-navy-900 text-base text-white hover:bg-navy-800 disabled:opacity-50')}>
                        <Icon as={ShoppingCart} size={20} />
                        {t('ui.addToCart')}
                    </button>
                </div>
                <Link prefetch={false} href={`/quote?product=${product.id}`} className={cx(pill, 'mt-3 h-14 w-full gap-2 border border-line-strong text-base text-ink hover:border-ink')}>
                    <Icon as={MessageSquareText} size={20} />
                    {t('product.askQuote')}
                </Link>
                <p className="mt-6 flex items-center gap-3 border-t border-line pt-6 text-sm text-ink">
                    <Icon as={Truck} size={20} className="shrink-0 text-navy-900" />
                    {t('product.deliveryRow', { fee: format.price(DELIVERY_FEE) })}
                </p>
            </div>

            <Dialog open={zoom} onClose={() => setZoom(false)} title={product.title} size="xl" hideTitle bodyClassName="p-0">
                <div className="relative bg-surface">
                    <ResponsiveImage src={images[active]} alt={product.title} sizes="90vw" className="mx-auto max-h-[75dvh] w-full object-contain mix-blend-multiply" />
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
