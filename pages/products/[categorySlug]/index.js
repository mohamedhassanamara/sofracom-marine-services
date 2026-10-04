import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCart } from '../../../contexts/CartContext';
import {
    getCategoryBySlug,
    getCategories,
} from '../../../lib/products';
import { sortByAlphabet } from '../../../lib/sort';
import { STOCK_LABEL, getStockBadgeClass } from '../../../lib/stock';
import { useLang } from '../../../contexts/LangContext';
import { localizeCategory } from '../../../lib/localize';
import { formatPrice } from '../../../lib/constants';
import CartWidget from '../../../components/cart/CartWidget';
import { CardRating } from '../../../components/reviews/Stars';
import useProductStats from '../../../hooks/useProductStats';
import ResponsiveImage from '../../../components/ui/ResponsiveImage';
import Seo from '../../../components/Seo';
import { breadcrumbJsonLd } from '../../../lib/seo';

function ProductCard({ product, categorySlug, onAdd, rating }) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const selectDefaultVariant = () => {
        const inStockIndex = variants.findIndex(variant => variant.stock === 'in');
        return inStockIndex >= 0 ? inStockIndex : 0;
    };
    const [variantIndex, setVariantIndex] = useState(selectDefaultVariant);
    const [showFull, setShowFull] = useState(false);
    const description = product.description || '';
    const isLongDescription = description.length > 140;
    const previewDescription = description.slice(0, 140);
    const selectedVariant = variants[variantIndex] || null;
    const priceLabel = formatPrice(selectedVariant?.price ?? product.price ?? 0);
    const effectiveStock = selectedVariant?.stock ?? product.stock ?? 'in';

    const handleVariantChange = event => {
        setVariantIndex(Number(event.target.value));
    };

    const handleAdd = () => {
        if (effectiveStock === 'out') return;
        onAdd(product, selectedVariant, variantIndex);
    };

    return (
        <article
            className={`product-card ${effectiveStock === 'out' ? 'product-out' : ''}`}
            data-tilt
        >
            <Link
                href={`/products/${categorySlug}/${product.id}`}
                className="block"
                aria-label={`View ${product.title}`}
            >
                <ResponsiveImage
                    src={product.image}
                    alt={product.title}
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 260px"
                    className="card-img"
                />
            </Link>
            <div className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                        {product.title}
                    </h3>
                    <span className="text-xs text-slate-500 uppercase">
                        {product.brand}
                    </span>
                </div>
                <CardRating stats={rating} />
                <p className="product-description">
                    {showFull || !isLongDescription
                        ? description
                        : `${previewDescription}…`}
                    {isLongDescription && (
                        <button
                            type="button"
                            className="product-readmore"
                            onClick={() => setShowFull(prev => !prev)}
                        >
                            {showFull ? 'Show less' : 'Read more'}
                        </button>
                    )}
                </p>
                {product.datasheet && (
                    <a
                        href={product.datasheet}
                        target="_blank"
                        rel="noreferrer"
                        className="product-datasheet-link"
                    >
                        Download datasheet
                    </a>
                )}
                {variants.length > 0 && (
                    <div className="variant-row">
                        <label className="sr-only" htmlFor={`variant-${product.id}`}>
                            Choose variant
                        </label>
                        <select
                            id={`variant-${product.id}`}
                            className="variant-select"
                            value={variantIndex}
                            onChange={handleVariantChange}
                        >
                            {variants.map((variant, idx) => (
                                <option key={`${product.id}-variant-${idx}`} value={idx}>
                                    {variant.label || `Variant ${idx + 1}`} ·{' '}
                                    {formatPrice(variant.price ?? product.price ?? 0)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="product-price-row">
                    <span className="product-price">{priceLabel}</span>
                    <span
                        className={`stock-badge ${getStockBadgeClass(effectiveStock)}`}
                    >
                        {STOCK_LABEL[effectiveStock] || 'Unknown'}
                    </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {product.usage.map(tag => (
                        <span
                            key={`${product.id}-${tag}`}
                            className="tag px-3 py-1 rounded-full text-xs"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="product-actions mt-auto">
                    <Link
                        href={`/products/${categorySlug}/${product.id}`}
                        className="product-detail-btn"
                    >
                        View details
                    </Link>
                    <button
                        type="button"
                        className="cart-submit px-4 py-2 text-sm"
                        onClick={handleAdd}
                        disabled={effectiveStock === 'out'}
                    >
                        Add to cart
                    </button>
                </div>
            </div>
        </article>
    );
}

export async function getStaticPaths({ locales = ['en'] }) {
    const categories = getCategories();
    const paths = locales.flatMap(locale =>
        categories.map(category => ({
            params: { categorySlug: category.slug },
            locale,
        }))
    );
    return {
        paths,
        fallback: false,
    };
}

export async function getStaticProps({ params }) {
    const category = getCategoryBySlug(params.categorySlug);
    if (!category) {
        return { notFound: true };
    }
    return {
        props: {
            category,
        },
    };
}


export default function CategoryPage({ category }) {
    const { lang, t } = useLang();
    const [brandFilter, setBrandFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('alpha-asc');
    const { addProduct } = useCart();
    const productStats = useProductStats();
    const localizedCategory = useMemo(
        () => localizeCategory(category, lang),
        [category, lang]
    );
    const localizedProducts = localizedCategory.products || [];

    const availableBrands = useMemo(() => {
        const brands = Array.from(
            new Set(
                localizedProducts.map(product => product.brand).filter(Boolean)
            )
        );
        return sortByAlphabet(brands, brand => brand, lang);
    }, [localizedProducts, lang]);

    const renderedProducts = useMemo(() => {
        const normalizedTerm = searchTerm.trim().toLowerCase();
        const filtered = localizedProducts.filter(product => {
            if (brandFilter && product.brand !== brandFilter) return false;
            if (!normalizedTerm) return true;
            const haystack = `${product.title} ${product.description} ${product.brand}`.toLowerCase();
            return haystack.includes(normalizedTerm);
        });

        const baseList = filtered.length ? filtered : localizedProducts;

        if (sortOption === 'alpha-desc') {
            return sortByAlphabet(baseList, product => product.title, lang).reverse();
        }

        if (sortOption === 'price-asc') {
            return [...baseList].sort(
                (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)
            );
        }

        if (sortOption === 'price-desc') {
            return [...baseList].sort(
                (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)
            );
        }

        return sortByAlphabet(baseList, product => product.title, lang);
    }, [localizedProducts, brandFilter, searchTerm, sortOption, lang]);

    return (
        <>
            <Seo
                title={localizedCategory.name}
                description={t('seo.category.description', { category: localizedCategory.name, count: localizedProducts.length })}
                path={`/products/${category.slug}`}
                image={category.image}
                jsonLd={breadcrumbJsonLd(
                    [
                        { name: t('nav.products'), path: '/products' },
                        { name: localizedCategory.name, path: `/products/${category.slug}` },
                    ],
                    lang
                )}
            />
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <nav className="text-sm text-slate-500" id="breadcrumb">
                        <Link href="/products" className="hover:underline">
                            Catalog
                        </Link>
                        <span className="mx-1">/</span>
                        <span className="text-slate-700 font-medium">
                            {localizedCategory.name}
                        </span>
                    </nav>
                    <div className="flex items-center gap-3 flex-wrap">
                        <select
                            className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                            value={brandFilter}
                            onChange={event => setBrandFilter(event.target.value)}
                        >
                            <option value="">{t('products.controls.allBrands')}</option>
                            {availableBrands.map(brand => (
                                <option key={brand} value={brand}>
                                    {brand}
                                </option>
                            ))}
                        </select>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                            placeholder={t('products.controls.searchPlaceholder')}
                            className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                        />
                        <select
                            className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-navy-200"
                            value={sortOption}
                            onChange={event => setSortOption(event.target.value)}
                        >
                            <option value="alpha-asc">{t('products.controls.sortNameAsc')}</option>
                            <option value="alpha-desc">{t('products.controls.sortNameDesc')}</option>
                            <option value="price-asc">{t('products.controls.sortPriceAsc')}</option>
                            <option value="price-desc">{t('products.controls.sortPriceDesc')}</option>
                        </select>
                        <button
                            type="button"
                            className="px-3 py-2 rounded-lg border hover:bg-slate-100"
                            onClick={() => {
                                setBrandFilter('');
                                setSearchTerm('');
                                setSortOption('alpha-asc');
                            }}
                        >
                            {t('products.controls.reset')}
                        </button>
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderedProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            categorySlug={category.slug}
                            onAdd={addProduct}
                            rating={productStats[product.id]}
                        />
                    ))}
                </div>
            </main>
            <CartWidget />
        </>
    );
}
