import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getCategories } from '../lib/products';
import { useLang } from '../contexts/LangContext';
import { localizeCategory } from '../lib/localize';
import { STOCK_LABEL, getStockBadgeClass } from '../lib/stock';

export function getStaticProps() {
    const categories = getCategories();
    return {
        props: {
            categories,
        },
    };
}

const OUTPUT_CURRENCY = 'TND';
const FR_NUMBER_FORMAT = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: OUTPUT_CURRENCY,
});

const formatPrice = value => {
    if (!Number.isFinite(value)) {
        return `${value || 0} ${OUTPUT_CURRENCY}`;
    }
    return FR_NUMBER_FORMAT.format(value);
};

export default function SearchPage({ categories = [] }) {
    const router = useRouter();
    const { lang } = useLang();
    const queryValue = typeof router.query.q === 'string' ? router.query.q : '';
    const [searchTerm, setSearchTerm] = useState(queryValue);

    useEffect(() => {
        setSearchTerm(queryValue);
    }, [queryValue]);

    const localizedCategories = useMemo(
        () => categories.map(category => localizeCategory(category, lang)),
        [categories, lang]
    );

    const productIndex = useMemo(
        () =>
            localizedCategories.flatMap(category =>
                (category.products || []).map(product => ({
                    ...product,
                    categorySlug: category.slug,
                    categoryName: category.name,
                }))
            ),
        [localizedCategories]
    );

    const normalizedTerm = searchTerm.trim().toLowerCase();
    const searchResults = useMemo(() => {
        if (!normalizedTerm) return [];
        return productIndex.filter(product => {
            const usageText = Array.isArray(product.usage)
                ? product.usage.join(' ')
                : '';
            const priceText = formatPrice(product.price).toLowerCase();
            const haystack = `${product.title} ${product.description} ${product.brand} ${product.categoryName} ${usageText} ${priceText}`.toLowerCase();
            return haystack.includes(normalizedTerm);
        });
    }, [normalizedTerm, productIndex]);

    const handleSubmit = event => {
        event.preventDefault();
        const term = searchTerm.trim();
        const nextQuery = term ? { q: term } : {};
        router.push({ pathname: '/search', query: nextQuery }, undefined, {
            shallow: true,
        });
    };

    return (
        <main className="max-w-7xl mx-auto px-6 py-12">
            <div className="mb-8 text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide">
                    Product search
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                    Find the right product
                </h1>
                <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                    Search across all categories, brands, and usage tags.
                </p>
            </div>
            <form
                onSubmit={handleSubmit}
                className="max-w-2xl mx-auto mb-10"
            >
                <label htmlFor="searchQuery" className="sr-only">
                    Search products
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        id="searchQuery"
                        type="search"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        placeholder="Search by name, brand, or usage"
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                    />
                    <button
                        type="submit"
                        className="px-6 py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition"
                    >
                        Search
                    </button>
                </div>
            </form>
            {normalizedTerm ? (
                <div className="mb-6 text-sm text-gray-500">
                    {searchResults.length} result
                    {searchResults.length === 1 ? '' : 's'} for "{searchTerm}"
                </div>
            ) : (
                <div className="mb-6 text-sm text-gray-500">
                    Start typing to see results across the full catalog.
                </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map(product => {
                    const stockStatus = product.stock || 'in';
                    return (
                        <article
                            key={product.id}
                            className={`product-card ${stockStatus === 'out' ? 'product-out' : ''}`}
                            data-tilt
                        >
                            <Link
                                href={`/products/${product.categorySlug}/${product.id}`}
                                className="block"
                                aria-label={`View ${product.title}`}
                            >
                                <img
                                    src={product.image}
                                    alt={product.title}
                                    className="card-img"
                                />
                            </Link>
                            <div className="p-6 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {product.title}
                                    </h2>
                                    <span className="text-xs text-gray-500 uppercase">
                                        {product.brand}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {product.description}
                                </p>
                                <div className="text-xs text-gray-500">
                                    Category: {product.categoryName}
                                </div>
                                <div className="product-price-row">
                                    <span className="price font-semibold">
                                        {formatPrice(product.price)}
                                    </span>
                                    <span
                                        className={`stock-badge ${getStockBadgeClass(stockStatus)}`}
                                    >
                                        {STOCK_LABEL[stockStatus] || 'Unknown'}
                                    </span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {(product.usage || []).map(tag => (
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
                                        href={`/products/${product.categorySlug}/${product.id}`}
                                        className="product-detail-btn"
                                    >
                                        View details
                                    </Link>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
            {normalizedTerm && searchResults.length === 0 ? (
                <div className="mt-8 text-center text-gray-500">
                    No matches yet. Try another keyword or brand.
                </div>
            ) : null}
        </main>
    );
}
