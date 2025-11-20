import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import useCart from '../../../hooks/useCart';
import {
    getProductById,
    getProductPaths,
} from '../../../lib/products';
import { useLang } from '../../../contexts/LangContext';
import { localizeCategory, localizeProduct } from '../../../lib/localize';

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
    const { lang } = useLang();
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

    const detailVariant =
        localizedProduct.variants[selectedVariantIndex] ?? null;
    const detailPrice = detailVariant?.price ?? localizedProduct.price ?? 0;
    const detailImage =
        localizedProduct.images[activeImageIndex] || localizedProduct.image;

    const addToCart = () => {
        if (localizedProduct.stock === 'out') return;
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
            stock: localizedProduct.stock,
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
            setCheckoutStatus({ message: 'Cart is empty', type: 'error' });
            return;
        }
        if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
            setCheckoutStatus({
                message: 'Name, phone, and address are required.',
                type: 'error',
            });
            return;
        }
        setCheckoutSubmitting(true);
        setCheckoutStatus({ message: 'Sending order…', type: '' });
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
            })),
            total: currentGrandTotal,
            delivery_fee: DELIVERY_FEE,
            currency: OUTPUT_CURRENCY,
        };
        try {
            const hadOnOrderItems = hasOnOrderItem;
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                        Product detail
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Link href="/products" className="hover:underline">
                            Catalog
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
                                    className={`stock-badge ${
                                        localizedProduct.stock === 'in'
                                            ? 'stock-badge--in'
                                            : localizedProduct.stock === 'on-order'
                                                ? 'stock-badge--order'
                                                : 'stock-badge--out'
                                    }`}
                                >
                                    {localizedProduct.stock === 'in'
                                        ? 'In stock'
                                        : localizedProduct.stock === 'on-order'
                                            ? 'On order'
                                            : 'Out of stock'}
                                </span>
                            </div>
                            {localizedProduct.stock === 'on-order' && (
                                <p className="text-sm text-orange-400">
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
                            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
                            onClick={addToCart}
                            disabled={localizedProduct.stock === 'out'}
                        >
                            Add to cart
                        </button>
                    </div>
                </div>
            </main>
            <button id="cartFab" className="cart-fab" type="button" onClick={openCart}>
                <span className="cart-icon" aria-hidden="true">
                    🛒
                </span>
                <span>Cart</span>
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
                        <h3 className="text-lg font-semibold text-gray-900">Your order</h3>
                        <p className="text-sm text-gray-500">
                            Review items then confirm your details.
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
                            <strong>On-demand items</strong>
                            <p className="text-sm">
                                Some items will take longer to arrive—expect a delay until they reach the store.
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
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-cart">Your cart is empty.</p>
                    )}
                </div>
                <div className="cart-summary">
                    <div className="cart-summary-row">
                        <span>Items total</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                    <div className="cart-summary-row">
                        <span>Delivery fee</span>
                        <span>{formatPrice(DELIVERY_FEE)}</span>
                    </div>
                    <div className="cart-summary-row cart-summary-total">
                        <span>Grand total</span>
                        <span>{formatPrice(grandTotal)}</span>
                    </div>
                    <button
                        type="button"
                        className="cart-submit"
                        onClick={openCheckoutModal}
                        disabled={!cart.length}
                    >
                        Checkout
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
                            <h3 className="checkout-modal-title">Checkout</h3>
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
                                    Go to home
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
                                    <span>Full name</span>
                                    <input
                                        type="text"
                                        name="name"
                                        value={checkoutForm.name}
                                        onChange={handleCheckoutInput}
                                        required
                                    />
                                </label>
                                <label>
                                    <span>Phone</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={checkoutForm.phone}
                                        onChange={handleCheckoutInput}
                                        required
                                    />
                                </label>
                                <label>
                                    <span>Delivery address</span>
                                    <textarea
                                        name="address"
                                        rows="2"
                                        value={checkoutForm.address}
                                        onChange={handleCheckoutInput}
                                        required
                                    />
                                </label>
                                <label>
                                    <span>Notes (optional)</span>
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
                                    {checkoutSubmitting ? 'Sending…' : 'Order'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
