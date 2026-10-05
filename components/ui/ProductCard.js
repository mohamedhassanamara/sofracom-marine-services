import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import useFormat from '../../hooks/useFormat';
import { priceRange } from '../../lib/format';
import { statusTone, tones } from '../../lib/design/tokens';
import { cx } from './cx';
import { Sheet } from './Dialog';
import { Icon, Plus, X } from './icons';
import ResponsiveImage from './ResponsiveImage';
import { Stars } from './Stars';

// Cards are a quarter of the page on desktop, a third on tablets, half on phones.
const CARD_SIZES = '(min-width: 1320px) 300px, (min-width: 1024px) 23vw, (min-width: 768px) 30vw, 45vw';

// Default option: the first one in stock (else the first).
export const defaultVariantIndex = product => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const index = variants.findIndex(variant => variant.stock === 'in');
    return index >= 0 ? index : 0;
};

export const productStock = product => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) return product?.stock || 'in';
    const stocks = variants.map(variant => variant.stock);
    return stocks.includes('in') ? 'in' : stocks.includes('on-order') ? 'on-order' : 'out';
};

// "● On order" / "● Out of stock"; nothing when in stock.
export function StockLine({ stock, className }) {
    const { t } = useLang();
    if (!stock || stock === 'in') return null;
    return (
        <p className={cx('inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted', className)}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tones[statusTone.stock[stock]].solid }} />
            {t(`stock.${stock}`)}
        </p>
    );
}

// Small stars + count, only from real reviews (nothing when there are none).
export function CardRating({ stats }) {
    const { t } = useLang();
    if (!stats || !stats.count) return null;
    return (
        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <Stars value={stats.avg} size="sm" className="text-xs" />
            <span>
                <span className="sr-only">{Number(stats.avg).toFixed(1)}, </span>({t('ui.reviewsCount', { count: stats.count })})
            </span>
        </span>
    );
}

const useNarrow = () => {
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(max-width: 639px)');
        const update = () => setNarrow(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return narrow;
};

function OptionList({ product, onPick, autoFocus }) {
    const format = useFormat();
    const { t } = useLang();
    const first = useRef(null);
    useEffect(() => {
        if (autoFocus) first.current?.focus();
    }, [autoFocus]);
    return (
        <ul className="flex flex-col gap-1">
            {product.variants.map((variant, index) => (
                <li key={`${variant.label}-${index}`}>
                    <button
                        ref={index === 0 ? first : undefined}
                        type="button"
                        disabled={variant.stock === 'out'}
                        onClick={() => onPick(variant, index)}
                        className="flex min-h-[2.75rem] w-full items-center justify-between gap-3 rounded-lg px-3 text-start text-sm text-ink hover:bg-surface disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent"
                    >
                        <span className="min-w-0 truncate font-medium">{variant.label}</span>
                        <span className="shrink-0 tabular-nums">{variant.stock === 'out' ? t('stock.out') : <bdi>{format.price(variant.price)}</bdi>}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

// The one product card (category grid, search, home, related): image well on the neutral
// surface, then brand, title, price ("from" when options differ), rating, and stock only
// when it is NOT in stock. The whole card links to the product. Quick add is a round "+" on
// the image (on hover with a mouse, always on touch screens); products with several
// options open a small picker (a bottom sheet on phones). Hover shows the second photo.
export default function ProductCard({ product, stats, onQuickAdd, priority = false, headingLevel = 3, className }) {
    const { t } = useLang();
    const format = useFormat();
    const narrow = useNarrow();
    const href = `/products/${product.categorySlug}/${product.id}`;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const { min, varies } = priceRange(product);
    const stock = productStock(product);
    const hasChoices = variants.length > 1;
    const [pickerOpen, setPickerOpen] = useState(false);
    const plusRef = useRef(null);
    const pickerId = `pick-${useId().replace(/:/g, '')}`;
    const Heading = `h${headingLevel}`;

    const close = () => {
        setPickerOpen(false);
        plusRef.current?.focus();
    };
    const pick = (variant, index) => {
        onQuickAdd?.(product, variant, index);
        close();
    };
    const quickAdd = () => {
        if (hasChoices) setPickerOpen(open => !open);
        else onQuickAdd?.(product, variants[defaultVariantIndex(product)] || null, variants.length ? defaultVariantIndex(product) : null);
    };

    // Inline picker: Escape or a click elsewhere closes it.
    const panel = useRef(null);
    useEffect(() => {
        if (!pickerOpen || narrow) return undefined;
        const onKey = event => event.key === 'Escape' && close();
        const onDown = event => !panel.current?.contains(event.target) && !plusRef.current?.contains(event.target) && setPickerOpen(false);
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDown);
        };
    }, [pickerOpen, narrow]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <article className={cx('group relative flex flex-col', className)}>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
                <ResponsiveImage
                    src={product.image}
                    alt=""
                    sizes={CARD_SIZES}
                    priority={priority}
                    className={cx('absolute inset-0 h-full w-full object-contain p-[9%] mix-blend-multiply transition duration-base ease-out can-hover:group-hover:scale-[1.03]', product.image2 && 'can-hover:group-hover:opacity-0')}
                />
                {product.image2 && (
                    <ResponsiveImage src={product.image2} alt="" sizes={CARD_SIZES} className="absolute inset-0 hidden h-full w-full object-contain p-[9%] opacity-0 mix-blend-multiply transition duration-base ease-out can-hover:block can-hover:group-hover:scale-[1.03] can-hover:group-hover:opacity-100" />
                )}
                {onQuickAdd && stock !== 'out' && (
                    <button
                        ref={plusRef}
                        type="button"
                        onClick={quickAdd}
                        aria-label={hasChoices ? t('card.chooseFor', { title: product.title }) : t('card.quickAdd', { title: product.title })}
                        aria-expanded={hasChoices ? pickerOpen : undefined}
                        aria-controls={hasChoices && !narrow && pickerOpen ? pickerId : undefined}
                        className={cx(
                            'absolute bottom-3 end-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-soft transition duration-fast ease-out hover:bg-ink hover:text-white focus-visible:translate-y-0 focus-visible:opacity-100',
                            !pickerOpen && 'can-hover:translate-y-1 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100'
                        )}
                    >
                        <Icon as={pickerOpen && !narrow ? X : Plus} size={20} />
                    </button>
                )}
                {hasChoices && pickerOpen && !narrow && (
                    <div ref={panel} id={pickerId} role="group" aria-label={t('card.pickOption')} className="absolute inset-x-3 bottom-16 z-20 max-h-[70%] overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-soft">
                        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-muted">{t('card.pickOption')}</p>
                        <OptionList product={product} onPick={pick} autoFocus />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1 pt-4">
                {product.brand && <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-muted">{product.brand}</p>}
                <Heading className="font-sans text-[0.9375rem] font-medium leading-snug tracking-normal text-ink">
                    <Link href={href} prefetch={false} className="line-clamp-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">
                        {product.title}
                    </Link>
                </Heading>
                <p className="mt-1 text-[0.9375rem] font-semibold tabular-nums text-ink">
                    {varies && <span className="font-normal text-ink-muted">{t('ui.from')} </span>}
                    <bdi>{format.price(min)}</bdi>
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <CardRating stats={stats} />
                    <StockLine stock={stock} />
                </div>
            </div>

            {hasChoices && narrow && (
                <Sheet open={pickerOpen} onClose={close} title={product.title} description={t('card.pickOption')}>
                    <OptionList product={product} onPick={pick} />
                </Sheet>
            )}
        </article>
    );
}
