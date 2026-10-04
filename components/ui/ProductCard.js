import Link from 'next/link';
import { useLang } from '../../contexts/LangContext';
import { priceRange } from '../../lib/format';
import { StockBadge } from './Badge';
import Button from './Button';
import { cx } from './cx';
import { ShoppingCart } from './icons';
import Price from './Price';
import ResponsiveImage from './ResponsiveImage';
import { RatingSummary } from './Stars';

const CARD_SIZES = '(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 260px';

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

// The one product card (category grid, search results, featured, related).
// `product` is normalized + localized; the whole card links to the product page, and
// quick add adds the default option (products with several options link to their page instead).
export default function ProductCard({ product, stats, onQuickAdd, priority = false, headingLevel = 3, className }) {
    const { t } = useLang();
    const href = `/products/${product.categorySlug}/${product.id}`;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const { min, varies } = priceRange(product);
    const stock = productStock(product);
    const hasChoices = variants.length > 1;
    const Heading = `h${headingLevel}`;

    return (
        <article className={cx('group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow duration-base hover:shadow-md', className)}>
            <div className="relative aspect-square bg-slate-50">
                <ResponsiveImage src={product.image} alt="" sizes={CARD_SIZES} priority={priority} className="h-full w-full object-contain p-4 transition-transform duration-slow group-hover:scale-[1.03]" />
                {stock !== 'in' && (
                    <span className="absolute start-3 top-3">
                        <StockBadge stock={stock} size="sm" />
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{product.brand}</p>}
                <Heading className="text-base font-semibold leading-snug text-slate-900">
                    <Link href={href} className="line-clamp-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">
                        {product.title}
                    </Link>
                </Heading>
                <RatingSummary stats={stats} />
                <div className="mt-auto flex flex-col gap-3 pt-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <Price value={min} from={varies} size="lg" />
                        {hasChoices && <span className="text-xs text-slate-600">{t('ui.variants', { count: variants.length })}</span>}
                    </div>
                    {onQuickAdd &&
                        (hasChoices ? (
                            <Button href={href} variant="secondary" size="sm" fullWidth className="relative z-10">
                                {t('ui.chooseOptions')}
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size="sm"
                                fullWidth
                                icon={ShoppingCart}
                                className="relative z-10"
                                disabled={stock === 'out'}
                                onClick={() => onQuickAdd(product, variants[defaultVariantIndex(product)] || null, defaultVariantIndex(product))}
                                aria-label={`${t('ui.addToCart')}: ${product.title}`}
                            >
                                <span aria-hidden="true">{t('ui.addToCart')}</span>
                            </Button>
                        ))}
                </div>
            </div>
        </article>
    );
}
