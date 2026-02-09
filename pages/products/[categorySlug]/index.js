import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import useCart from '../../../hooks/useCart';
import {
    getCategoryBySlug,
    getCategories,
} from '../../../lib/products';
import { STOCK_LABEL, getStockBadgeClass } from '../../../lib/stock';
import { useLang } from '../../../contexts/LangContext';
import { localizeCategory } from '../../../lib/localize';
import ReviewSummary from '../../../components/ReviewSummary';
import { useReviews } from '../../../hooks/useReviews';
import { useAuth } from '../../../contexts/AuthContext';

const OUTPUT_CURRENCY = 'TND';
const FR_NUMBER_FORMAT = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: OUTPUT_CURRENCY,
});

const DELIVERY_FEE = 7;

const formatPrice = value => {
    if (!Number.isFinite(value)) {
        return `${value || 0} ${OUTPUT_CURRENCY}`;
    }
    return FR_NUMBER_FORMAT.format(value);
};

function ProductCard({ product, categorySlug, onAdd }) {
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
    const { t } = useLang();
    const { summary } = useReviews(product.id, { summaryOnly: true });

    const handleVariantChange = event => {
        setVariantIndex(Number(event.target.value));
    };

    const handleAdd = () => {
        if (effectiveStock === 'out') return;
        onAdd(product, selectedVariant);
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
                <img
                    src={product.image}
                    alt={product.title}
                    className="card-img"
                />
            </Link>
            <div className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {product.title}
                    </h3>
                    <span className="text-xs text-gray-500 uppercase">
                        {product.brand}
                    </span>
                </div>
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
                            {showFull ? t('product.detailShowLess') : t('product.detailReadMore')}
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
                        {t('product.datasheet')}
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
                <div className="mt-2 flex items-center gap-2">
                    {summary.count > 0 ? (
                        <ReviewSummary average={summary.average} count={summary.count} fontSize={12} />
                    ) : (
                        <p className="text-xs text-gray-500">{t('review.noReviews')}</p>
                    )}
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
                        {t('products.card.viewAction')}
                    </Link>
                    <button
                        type="button"
                        className="cart-submit px-4 py-2 text-sm"
                        onClick={handleAdd}
                        disabled={effectiveStock === 'out'}
                    >
                        {t('product.addToCart')}
                    </button>
                </div>
            </div>
        </article>
    );
}

export async function getStaticPaths() {
    const categories = getCategories();
    const paths = categories.map(category => ({
        params: { categorySlug: category.slug },
    }));
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
    const { profile, token, isAuthenticated } = useAuth();
    const [brandFilter, setBrandFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutStatus, setCheckoutStatus] = useState({ message: '', type: '' });
    const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '',
        addressId: '',
    });
    const router = useRouter();
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [orderConfirmationVisible, setOrderConfirmationVisible] = useState(false);
    const [orderHadOnOrderItems, setOrderHadOnOrderItems] = useState(false);
    const { cart, addItem, updateQuantity, removeItem, total, count, hasOnOrderItem, resetCart } = useCart();
    const grandTotal = total + DELIVERY_FEE;
    const [onOrderNoticeVisible, setOnOrderNoticeVisible] = useState(false);
    const onOrderNoticeTimeout = useRef(null);
    const localizedCategory = useMemo(
        () => localizeCategory(category, lang),
        [category, lang]
    );
    const localizedProducts = localizedCategory.products || [];
    const savedAddresses = useMemo(
        () => (Array.isArray(profile?.addresses) ? profile.addresses : []),
        [profile]
    );
    useEffect(() => {
        if (!profile) return;
        setCheckoutForm(form => {
            const next = { ...form };
            if (!next.name && profile.name) {
                next.name = profile.name;
            }
            if (!next.phone && profile.phone) {
                next.phone = profile.phone;
            }
            if (!next.address && profile.defaultAddressId) {
                const defaultEntry = savedAddresses.find(addr => addr.id === profile.defaultAddressId);
                if (defaultEntry) {
                    next.address = defaultEntry.address;
                    next.addressId = defaultEntry.id;
                }
            }
            return next;
        });
    }, [profile, savedAddresses]);

    useEffect(() => {
        return () => {
            if (onOrderNoticeTimeout.current) {
                clearTimeout(onOrderNoticeTimeout.current);
            }
        };
    }, []);

    const showOnOrderNotice = () => {
        if (onOrderNoticeTimeout.current) {
            clearTimeout(onOrderNoticeTimeout.current);
        }
        setOnOrderNoticeVisible(true);
        onOrderNoticeTimeout.current = setTimeout(() => {
            setOnOrderNoticeVisible(false);
        }, 7000);
    };

    const hideOnOrderNotice = () => {
        if (onOrderNoticeTimeout.current) {
            clearTimeout(onOrderNoticeTimeout.current);
        }
        setOnOrderNoticeVisible(false);
    };

    const availableBrands = useMemo(() => {
        const brands = Array.from(
            new Set(
                localizedProducts.map(product => product.brand).filter(Boolean)
            )
        );
        return brands.sort();
    }, [localizedProducts]);

    const filteredProducts = useMemo(() => {
        const normalizedTerm = searchTerm.trim().toLowerCase();
        return localizedProducts.filter(product => {
            if (brandFilter && product.brand !== brandFilter) return false;
            if (!normalizedTerm) return true;
            const haystack = `${product.title} ${product.description} ${product.brand}`.toLowerCase();
            return haystack.includes(normalizedTerm);
        });
    }, [localizedProducts, brandFilter, searchTerm]);

    const renderedProducts = filteredProducts.length
        ? filteredProducts
        : localizedProducts;

    const addToCart = (product, variant) => {
        if (!product) return;
        const stockStatus = variant?.stock ?? product.stock ?? 'in';
        if (stockStatus === 'out') return;
        const price = variant?.price ?? product.price ?? 0;
        const variantLabel = variant?.label;
        const itemId = variantLabel ? `${product.id}-${variantLabel}` : product.id;
        addItem({
            id: itemId,
            title: product.title,
            price,
            quantity: 1,
            image: product.image,
            category: product.categoryName,
            brand: product.brand,
            variantLabel,
            stock: stockStatus,
            productId: product.id,
            productUrl: `/products/${category.slug}/${product.id}`,
        });
        setCartOpen(true);
    };

    const handleCheckoutInput = event => {
        const { name, value } = event.target;
        setCheckoutForm(form => ({
            ...form,
            [name]: value,
            ...(name === 'address' ? { addressId: '' } : {}),
        }));
    };

    const handleAddressSelect = event => {
        const value = event.target.value;
        const targetAddress = savedAddresses.find(addr => addr.id === value);
        setCheckoutForm(form => ({
            ...form,
            addressId: value,
            address: targetAddress ? targetAddress.address : form.address,
        }));
    };

    const handleCheckoutSubmit = async event => {
        event.preventDefault();
        if (!cart.length) {
            setCheckoutStatus({ message: t('checkout.cartEmpty'), type: 'error' });
            return;
        }
        if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
            setCheckoutStatus({
                message: t('checkout.missingInfo'),
                type: 'error',
            });
            return;
        }
        if (!isAuthenticated) {
            setCheckoutStatus({ message: t('checkout.signInRequired'), type: 'error' });
            router.push('/account');
            return;
        }
        setCheckoutSubmitting(true);
        setCheckoutStatus({ message: t('checkout.sending'), type: '' });
        const currentGrandTotal = total + DELIVERY_FEE;
        const payload = {
            customer: checkoutForm,
            items: cart.map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
                category: item.category,
                variantLabel: item.variantLabel,
                product_id: item.productId || item.id,
                product_url: item.productUrl || '',
            })),
            total: currentGrandTotal,
            delivery_fee: DELIVERY_FEE,
            currency: OUTPUT_CURRENCY,
        };
        payload.product_ids = Array.from(
            new Set(
                payload.items
                    .map(item => item.product_id || item.id)
                    .filter(Boolean)
            )
        );
        try {
            const hadOnOrderItems = hasOnOrderItem;
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Unable to place order');
            }
            setCheckoutForm({ name: '', phone: '', address: '', notes: '' });
            setCheckoutStatus({ message: '', type: '' });
            resetCart();
            setCartOpen(false);
            if (hadOnOrderItems) {
                showOnOrderNotice();
            }
            setOrderHadOnOrderItems(hadOnOrderItems);
            setOrderConfirmationVisible(true);
        } catch (error) {
            console.error('[order] submit failed', error);
            setCheckoutStatus({
                message: error.message || 'Unable to submit order.',
                type: 'error',
            });
        } finally {
            setCheckoutSubmitting(false);
        }
    };

    const openCart = () => {
        setCartOpen(true);
        setCheckoutStatus({ message: '', type: '' });
    };
    const closeCart = () => setCartOpen(false);
    const openCheckoutModal = () => {
        if (!cart.length) return;
        if (!isAuthenticated) {
            setCheckoutStatus({ message: t('checkout.signInRequired'), type: 'error' });
            router.push('/account');
            return;
        }
        setOrderConfirmationVisible(false);
        setCheckoutStatus({ message: '', type: '' });
        setCheckoutModalOpen(true);
    };
    const closeCheckoutModal = () => {
        setCheckoutModalOpen(false);
        setOrderConfirmationVisible(false);
        setCheckoutStatus({ message: '', type: '' });
    };
    const goHome = () => {
        closeCheckoutModal();
        router.push('/');
    };
    const confirmationTitle = orderHadOnOrderItems
        ? t('order.confirmation.delayedTitle')
        : t('order.confirmation.successTitle');
    const confirmationSubtitle = orderHadOnOrderItems
        ? t('order.confirmation.delayedSubtitle')
        : t('order.confirmation.successSubtitle');

    return (
        <>
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <nav className="text-sm text-gray-500" id="breadcrumb">
                        <Link href="/products" className="hover:underline">
                            {t('product.detailBreadcrumbCatalog')}
                        </Link>
                        <span className="mx-1">/</span>
                        <span className="text-gray-700 font-medium">
                            {localizedCategory.name}
                        </span>
                    </nav>
                    <div className="flex items-center gap-3 flex-wrap">
                        <select
                            className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200"
                            value={brandFilter}
                            onChange={event => setBrandFilter(event.target.value)}
                        >
                            <option value="">{t('products.filters.allBrands')}</option>
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
                            placeholder={t('products.searchPlaceholder')}
                            className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200"
                        />
                        <button
                            type="button"
                            className="px-3 py-2 rounded-lg border hover:bg-gray-100"
                            onClick={() => {
                                setBrandFilter('');
                                setSearchTerm('');
                            }}
                        >
                            {t('products.filters.reset')}
                        </button>
                    </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderedProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            categorySlug={category.slug}
                            onAdd={addToCart}
                        />
                    ))}
                </div>
            </main>
            <button id="cartFab" className="cart-fab" type="button" onClick={openCart}>
                <span className="cart-icon" aria-hidden="true">
                    🛒
                </span>
                <span>{t('cart.fabLabel')}</span>
                <span className="px-2 py-1 rounded-full bg-white/15 text-sm font-semibold">
                    {count}
                </span>
            </button>
            <div
                id="cartOverlay"
                className={`cart-overlay ${cartOpen ? 'active' : ''}`}
                onClick={closeCart}
            />
            <aside
                id="cartDrawer"
                className={`cart-drawer ${cartOpen ? 'open' : ''}`}
                aria-hidden={!cartOpen}
            >
                <div className="cart-header">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {t('cart.title')}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {t('cart.subtitle')}
                        </p>
                    </div>
                    <button
                        id="cartClose"
                        type="button"
                        aria-label="Close cart"
                        className="text-2xl leading-none text-gray-500 hover:text-gray-800"
                        onClick={closeCart}
                    >
                        ×
                    </button>
                </div>
                {onOrderNoticeVisible && (
                    <div className="cart-onorder-popup" role="alert">
                        <div>
                            <strong>{t('cart.onOrderTitle')}</strong>
                            <p className="text-sm">
                                {t('cart.onOrderDescription')}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="cart-onorder-close"
                            aria-label="Dismiss notice"
                            onClick={hideOnOrderNotice}
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="cart-body" id="cartItems">
                    {cart.length ? (
                        cart.map(item => (
                            <div
                                className="cart-item"
                                key={item.id}
                                data-id={item.id}
                            >
                                <img src={item.image} alt={item.title} />
                                <div>
                                    <p className="cart-item-title">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {item.variantLabel
                                            ? item.variantLabel
                                            : item.category}
                                    </p>
                                    <p className="cart-item-price">
                                        {formatPrice(item.price)}
                                    </p>
                                    <div className="cart-qty mt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    item.quantity - 1
                                                )
                                            }
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={event => {
                                                const value = Number(
                                                    event.target.value
                                                );
                                                if (!Number.isFinite(value)) return;
                                                updateQuantity(item.id, value);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    item.quantity + 1
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="text-xs text-red-500 ml-3"
                                        >
                                            {t('account.remove')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-cart">{t('cart.empty')}</p>
                    )}
                </div>
                <div className="cart-summary">
                    <div className="cart-summary-row">
                        <span>{t('cart.summary.items')}</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                    <div className="cart-summary-row">
                        <span>{t('cart.summary.delivery')}</span>
                        <span>{formatPrice(DELIVERY_FEE)}</span>
                    </div>
                    <div className="cart-summary-row cart-summary-total">
                        <span>{t('cart.summary.grand')}</span>
                        <span>{formatPrice(grandTotal)}</span>
                    </div>
                    <button
                        type="button"
                        className="cart-submit"
                        onClick={openCheckoutModal}
                        disabled={!cart.length}
                    >
                        {t('checkout.action')}
                    </button>
                </div>
            </aside>
            {checkoutModalOpen && (
                <div
                    className="checkout-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    onClick={closeCheckoutModal}
                >
                    <div className="checkout-modal" onClick={event => event.stopPropagation()}>
                        <header className="checkout-modal-header">
                            <h3 className="checkout-modal-title">{t('checkout.title')}</h3>
                            <button
                                type="button"
                                className="checkout-modal-close"
                                aria-label="Close checkout"
                                onClick={closeCheckoutModal}
                            >
                                ×
                            </button>
                        </header>
                        {orderConfirmationVisible ? (
                            <div className="checkout-confirmation">
                                <p className="text-base font-semibold text-gray-900">
                                    {confirmationTitle}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    {confirmationSubtitle}
                                </p>
                                <button
                                    type="button"
                                    className="cart-submit"
                                    onClick={goHome}
                                >
                                    {t('buttons.goHome')}
                                </button>
                            </div>
                        ) : (
                            <form
                                id="checkoutForm"
                                className="cart-form"
                                onSubmit={handleCheckoutSubmit}
                                noValidate
                            >
                                <label>
                                    <span>{t('account.name')}</span>
                                    <input
                                        type="text"
                                        name="name"
                                        value={checkoutForm.name}
                                        onChange={handleCheckoutInput}
                                        required
                                    />
                                </label>
                                <label>
                                    <span>{t('account.phoneNumber')}</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={checkoutForm.phone}
                                        onChange={handleCheckoutInput}
                                        required
                                    />
                                </label>
                                {savedAddresses.length > 0 && (
                                    <label>
                                        <span>{t('checkout.savedAddressLabel')}</span>
                                        <select
                                            name="addressId"
                                            value={checkoutForm.addressId}
                                            onChange={handleAddressSelect}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-300 focus:outline-none"
                                        >
                                            <option value="">{t('checkout.enterNewAddress')}</option>
                                            {savedAddresses.map(address => (
                                                <option key={address.id} value={address.id}>
                                                    {address.label || address.address}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                <label>
                                    <span>{t('checkout.deliveryAddressLabel')}</span>
                                    <textarea
                                        name="address"
                                        rows="2"
                                        value={checkoutForm.address}
                                        onChange={handleCheckoutInput}
                                        required
                                    />
                                </label>
                                <label>
                                    <span>{t('checkout.notesLabel')}</span>
                                    <textarea
                                        name="notes"
                                        rows="2"
                                        value={checkoutForm.notes}
                                        onChange={handleCheckoutInput}
                                    />
                                </label>
                                {checkoutStatus.type === 'error' && (
                                    <p className="cart-alert error" role="status">
                                        {checkoutStatus.message}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    className="cart-submit"
                                    disabled={checkoutSubmitting}
                                >
                                    {checkoutSubmitting ? t('checkout.sending') : t('checkout.orderButton')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
