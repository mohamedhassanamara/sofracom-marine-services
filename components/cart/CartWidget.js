import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useCart } from '../../contexts/CartContext';
import { useLang } from '../../contexts/LangContext';
import { DELIVERY_FEE, formatPrice } from '../../lib/constants';
import CheckoutModal from './CheckoutModal';
import { imageAt } from '../../lib/images';

// Cart drawer and checkout modal, mounted once by Layout (the header's cart button opens it).
export default function CartWidget() {
    const { t } = useLang();
    const router = useRouter();
    const { cart, loaded, total, updateQuantity, removeItem, isOpen, openCart, closeCart } = useCart();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [onOrderNoticeVisible, setOnOrderNoticeVisible] = useState(false);
    const onOrderNoticeTimeout = useRef(null);

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

    // Back from signing in at checkout (?checkout=1): reopen the cart and checkout.
    useEffect(() => {
        // Wait until the saved cart has been read from storage.
        if (!router.isReady || !loaded || router.query.checkout !== '1') return;
        const { checkout, ...query } = router.query;
        router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
        if (cart.length) {
            openCart();
            setCheckoutOpen(true);
        }
    }, [router, loaded, cart.length, openCart]);

    const openCheckout = () => {
        if (!cart.length) return;
        setCheckoutOpen(true);
    };

    const handleOrderPlaced = ({ hadOnOrderItems }) => {
        closeCart();
        if (hadOnOrderItems) showOnOrderNotice();
    };

    const goHome = () => {
        setCheckoutOpen(false);
        router.push('/');
    };

    return (
        <>
            <div
                id="cartOverlay"
                className={`cart-overlay ${isOpen ? 'active' : ''}`}
                onClick={closeCart}
            />
            <aside
                id="cartDrawer"
                className={`cart-drawer ${isOpen ? 'open' : ''}`}
                aria-hidden={!isOpen}
            >
                <div className="cart-header">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{t('cart.title')}</h3>
                        <p className="text-sm text-slate-500">{t('cart.subtitle')}</p>
                    </div>
                    <button
                        id="cartClose"
                        type="button"
                        aria-label={t('cart.close')}
                        className="text-2xl leading-none text-slate-500 hover:text-slate-800"
                        onClick={closeCart}
                    >
                        ×
                    </button>
                </div>
                {onOrderNoticeVisible && (
                    <div className="cart-onorder-popup" role="alert">
                        <div>
                            <strong>{t('cart.onOrderTitle')}</strong>
                            <p className="text-sm">{t('cart.onOrderBody')}</p>
                        </div>
                        <button
                            type="button"
                            className="cart-onorder-close"
                            aria-label={t('cart.dismiss')}
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
                                <img src={imageAt(item.image, 400)} alt={item.title} loading="lazy" />
                                <div>
                                    <p className="cart-item-title">{item.title}</p>
                                    <p className="text-xs text-slate-500">
                                        {item.variantLabel ? item.variantLabel : item.category}
                                    </p>
                                    <p className="cart-item-price">{formatPrice(item.price)}</p>
                                    <div className="cart-qty mt-2">
                                        <button
                                            type="button"
                                            aria-label={t('cart.decrease')}
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            aria-label={t('cart.quantity')}
                                            value={item.quantity}
                                            onChange={event => {
                                                const value = Number(event.target.value);
                                                if (!Number.isFinite(value)) return;
                                                updateQuantity(item.id, value);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            aria-label={t('cart.increase')}
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="text-xs text-danger-600 ms-3"
                                        >
                                            {t('cart.remove')}
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
                        <span>{t('cart.itemsTotal')}</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                    <div className="cart-summary-row">
                        <span>{t('cart.deliveryFee')}</span>
                        <span>{formatPrice(DELIVERY_FEE)}</span>
                    </div>
                    <div className="cart-summary-row cart-summary-total">
                        <span>{t('cart.grandTotal')}</span>
                        <span>{formatPrice(total + DELIVERY_FEE)}</span>
                    </div>
                    <button
                        type="button"
                        className="cart-submit"
                        onClick={openCheckout}
                        disabled={!cart.length}
                    >
                        {t('cart.checkout')}
                    </button>
                </div>
            </aside>
            {checkoutOpen && (
                <CheckoutModal
                    onClose={() => setCheckoutOpen(false)}
                    onOrderPlaced={handleOrderPlaced}
                    onGoHome={goHome}
                />
            )}
        </>
    );
}
