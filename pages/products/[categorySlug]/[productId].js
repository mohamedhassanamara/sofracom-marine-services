import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCart } from '../../../contexts/CartContext';
import {
    getProductById,
    getProductPaths,
} from '../../../lib/products';
import { STOCK_LABEL, getStockBadgeClass } from '../../../lib/stock';
import { useLang } from '../../../contexts/LangContext';
import { localizeCategory, localizeProduct } from '../../../lib/localize';
import { formatPrice } from '../../../lib/constants';
import CartWidget from '../../../components/cart/CartWidget';
import ProductReviews from '../../../components/reviews/ProductReviews';
import { CardRating } from '../../../components/reviews/Stars';
import useProductStats from '../../../hooks/useProductStats';
import ResponsiveImage from '../../../components/ui/ResponsiveImage';
import { imageAt } from '../../../lib/images';
import Seo from '../../../components/Seo';
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
    // Only the category's own fields: its product list would bloat every product page.
    const { products, ...category } = entry.category;
    return {
        props: {
            product: entry.product,
            category: { ...category, products: [] },
            stats,
        },
        // Ratings in the structured data refresh hourly; the page itself is static.
        revalidate: 3600,
    };
}

export default function ProductDetailPage({ product, category, stats = null }) {
    const { lang, t } = useLang();
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const { addProduct } = useCart();
    const productStats = useProductStats();
    const localizedCategory = useMemo(
        () => localizeCategory(category, lang),
        [category, lang]
    );
    const localizedProduct = useMemo(
        () => localizeProduct(product, lang, category),
        [product, lang, category]
    );

    const detailVariant =
        localizedProduct.variants[selectedVariantIndex] ?? null;
    const detailPrice = detailVariant?.price ?? localizedProduct.price ?? 0;
    const detailImage =
        localizedProduct.images[activeImageIndex] || localizedProduct.image;
    const effectiveStock =
        detailVariant?.stock ?? localizedProduct.stock ?? 'in';

    const addToCart = () => {
        if (effectiveStock === 'out') return;
        addProduct(localizedProduct, detailVariant, selectedVariantIndex);
    };

    const description = localizedProduct.description || '';
    const READ_MORE_LENGTH = 320;
    const [showFullDescription, setShowFullDescription] = useState(false);
    const isLongDescription = description.length > READ_MORE_LENGTH;
    const previewDescription = description.slice(0, READ_MORE_LENGTH);

    const productPath = `/products/${category.slug}/${product.id}`;
    const metaDescription = (description || `${localizedProduct.title} ${localizedProduct.brand || ''}`).replace(/\s+/g, ' ').slice(0, 155);

    return (
        <>
            <Seo
                title={[localizedProduct.title, localizedProduct.brand].filter(Boolean).join(' · ')}
                description={metaDescription}
                path={productPath}
                image={localizedProduct.images[0]}
                type="product"
                jsonLd={[
                    productJsonLd({ product: { ...localizedProduct, categoryName: localizedCategory.name }, path: productPath, locale: lang, stats }),
                    breadcrumbJsonLd(
                        [
                            { name: t('nav.products'), path: '/products' },
                            { name: localizedCategory.name, path: `/products/${category.slug}` },
                            { name: localizedProduct.title, path: productPath },
                        ],
                        lang
                    ),
                ]}
            />
            <main className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex flex-col gap-4 mb-6">
                    <p className="text-sm text-slate-500 uppercase tracking-wide">
                        Product detail
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Link href="/products" className="hover:underline">
                            Catalog
                        </Link>
                        <span>/</span>
                        <Link href={`/products/${category.slug}`} className="hover:underline">
                            {localizedCategory.name}
                        </Link>
                        <span>/</span>
                        <span className="font-semibold text-slate-700">
                            {localizedProduct.title}
                        </span>
                    </div>
                </div>
                <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10">
                    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
                        <ResponsiveImage
                            priority
                            sizes="(min-width: 1024px) 560px, 100vw"
                            src={detailImage}
                            alt={localizedProduct.title}
                            className="w-full h-96 object-contain rounded-xl bg-slate-50"
                        />
                        {localizedProduct.images.length > 1 && (
                            <div className="flex flex-wrap gap-3 mt-4">
                                {localizedProduct.images.map((src, index) => (
                                    <button
                                        key={src}
                                        type="button"
                                        onClick={() => setActiveImageIndex(index)}
                                        className={`w-20 h-20 rounded-2xl border ${
                                            activeImageIndex === index
                                                ? 'border-navy-500'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        <img
                                            loading="lazy"
                                            src={imageAt(src, 400)}
                                            alt={`${localizedProduct.title}-${index}`}
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-5">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">
                                {localizedProduct.categoryName}
                            </p>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {localizedProduct.title}
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                {localizedProduct.brand}
                            </p>
                            {productStats[product.id] && (
                                <a href="#reviews" className="inline-block mt-1">
                                    <CardRating stats={productStats[product.id]} />
                                </a>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {localizedProduct.usage.map(tag => (
                                <span
                                    key={`${localizedProduct.id}-tag-${tag}`}
                                    className="tag px-3 py-1 rounded-full text-xs"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-4">
                                <span className="text-4xl font-bold text-slate-900">
                                    {formatPrice(detailPrice)}
                                </span>
                                <span
                                    className={`stock-badge ${getStockBadgeClass(effectiveStock)}`}
                                >
                                    {STOCK_LABEL[effectiveStock] || 'Unknown'}
                                </span>
                            </div>
                            {effectiveStock === 'on-order' && (
                                <p className="text-sm text-warning-700">
                                    This item is on order; delivery will take longer.
                                </p>
                            )}
                        </div>
                        {localizedProduct.variants.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {localizedProduct.variants.map((variant, index) => (
                                    <button
                                        key={`${variant.label}-${index}`}
                                        type="button"
                                        className={`detail-variant-btn ${
                                            selectedVariantIndex === index
                                                ? 'active'
                                                : ''
                                        }`}
                                        onClick={() => setSelectedVariantIndex(index)}
                                    >
                                        {variant.label}
                                        <span>{formatPrice(variant.price)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="text-sm text-slate-700 leading-relaxed">
                            {showFullDescription
                                ? description
                                : `${previewDescription}${isLongDescription ? '…' : ''}`}
                        </p>
                        {isLongDescription && (
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    type="button"
                                    className="text-navy-600 hover:underline text-sm font-semibold"
                                    onClick={() => setShowFullDescription(prev => !prev)}
                                >
                                    {showFullDescription ? 'Show less' : 'Read more'}
                                </button>
                            </div>
                        )}
                        {localizedProduct.datasheet && (
                            <div className="mt-2">
                                <a
                                    href={localizedProduct.datasheet}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="datasheet-link"
                                >
                                    Download datasheet
                                </a>
                            </div>
                        )}
                        <button
                            type="button"
                            className="w-full rounded-xl bg-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 transition"
                            onClick={addToCart}
                            disabled={effectiveStock === 'out'}
                        >
                            Add to cart
                        </button>
                    </div>
                </div>
                <ProductReviews productId={product.id} productTitle={localizedProduct.title} />
            </main>
            <CartWidget />
        </>
    );
}
