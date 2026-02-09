import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import useCart from '../../../hooks/useCart';
import {
    getProductById,
    getProductPaths,
} from '../../../lib/products';
import { STOCK_LABEL, getStockBadgeClass } from '../../../lib/stock';
import { useLang } from '../../../contexts/LangContext';
import { useAuth } from '../../../contexts/AuthContext';
import { localizeCategory, localizeProduct } from '../../../lib/localize';
import { useReviews } from '../../../hooks/useReviews';
import ReviewSummary from '../../../components/ReviewSummary';

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

const DATE_LOCALES = {
    en: 'en-US',
    fr: 'fr-FR',
    ar: 'ar-TN',
};

const formatDate = (value, locale = DATE_LOCALES.en) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
};

export async function getStaticPaths() {
    const paths = getProductPaths().map(path => ({
        params: {
            categorySlug: path.categorySlug,
            productId: path.productId,
        },
    }));
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
    return {
        props: {
            product: entry.product,
            category: entry.category,
        },
    };
}

export default function ProductDetailPage({ product, category }) {
    const router = useRouter();
    const { lang, t } = useLang();
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutStatus, setCheckoutStatus] = useState({ message: '', type: '' });
    const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '',
    });
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
    const localizedProduct = useMemo(
        () => localizeProduct(product, lang, category),
        [product, lang, category]
    );
    const { user, token, isAuthenticated } = useAuth();
    const { summary, reviews, loading: reviewsLoading, error: reviewsError, viewer, refresh: refreshReviews } = useReviews(localizedProduct.id, {
        limit: 5,
        token,
    });
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [reviewStatus, setReviewStatus] = useState({ message: '', type: '' });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);


    useEffect(() => {
        return () => {
            if (onOrderNoticeTimeout.current) {
                clearTimeout(onOrderNoticeTimeout.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!viewer?.hasReviewed) {
            return;
        }
        const existingReview = viewer.review || reviews.find(review => review.customer_uid === user?.uid);
        if (!existingReview) return;
        setReviewForm({
            rating: Number(existingReview.rating) || 5,
            comment: existingReview.comment || '',
        });
    }, [reviews, user?.uid, viewer?.hasReviewed, viewer?.review]);

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

    const canSubmitReview = Boolean(isAuthenticated && viewer?.canReview);
    const hasExistingReview = Boolean(viewer?.hasReviewed);
    const reviewCount = Number(summary.count) || 0;
    const reviewCta = hasExistingReview ? t('review.updateReview') : t('review.submitReview');

    const handleReviewSubmit = async event => {
        event.preventDefault();
        if (!isAuthenticated) {
            setReviewStatus({ message: t('review.signInToReview'), type: 'error' });
            return;
        }
        if (!viewer?.canReview) {
            setReviewStatus({ message: t('review.mustPurchase'), type: 'error' });
            return;
        }
        if (!reviewForm.comment.trim()) {
            setReviewStatus({ message: t('review.commentRequired'), type: 'error' });
            return;
        }
        setReviewSubmitting(true);
        setReviewStatus({ message: t('review.submitting'), type: 'info' });
        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    productId: localizedProduct.id,
                    rating: reviewForm.rating,
                    comment: reviewForm.comment.trim(),
                }),
            });
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || 'Unable to submit review');
            }
            setReviewStatus({ message: t('review.thankYou'), type: 'success' });
            await refreshReviews();
        } catch (error) {
            setReviewStatus({ message: error.message || t('review.submitFailed'), type: 'error' });
        } finally {
            setReviewSubmitting(false);
        }
    };

    const detailVariant =
        localizedProduct.variants[selectedVariantIndex] ?? null;
    const detailPrice = detailVariant?.price ?? localizedProduct.price ?? 0;
    const detailImage =
        localizedProduct.images[activeImageIndex] || localizedProduct.image;
    const effectiveStock =
        detailVariant?.stock ?? localizedProduct.stock ?? 'in';

    const addToCart = () => {
        if (effectiveStock === 'out') return;
        const price = detailVariant?.price ?? detailPrice;
        const variantLabel = detailVariant?.label;
        const itemId = variantLabel
            ? `${localizedProduct.id}-${variantLabel}`
            : localizedProduct.id;
        addItem({
            id: itemId,
            title: localizedProduct.title,
            price,
            quantity: 1,
            image: localizedProduct.image,
            category: localizedProduct.categoryName,
            brand: localizedProduct.brand,
            variantLabel,
            stock: effectiveStock,
            productId: localizedProduct.id,
            productUrl: `/products/${category.slug}/${localizedProduct.id}`,
        });
        setCartOpen(true);
    };

    const handleCheckoutInput = event => {
        const { name, value } = event.target;
        setCheckoutForm(form => ({ ...form, [name]: value }));
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
            setCheckoutStatus({
                message: t('checkout.signInRequired'),
                type: 'error',
            });
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
        const productIds = payload.items
            .map(item => item.product_id || item.id)
            .filter(Boolean);
        payload.product_ids = Array.from(new Set(productIds));
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

    const updateCartQty = (id, quantity) => updateQuantity(id, quantity);
    const removeCart = id => removeItem(id);
    const openCart = () => {
        setCartOpen(true);
        setCheckoutStatus({ message: '', type: '' });
    };
    const closeCart = () => setCartOpen(false);
    const openCheckoutModal = () => {
        if (!cart.length) return;
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
        ? 'Order received – delays expected'
        : 'Order received';
    const confirmationSubtitle = orderHadOnOrderItems
        ? 'Order received but may have some delay until on-order items are present in the store.'
        : 'Order received successfully.';

    const description = localizedProduct.description || '';
    const READ_MORE_LENGTH = 320;
    const [showFullDescription, setShowFullDescription] = useState(false);
    const isLongDescription = description.length > READ_MORE_LENGTH;
    const previewDescription = description.slice(0, READ_MORE_LENGTH);

    return (
        <>
            <main className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex flex-col gap-4 mb-6">
                        <p className="text-sm text-gray-500 uppercase tracking-wide">
                            {t('product.detailLabel')}
                        </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Link href="/products" className="hover:underline">
                            {t('product.detailBreadcrumbCatalog')}
                        </Link>
                        <span>/</span>
                        <Link href={`/products/${category.slug}`} className="hover:underline">
                            {localizedCategory.name}
                        </Link>
                        <span>/</span>
                        <span className="font-semibold text-gray-700">
                            {localizedProduct.title}
                        </span>
                    </div>
                </div>
                <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                        <img
                            src={detailImage}
                            alt={localizedProduct.title}
                            className="w-full h-96 object-contain rounded-2xl bg-gray-50"
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
                                                ? 'border-blue-500'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        <img
                                            src={src}
                                            alt={`${localizedProduct.title}-${index}`}
                                            className="w-full h-full object-cover rounded-2xl"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-5">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                {localizedProduct.categoryName}
                            </p>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {localizedProduct.title}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {localizedProduct.brand}
                            </p>
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
                                <span className="text-4xl font-bold text-gray-900">
                                    {formatPrice(detailPrice)}
                                </span>
                                <span
                                    className={`stock-badge ${getStockBadgeClass(effectiveStock)}`}
                                >
                                    {STOCK_LABEL[effectiveStock] || 'Unknown'}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <ReviewSummary average={summary.average} count={reviewCount} fontSize={14} />
                                <span className="text-xs text-gray-500">
                                    {reviewCount
                                        ? `${reviewCount} ${t('review.reviewsLabel')}`
                                        : t('review.noReviews')}
                                </span>
                            </div>
                            {effectiveStock === 'on-order' && (
                                <p className="text-sm text-orange-400">
                                    {t('product.detailOnOrder')}
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
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {showFullDescription
                                ? description
                                : `${previewDescription}${isLongDescription ? '…' : ''}`}
                        </p>
                        {isLongDescription && (
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    type="button"
                                    className="text-blue-600 hover:underline text-sm font-semibold"
                                    onClick={() => setShowFullDescription(prev => !prev)}
                                >
                                    {showFullDescription ? t('product.detailShowLess') : t('product.detailReadMore')}
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
                                        {t('product.datasheet')}
                                    </a>
                            </div>
                        )}
                        <button
                            type="button"
                            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
                            onClick={addToCart}
                            disabled={effectiveStock === 'out'}
                        >
                            {t('product.addToCart')}
                        </button>
                        <section id="reviews" className="mt-10 space-y-6 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">
                                        {t('review.sectionTitle')}
                                    </p>
                                    <h2 className="text-2xl font-semibold text-gray-900">
                                        {t('review.sectionSubtitle')}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ReviewSummary
                                        average={summary.average}
                                        count={reviewCount}
                                        fontSize={16}
                                    />
                                    <span className="text-xs text-gray-500">
                                        {reviewCount
                                            ? `${reviewCount} ${t('review.reviewsLabel')}`
                                            : t('review.noReviews')}
                                    </span>
                                </div>
                            </div>
                                <div className="border-t border-gray-100 pt-4 space-y-4">
                                    {reviews.length ? (
                                        reviews.map(review => (
                                            <article
                                                key={review.id}
                                                className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                                        >
                                            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-gray-500">
                                                <ReviewSummary
                                                    average={Number(review.rating) || 0}
                                                    count={0}
                                                    fontSize={14}
                                                    showCount={false}
                                                />
                                                <span>{formatDate(review.created_at, DATE_LOCALES[lang] || DATE_LOCALES.en)}</span>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
                                            <p className="mt-2 text-xs text-gray-500">
                                                {review.customer_name}
                                            </p>
                                            </article>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500">{t('review.noReviews')}</p>
                                    )}
                                </div>
                                {reviewsError && (
                                    <p className="quote-status error" role="alert">
                                        {reviewsError}
                                    </p>
                                )}
                            {canSubmitReview && (
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {t('review.writeTitle')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {t('review.youPurchased')}
                                    </p>
                                    <form className="mt-3 space-y-3" onSubmit={handleReviewSubmit}>
                                        <div className="space-y-1 text-sm font-semibold text-gray-700">
                                            <span>{t('review.ratingLabel')}</span>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(value => (
                                                    <button
                                                        key={`rating-${value}`}
                                                        type="button"
                                                        onClick={() =>
                                                            setReviewForm(form => ({
                                                                ...form,
                                                                rating: value,
                                                            }))
                                                        }
                                                        className={`rounded-full px-2 py-1 text-lg ${
                                                            reviewForm.rating >= value
                                                                ? 'text-amber-400'
                                                                : 'text-gray-300'
                                                        }`}
                                                        aria-label={`${value} star`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <label className="block text-sm font-semibold text-gray-700">
                                            <span>{t('review.commentLabel')}</span>
                                            <textarea
                                                rows="3"
                                                value={reviewForm.comment}
                                                onChange={event =>
                                                    setReviewForm(form => ({
                                                        ...form,
                                                        comment: event.target.value,
                                                    }))
                                                }
                                                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none"
                                                placeholder={t('review.commentPlaceholder')}
                                                required
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            className="inline-flex w-full items-center justify-center rounded-full bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-60"
                                            disabled={reviewSubmitting}
                                        >
                                            {reviewSubmitting
                                                ? t('review.submitting')
                                                : reviewCta}
                                        </button>
                                        {reviewStatus.message && (
                                            <p
                                                className={`quote-status ${reviewStatus.type}`.trim()}
                                                role="status"
                                                aria-live="polite"
                                            >
                                                {reviewStatus.message}
                                            </p>
                                        )}
                                    </form>
                                </div>
                            )}
                        </section>
                    </div>
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
                        <h3 className="text-lg font-semibold text-gray-900">{t('cart.title')}</h3>
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
                            <div className="cart-item" key={item.id} data-id={item.id}>
                                <img src={item.image} alt={item.title} />
                                <div>
                                    <p className="cart-item-title">{item.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {item.variantLabel ? item.variantLabel : item.category}
                                    </p>
                                    <p className="cart-item-price">
                                        {formatPrice(item.price)}
                                    </p>
                                    <div className="cart-qty mt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateCartQty(item.id, item.quantity - 1)
                                            }
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={event => {
                                                const value = Number(event.target.value);
                                                if (!Number.isFinite(value)) return;
                                                updateCartQty(item.id, value);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateCartQty(item.id, item.quantity + 1)
                                            }
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeCart(item.id)}
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
