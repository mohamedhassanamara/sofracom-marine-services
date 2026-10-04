import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useLang } from '../../contexts/LangContext';
import { apiRequest, errorMessage } from '../../lib/apiClient';

const EMPTY_FORM = { name: '', phone: '', address: '', notes: '' };

export default function CheckoutModal({ onClose, onOrderPlaced, onGoHome }) {
    const { t } = useLang();
    const { cart, hasOnOrderItem, resetCart } = useCart();
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    const handleInput = event => {
        const { name, value } = event.target;
        setForm(current => ({ ...current, [name]: value }));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (!cart.length) {
            setError(t('checkout.errorEmpty'));
            return;
        }
        if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
            setError(t('checkout.errorRequired'));
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const hadOnOrderItems = hasOnOrderItem;
            const result = await apiRequest('/api/create-order', {
                method: 'POST',
                body: {
                    customer: form,
                    items: cart.map(item => ({
                        id: item.id,
                        productId: item.productId,
                        variantIndex: item.variantIndex,
                        variantLabel: item.variantLabel,
                        quantity: item.quantity,
                    })),
                },
            });
            setForm(EMPTY_FORM);
            resetCart();
            setConfirmation({ hadOnOrderItems, orderId: result.orderId });
            onOrderPlaced({ hadOnOrderItems });
        } catch (err) {
            console.error('[order] submit failed', err);
            setError(errorMessage(t, err, 'checkout.errorGeneric'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="checkout-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="checkout-modal" onClick={event => event.stopPropagation()}>
                <header className="checkout-modal-header">
                    <h3 className="checkout-modal-title">{t('checkout.title')}</h3>
                    <button
                        type="button"
                        className="checkout-modal-close"
                        aria-label={t('checkout.close')}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>
                {confirmation ? (
                    <div className="checkout-confirmation">
                        <p className="text-base font-semibold text-gray-900">
                            {confirmation.hadOnOrderItems
                                ? t('checkout.confirmTitleDelayed')
                                : t('checkout.confirmTitle')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            {confirmation.hadOnOrderItems
                                ? t('checkout.confirmBodyDelayed')
                                : t('checkout.confirmBody')}
                        </p>
                        <button type="button" className="cart-submit" onClick={onGoHome}>
                            {t('checkout.goHome')}
                        </button>
                    </div>
                ) : (
                    <form id="checkoutForm" className="cart-form" onSubmit={handleSubmit} noValidate>
                        <label>
                            <span>{t('checkout.fullName')}</span>
                            <input type="text" name="name" value={form.name} onChange={handleInput} required />
                        </label>
                        <label>
                            <span>{t('checkout.phone')}</span>
                            <input type="tel" name="phone" value={form.phone} onChange={handleInput} required />
                        </label>
                        <label>
                            <span>{t('checkout.address')}</span>
                            <textarea name="address" rows="2" value={form.address} onChange={handleInput} required />
                        </label>
                        <label>
                            <span>{t('checkout.notes')}</span>
                            <textarea name="notes" rows="2" value={form.notes} onChange={handleInput} />
                        </label>
                        {error && (
                            <p className="cart-alert error" role="status">
                                {error}
                            </p>
                        )}
                        <button type="submit" className="cart-submit" disabled={submitting}>
                            {submitting ? t('checkout.sending') : t('checkout.submit')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
