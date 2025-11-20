import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import useCart from '../../hooks/useCart';
import { getCategories } from '../../lib/products';
import { useLang } from '../../contexts/LangContext';
import { localizeCategory } from '../../lib/localize';

export function getStaticProps() {
    const categories = getCategories();
    return {
        props: {
            categories,
        },
    };
}

const DELIVERY_FEE = 7;

const formatPrice = value => {
    if (!Number.isFinite(value)) {
        return `${value || 0} TND`;
    }
    return new Intl.NumberFormat('fr-TN', {
        style: 'currency',
        currency: 'TND',
    }).format(value);
};

export default function ProductsIndex({ categories = [] }) {
    const { lang } = useLang();
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [checkoutStatus, setCheckoutStatus] = useState({ message: '', type: '' });
    const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '',
    });
    const router = useRouter();
    const [orderConfirmationVisible, setOrderConfirmationVisible] = useState(false);
    const [orderHadOnOrderItems, setOrderHadOnOrderItems] = useState(false);
    const { cart, addItem, updateQuantity, removeItem, total, count, hasOnOrderItem, resetCart } = useCart();
    const [onOrderNoticeVisible, setOnOrderNoticeVisible] = useState(false);
    const onOrderNoticeTimeout = useRef(null);
    const localizedCategories = useMemo(
        () => categories.map(category => localizeCategory(category, lang)),
        [categories, lang]
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

    const openCart = () => {
        setCartOpen(true);
        setCheckoutStatus({ message: '', type: '' });
    };

    const closeCart = () => setCartOpen(false);

    const openCheckoutModal = () => {
        if (!cart.length) return;
        setCheckoutStatus({ message: '', type: '' });
        setOrderConfirmationVisible(false);
        setCheckoutModalOpen(true);
    };

    const closeCheckoutModal = () => {
        setCheckoutModalOpen(false);
        setOrderConfirmationVisible(false);
        setCheckoutStatus({ message: '', type: '' });
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
            currency: 'TND',
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

    return (
        <>
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">SOFRACOM Catalog</p>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                        Explore categories & products
                    </h1>
                    <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                        Browse the latest antifouling systems, sealants, oils, batteries, and hardware supplied from Monastir.
                    </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localizedCategories.map(category => (
                        <Link
                            key={category.slug}
                            href={`/products/${category.slug}`}
                            className="product-card space-y-4 p-6 bg-white rounded-3xl shadow hover:shadow-xl transition transform hover:-translate-y-1"
                            data-tilt
                        >
                            <img src={category.image} alt={category.name} className="card-img" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{category.description}</p>
                            </div>
                            <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                                <span>{category.products.length} products</span>
                                <span className="tag px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">View</span>
                            </div>
                        </Link>
                    ))}
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
                        <p className="text-sm text-gray-500">Review items then confirm your details.</p>
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
                                    <p className="cart-item-price">{formatPrice(item.price)}</p>
                                    <div className="cart-qty mt-2">
                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={event => {
                                                const value = Number(event.target.value);
                                                if (!Number.isFinite(value)) return;
                                                updateQuantity(item.id, value);
                                            }}
                                        />
                                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
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
                        <span>{formatPrice(total + DELIVERY_FEE)}</span>
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
                                <p className="text-base font-semibold text-gray-900">{confirmationTitle}</p>
                                <p className="text-sm text-gray-600 mt-1">{confirmationSubtitle}</p>
                                <button type="button" className="cart-submit" onClick={goHome}>
                                    Go to home
                                </button>
                            </div>
                        ) : (
                            <form id="checkoutForm" className="cart-form" onSubmit={handleCheckoutSubmit} noValidate>
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
                                <button type="submit" className="cart-submit" disabled={checkoutSubmitting}>
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
