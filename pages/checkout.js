import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import AddressFields, { EMPTY_ADDRESS, addressErrors } from '../components/account/AddressForm';
import Seo from '../components/Seo';
import { Breadcrumb, Button, Card, Checkbox, EmptyState, Field, Input, Price, Textarea } from '../components/ui';
import { cx } from '../components/ui/cx';
import { AlertTriangle, Check, CheckCircle2, Icon, Info, ShoppingCart, Truck } from '../components/ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { apiRequest, errorMessage } from '../lib/apiClient';
import { DELIVERY_FEE } from '../lib/constants';
import { imageAt } from '../lib/images';
import useFormat from '../hooks/useFormat';
import { authLink } from '../lib/redirect';

const LAST_ORDER_KEY = 'sofracom.lastOrder.v1';
const EMPTY_GUEST = { name: '', phone: '', email: '', line: '', city: '', notes: '' };
const NEW_ADDRESS = 'new';
const digits = value => String(value || '').replace(/\D/g, '');

const guestErrors = guest => {
    const errors = {};
    if (guest.name.trim().length < 2) errors.name = 'checkout.errorName';
    if (digits(guest.phone).length < 8) errors.phone = 'checkout.errorPhone';
    if (guest.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())) errors.email = 'checkout.errorEmail';
    if (guest.line.trim().length < 4) errors.line = 'checkout.errorStreet';
    if (guest.city.trim().length < 2) errors.city = 'checkout.errorCity';
    return errors;
};

const readLastOrder = ref => {
    try {
        const saved = JSON.parse(window.sessionStorage.getItem(LAST_ORDER_KEY) || 'null');
        return saved && saved.ref === ref ? saved : null;
    } catch {
        return null;
    }
};

function Summary({ cart, total, submitting, hasOnOrderItem }) {
    const { t } = useLang();
    const { openCart } = useCart();
    const format = useFormat();
    const grand = total + DELIVERY_FEE;
    return (
        <Card as="aside" aria-labelledby="summary-title" className="lg:sticky lg:top-32">
            <div className="flex items-center justify-between gap-3">
                <h2 id="summary-title" className="text-lg font-semibold text-navy-900">
                    {t('checkout.summary')}
                </h2>
                <button type="button" onClick={openCart} className="text-sm font-semibold text-accent-700 hover:underline">
                    {t('cart.edit')}
                </button>
            </div>
            <ul className="mt-4 divide-y divide-slate-200">
                {cart.map(item => (
                    <li key={item.id} className="flex gap-3 py-3">
                        <span className="relative shrink-0">
                            <img src={imageAt(item.image, 400)} alt="" className="h-14 w-14 rounded-md border border-slate-200 bg-white object-contain p-0.5" />
                            <span className="absolute -end-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-navy-900 px-1 text-xs font-bold text-white">{item.quantity}</span>
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                            <span className="line-clamp-2 font-medium text-slate-900">{item.title}</span>
                            {item.variantLabel && <span className="text-slate-600">{item.variantLabel}</span>}
                        </span>
                        <Price value={item.price * item.quantity} size="sm" />
                    </li>
                ))}
            </ul>
            <dl className="mt-2 space-y-1.5 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between">
                    <dt className="text-slate-600">{t('cart.itemsTotal')}</dt>
                    <dd>
                        <Price value={total} size="sm" />
                    </dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-slate-600">{t('cart.deliveryFee')}</dt>
                    <dd>
                        <Price value={DELIVERY_FEE} size="sm" />
                    </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                    <dt className="font-semibold">{t('cart.grandTotal')}</dt>
                    <dd>
                        <Price value={grand} size="lg" />
                    </dd>
                </div>
            </dl>
            {hasOnOrderItem && (
                <p className="mt-4 flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-800">
                    <Icon as={Info} size={18} className="mt-0.5" />
                    {t('cart.onOrderBody')}
                </p>
            )}
            <Button type="submit" form="checkout-form" size="lg" fullWidth loading={submitting} className="mt-5">
                {submitting ? t('checkout.placing') : t('checkout.place', { total: format.price(grand) })}
            </Button>
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                <Icon as={Truck} size={18} className="mt-0.5 shrink-0 text-navy-700" />
                {t('checkout.payment')}
            </p>
        </Card>
    );
}

function Confirmation({ order }) {
    const { t } = useLang();
    const [copied, setCopied] = useState(false);
    const heading = useRef(null);
    useEffect(() => heading.current?.focus(), []);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(order.ref);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard unavailable: the ref stays visible
        }
    };
    const signupParams = new URLSearchParams({ next: '/account/orders' });
    if (order.guest?.name) signupParams.set('name', order.guest.name);
    if (order.guest?.email) signupParams.set('email', order.guest.email);
    else if (order.guest?.phone) signupParams.set('phone', order.guest.phone);

    return (
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
            <Card padding="lg" className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-700">
                    <Icon as={CheckCircle2} size={32} />
                </span>
                <h1 ref={heading} tabIndex={-1} className="mt-4 text-2xl font-bold text-navy-900 focus:outline-none sm:text-3xl">
                    {t('confirm.title')}
                </h1>
                <div className="mx-auto mt-6 max-w-sm rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 p-4">
                    <p className="text-sm font-medium text-slate-700">{t('confirm.refLabel')}</p>
                    <p className="mt-1 flex items-center justify-center gap-3">
                        <bdi dir="ltr" className="font-mono text-3xl font-bold tracking-wider text-navy-900">
                            {order.ref}
                        </bdi>
                        <Button size="sm" variant="secondary" icon={copied ? Check : undefined} onClick={copy}>
                            {copied ? t('confirm.copied') : t('confirm.copy')}
                        </Button>
                    </p>
                </div>
                <p className="mt-4 text-slate-700">{t('confirm.keepRef')}</p>
                <p className="mt-1 text-slate-700">{t('confirm.next')}</p>
                {order.hadOnOrderItems && (
                    <p className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-md bg-warning-50 p-3 text-start text-sm text-warning-800">
                        <Icon as={Info} size={18} className="mt-0.5" />
                        {t('checkout.confirmBodyDelayed')}
                    </p>
                )}
                <p className="mt-6 text-sm text-slate-600">
                    {t('confirm.total')}: <Price value={order.total} />
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Button href={`/track?ref=${encodeURIComponent(order.ref)}`}>{t('confirm.track')}</Button>
                    {order.member && (
                        <Button href="/account/orders" variant="secondary">
                            {t('confirm.viewAccount')}
                        </Button>
                    )}
                    <Button href="/products" variant="ghost">
                        {t('cart.continue')}
                    </Button>
                </div>
            </Card>
            {!order.member && (
                <Card className="mt-6">
                    <h2 className="text-lg font-semibold text-navy-900">{t('confirm.accountTitle')}</h2>
                    <p className="mt-1 text-slate-700">{t('confirm.accountBody')}</p>
                    <Button href={`/account/signup?${signupParams.toString()}`} variant="secondary" className="mt-4">
                        {t('confirm.createAccount')}
                    </Button>
                </Card>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    const { t } = useLang();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { cart, loaded, total, hasOnOrderItem, resetCart } = useCart();
    const [guest, setGuest] = useState(EMPTY_GUEST);
    const [addresses, setAddresses] = useState(null);
    const [addressChoice, setAddressChoice] = useState(NEW_ADDRESS);
    const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
    const [saveAddress, setSaveAddress] = useState(true);
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [placed, setPlaced] = useState(null);
    const summaryRef = useRef(null);

    // A confirmation survives a refresh (sessionStorage), keyed by ?placed=REF.
    useEffect(() => {
        if (!router.isReady) return;
        const ref = typeof router.query.placed === 'string' ? router.query.placed : '';
        setPlaced(ref ? readLastOrder(ref) : null);
    }, [router.isReady, router.query.placed]);

    // Signed-in: saved addresses (default preselected) and a prefilled new address.
    useEffect(() => {
        if (!user) return undefined;
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

    const errorList = useMemo(() => Object.entries(errors), [errors]);
    const updateGuest = field => event => setGuest({ ...guest, [field]: event.target.value });
    const fieldError = key => (errors[key] ? t(errors[key]) : undefined);

    const validate = () => {
        if (!user) return guestErrors(guest);
        if (addressChoice !== NEW_ADDRESS) return {};
        return Object.fromEntries(Object.entries(addressErrors(newAddress)).map(([field, key]) => [`address-${field}`, key]));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (!cart.length || submitting) return;
        const problems = validate();
        setErrors(problems);
        setServerError('');
        if (Object.keys(problems).length) {
            requestAnimationFrame(() => summaryRef.current?.focus());
            return;
        }
        const items = cart.map(item => ({ id: item.id, productId: item.productId, variantIndex: item.variantIndex, variantLabel: item.variantLabel, quantity: item.quantity }));
        let body;
        if (!user) {
            body = { customer: { name: guest.name, phone: guest.phone, email: guest.email, address: `${guest.line.trim()}, ${guest.city.trim()}`, notes: guest.notes }, items };
        } else if (addressChoice !== NEW_ADDRESS) {
            body = { customer: { notes }, addressId: addressChoice, items };
        } else {
            body = { customer: { notes }, newAddress, saveAddress, items };
        }
        setSubmitting(true);
        try {
            const result = await apiRequest('/api/create-order', { method: 'POST', body, user });
            const order = {
                ref: result.ref,
                total: result.total,
                hadOnOrderItems: hasOnOrderItem,
                member: Boolean(user),
                guest: user ? null : { name: guest.name.trim(), email: guest.email.trim(), phone: guest.phone.trim() },
            };
            try {
                window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
            } catch {
                // storage unavailable: the confirmation still shows until the page is left
            }
            setPlaced(order);
            resetCart();
            router.replace({ pathname: '/checkout', query: { placed: result.ref } }, undefined, { shallow: true, scroll: true });
        } catch (err) {
            setServerError(errorMessage(t, err, 'checkout.errorGeneric'));
            requestAnimationFrame(() => summaryRef.current?.focus());
        } finally {
            setSubmitting(false);
        }
    };

    if (placed) {
        return (
            <>
                <Seo title={t('confirm.title')} noindex />
                <Confirmation order={placed} />
            </>
        );
    }

    return (
        <>
            <Seo title={t('checkout.pageTitle')} path="/checkout" noindex />
            <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('checkout.pageTitle') }]} />
                <h1 className="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">{t('checkout.pageTitle')}</h1>

                {loaded && !cart.length ? (
                    <EmptyState className="mt-8" icon={ShoppingCart} title={t('checkout.emptyTitle')} description={t('cart.emptyBody')} action={<Button href="/products">{t('home.hero.shop')}</Button>} />
                ) : (
                    <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
                        <form id="checkout-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
                            {(errorList.length > 0 || serverError) && (
                                <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-danger-800 focus:outline-none">
                                    <p className="flex items-center gap-2 font-semibold">
                                        <Icon as={AlertTriangle} size={18} />
                                        {serverError || t('checkout.errorSummary')}
                                    </p>
                                    {errorList.length > 0 && (
                                        <ul className="ms-7 mt-2 list-disc space-y-1 text-sm">
                                            {errorList.map(([field, key]) => (
                                                <li key={field}>
                                                    <a href={`#checkout-${field}`} className="underline">
                                                        {t(key)}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {!authLoading && !user && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-200 bg-navy-50 p-4">
                                    <p className="text-sm text-navy-900">{t('checkout.signInPrompt')}</p>
                                    <Button href={authLink('login', '/checkout')} variant="secondary" size="sm">
                                        {t('nav.signIn')}
                                    </Button>
                                </div>
                            )}

                            <Card>
                                <h2 className="text-lg font-semibold text-navy-900">{t('checkout.contact')}</h2>
                                {!user ? (
                                    <div className="mt-4 grid gap-4">
                                        <p className="text-sm text-slate-600">{t('checkout.guestNote')}</p>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <Field id="checkout-name" label={t('checkout.fullName')} required error={fieldError('name')}>
                                                <Input autoComplete="name" value={guest.name} onChange={updateGuest('name')} maxLength={120} />
                                            </Field>
                                            <Field id="checkout-phone" label={t('checkout.phone')} required hint={t('checkout.phoneHint')} error={fieldError('phone')}>
                                                <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={guest.phone} onChange={updateGuest('phone')} maxLength={40} />
                                            </Field>
                                        </div>
                                        <Field id="checkout-email" label={t('checkout.emailOptional')} hint={t('checkout.emailHint')} error={fieldError('email')}>
                                            <Input type="email" autoComplete="email" dir="ltr" value={guest.email} onChange={updateGuest('email')} maxLength={200} />
                                        </Field>
                                        <Field id="checkout-line" label={t('checkout.street')} required error={fieldError('line')}>
                                            <Input autoComplete="street-address" value={guest.line} onChange={updateGuest('line')} maxLength={300} />
                                        </Field>
                                        <Field id="checkout-city" label={t('checkout.city')} required error={fieldError('city')}>
                                            <Input autoComplete="address-level2" value={guest.city} onChange={updateGuest('city')} maxLength={80} />
                                        </Field>
                                        <Field id="checkout-notes" label={t('checkout.notes')}>
                                            <Textarea rows={3} value={guest.notes} onChange={updateGuest('notes')} maxLength={1000} />
                                        </Field>
                                    </div>
                                ) : addresses === null ? (
                                    <p className="mt-4 text-slate-600">{t('account.loading')}</p>
                                ) : (
                                    <div className="mt-4 grid gap-4">
                                        <fieldset>
                                            <legend className="mb-2 text-sm font-semibold text-slate-900">{t('checkout.deliverTo')}</legend>
                                            <div className="grid gap-2">
                                                {[...addresses, { id: NEW_ADDRESS }].map(address => {
                                                    const checked = addressChoice === address.id;
                                                    return (
                                                        <label key={address.id} className={cx('flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors duration-fast', checked ? 'border-navy-900 bg-navy-50' : 'border-slate-200 hover:border-slate-300')}>
                                                            <input type="radio" name="addressChoice" className="mt-1 h-5 w-5 accent-navy-900" checked={checked} onChange={() => setAddressChoice(address.id)} />
                                                            {address.id === NEW_ADDRESS ? (
                                                                <span className="font-semibold text-slate-900">{t('checkout.newAddress')}</span>
                                                            ) : (
                                                                <span className="text-sm text-slate-700">
                                                                    <span className="block font-semibold text-slate-900">{address.label || address.fullName}</span>
                                                                    {address.fullName} · <bdi dir="ltr">{address.phone}</bdi>
                                                                    <span className="block">
                                                                        {address.line}, {address.city}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </fieldset>
                                        {addressChoice === NEW_ADDRESS && (
                                            <div className="rounded-lg border border-slate-200 p-4">
                                                <AddressFields
                                                    value={newAddress}
                                                    onChange={setNewAddress}
                                                    showLabel={false}
                                                    idPrefix="checkout-address"
                                                    errors={Object.fromEntries(Object.entries(errors).filter(([key]) => key.startsWith('address-')).map(([key, value]) => [key.slice(8), value]))}
                                                />
                                                <Checkbox className="mt-4" label={t('checkout.saveAddress')} checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} />
                                            </div>
                                        )}
                                        <Field id="checkout-notes" label={t('checkout.notes')}>
                                            <Textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} />
                                        </Field>
                                    </div>
                                )}
                            </Card>
                        </form>
                        <Summary cart={cart} total={total} submitting={submitting} hasOnOrderItem={hasOnOrderItem} />
                    </div>
                )}
            </div>
        </>
    );
}
