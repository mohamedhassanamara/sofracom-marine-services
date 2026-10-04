import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCart } from '../../contexts/CartContext';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest, errorMessage } from '../../lib/apiClient';
import AddressFields, { EMPTY_ADDRESS, addressError } from '../account/AddressForm';

const EMPTY_GUEST = { name: '', phone: '', address: '', notes: '', email: '' };
const NEW_ADDRESS = 'new';

export default function CheckoutModal({ onClose, onOrderPlaced, onGoHome }) {
    const { t } = useLang();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { cart, hasOnOrderItem, resetCart } = useCart();
    const [guest, setGuest] = useState(EMPTY_GUEST);
    const [guestChoice, setGuestChoice] = useState(false);
    const [addresses, setAddresses] = useState(null);
    const [addressChoice, setAddressChoice] = useState(NEW_ADDRESS);
    const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
    const [saveAddress, setSaveAddress] = useState(true);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    // Signed-in: load saved addresses, preselect the default, prefill a new address.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        apiRequest('/api/account/profile', { user })
            .then(result => {
                if (cancelled) return;
                setAddresses(result.addresses);
                const preferred = result.profile.defaultAddressId || result.addresses[0]?.id;
                setAddressChoice(preferred || NEW_ADDRESS);
                setNewAddress(current => ({
                    ...current,
                    fullName: current.fullName || result.profile.name || '',
                    phone: current.phone || result.profile.phone || '',
                }));
            })
            .catch(() => !cancelled && setAddresses([]));
        return () => {
            cancelled = true;
        };
    }, [user]);

    const updateGuest = field => event => setGuest({ ...guest, [field]: event.target.value });

    const buildRequest = () => {
        const items = cart.map(item => ({
            id: item.id,
            productId: item.productId,
            variantIndex: item.variantIndex,
            variantLabel: item.variantLabel,
            quantity: item.quantity,
        }));
        if (!user) {
            if (!guest.name.trim() || !guest.phone.trim() || !guest.address.trim()) {
                return { error: t('checkout.errorRequired') };
            }
            return { body: { customer: guest, items } };
        }
        if (addressChoice !== NEW_ADDRESS) {
            return { body: { customer: { notes }, addressId: addressChoice, items } };
        }
        const problem = addressError(newAddress);
        if (problem) return { error: t(problem) };
        return { body: { customer: { notes }, newAddress, saveAddress, items } };
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (!cart.length) {
            setError(t('checkout.errorEmpty'));
            return;
        }
        const request = buildRequest();
        if (request.error) {
            setError(request.error);
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const hadOnOrderItems = hasOnOrderItem;
            const result = await apiRequest('/api/create-order', { method: 'POST', body: request.body, user });
            setGuest(EMPTY_GUEST);
            resetCart();
            setConfirmation({ hadOnOrderItems, orderId: result.orderId, member: Boolean(user) });
            onOrderPlaced({ hadOnOrderItems });
        } catch (err) {
            console.error('[order] submit failed', err);
            setError(errorMessage(t, err, 'checkout.errorGeneric'));
        } finally {
            setSubmitting(false);
        }
    };

    const loginHref = `/account/login?next=${encodeURIComponent(router.asPath)}`;
    const showSignInPrompt = !authLoading && !user && !guestChoice;

    const renderGuestFields = () => (
        <>
            <label>
                <span>{t('checkout.fullName')}</span>
                <input type="text" name="name" value={guest.name} onChange={updateGuest('name')} required />
            </label>
            <label>
                <span>{t('checkout.phone')}</span>
                <input type="tel" name="phone" value={guest.phone} onChange={updateGuest('phone')} required />
            </label>
            <label>
                <span>{t('checkout.address')}</span>
                <textarea name="address" rows="2" value={guest.address} onChange={updateGuest('address')} required />
            </label>
            <label>
                <span>{t('checkout.emailOptional')}</span>
                <input type="email" name="email" value={guest.email} onChange={updateGuest('email')} dir="ltr" />
                <span className="ui-field-hint">{t('checkout.emailHint')}</span>
            </label>
            <label>
                <span>{t('checkout.notes')}</span>
                <textarea name="notes" rows="2" value={guest.notes} onChange={updateGuest('notes')} />
            </label>
        </>
    );

    const renderMemberFields = () => (
        <>
            {addresses === null ? (
                <p className="ui-muted">{t('account.loading')}</p>
            ) : (
                <fieldset className="address-picker">
                    <legend className="text-sm font-semibold mb-1" style={{ color: 'var(--deep-navy)' }}>
                        {t('checkout.deliverTo')}
                    </legend>
                    {addresses.map(address => (
                        <label
                            key={address.id}
                            className={`address-option ${addressChoice === address.id ? 'address-option--active' : ''}`}
                        >
                            <input
                                type="radio"
                                name="addressChoice"
                                checked={addressChoice === address.id}
                                onChange={() => setAddressChoice(address.id)}
                            />
                            <span>
                                <strong>{address.label || address.fullName}</strong>
                                <br />
                                {address.fullName} · <span dir="ltr">{address.phone}</span>
                                <br />
                                {address.line}, {address.city}
                            </span>
                        </label>
                    ))}
                    <label className={`address-option ${addressChoice === NEW_ADDRESS ? 'address-option--active' : ''}`}>
                        <input
                            type="radio"
                            name="addressChoice"
                            checked={addressChoice === NEW_ADDRESS}
                            onChange={() => setAddressChoice(NEW_ADDRESS)}
                        />
                        <span>
                            <strong>{t('checkout.newAddress')}</strong>
                        </span>
                    </label>
                </fieldset>
            )}
            {addressChoice === NEW_ADDRESS && addresses !== null && (
                <div className="ui-card" style={{ padding: '1rem' }}>
                    <AddressFields value={newAddress} onChange={setNewAddress} showLabel={false} />
                    <label className="ui-check mt-3">
                        <input type="checkbox" checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} />
                        {t('checkout.saveAddress')}
                    </label>
                </div>
            )}
            <label>
                <span>{t('checkout.notes')}</span>
                <textarea name="notes" rows="2" value={notes} onChange={event => setNotes(event.target.value)} />
            </label>
        </>
    );

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
                        {confirmation.member && confirmation.orderId && (
                            <Link href={`/account/orders/${confirmation.orderId}`} className="ui-btn ui-btn--secondary mt-3">
                                {t('checkout.trackOrder')}
                            </Link>
                        )}
                        <button type="button" className="cart-submit" onClick={onGoHome}>
                            {t('checkout.goHome')}
                        </button>
                    </div>
                ) : (
                    <form id="checkoutForm" className="cart-form" onSubmit={handleSubmit} noValidate>
                        {showSignInPrompt && (
                            <div className="ui-alert ui-alert--info">
                                <p className="font-semibold">{t('checkout.signInPrompt')}</p>
                                <p className="mt-1">{t('checkout.signInPromptBody')}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <Link href={loginHref} className="ui-btn ui-btn--primary ui-btn--small">
                                        {t('nav.signIn')}
                                    </Link>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--secondary ui-btn--small"
                                        onClick={() => setGuestChoice(true)}
                                    >
                                        {t('checkout.continueGuest')}
                                    </button>
                                </div>
                            </div>
                        )}
                        {user ? renderMemberFields() : renderGuestFields()}
                        {error && (
                            <p className="cart-alert error" role="status">
                                {error}
                            </p>
                        )}
                        <button type="submit" className="cart-submit" disabled={submitting || (user && addresses === null)}>
                            {submitting ? t('checkout.sending') : t('checkout.submit')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
