import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import AddressFields, { EMPTY_ADDRESS, addressErrors } from '../components/account/AddressForm';
import Seo from '../components/Seo';
import { Breadcrumb, Button, Checkbox, EmptyState, Field, Input, Price, Textarea } from '../components/ui';
import { cx } from '../components/ui/cx';
import { AlertTriangle, Check, ChevronDown, Icon, Info, ShoppingCart, Truck } from '../components/ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { apiRequest, errorMessage } from '../lib/apiClient';
import { DELIVERY_FEE } from '../lib/constants';
import { imageAt, photoClass } from '../lib/images';
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

// Items with thumbnails on the neutral well, and the totals.
function SummaryItems({ cart, total }) {
    const { t } = useLang();
    const { openCart } = useCart();
    return (
        <>
            <ul className="divide-y divide-line">
                {cart.map(item => (
                    <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0">
                        <span className="relative shrink-0">
                            <img src={imageAt(item.image, 400)} alt="" className={cx('h-16 w-16 rounded-xl bg-surface object-contain p-1.5', photoClass(item.image))} />
                            <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-navy-900 px-1 text-xs font-semibold text-white">{item.quantity}</span>
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                            <span className="line-clamp-2 font-medium text-ink">{item.title}</span>
                            {item.variantLabel && <span className="text-ink-muted">{item.variantLabel}</span>}
                        </span>
                        <Price value={item.price * item.quantity} size="sm" />
                    </li>
                ))}
            </ul>
            <dl className="mt-2 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                    <dt className="text-ink-muted">{t('cart.itemsTotal')}</dt>
                    <dd>
                        <Price value={total} size="sm" />
                    </dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-ink-muted">{t('cart.deliveryFee')}</dt>
                    <dd>
                        <Price value={DELIVERY_FEE} size="sm" />
                    </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-line pt-3 text-base">
                    <dt className="font-semibold">{t('cart.grandTotal')}</dt>
                    <dd>
                        <Price value={total + DELIVERY_FEE} size="lg" />
                    </dd>
                </div>
            </dl>
            <button type="button" onClick={openCart} className="mt-4 text-sm font-semibold text-navy-900 underline-offset-4 hover:underline">
                {t('cart.edit')}
            </button>
        </>
    );
}

// Desktop: the sticky summary on the end side.
function SummaryAside({ cart, total, hasOnOrderItem }) {
    const { t } = useLang();
    return (
        <aside aria-labelledby="summary-title" className="hidden rounded-2xl bg-surface p-7 lg:sticky lg:top-24 lg:block">
            <h2 id="summary-title" className="mb-5 text-xl font-semibold text-ink">
                {t('checkout.summary')}
            </h2>
            <SummaryItems cart={cart} total={total} />
            {hasOnOrderItem && (
                <p className="mt-5 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
                    <Icon as={Info} size={18} className="mt-0.5 shrink-0" />
                    {t('cart.onOrderBody')}
                </p>
            )}
        </aside>
    );
}

// Phones: the same summary, collapsed under the title (total always visible).
function SummaryCollapsible({ cart, total }) {
    const { t } = useLang();
    return (
        <details className="group mt-6 rounded-2xl bg-surface lg:hidden">
            <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-3 px-5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon as={ShoppingCart} size={18} />
                    {t('checkout.showSummary')} · {t('cart.items', { count: cart.reduce((sum, item) => sum + item.quantity, 0) })}
                    <Icon as={ChevronDown} size={18} className="transition-transform duration-fast group-open:rotate-180" />
                </span>
                <Price value={total + DELIVERY_FEE} size="md" />
            </summary>
            <div className="px-5 pb-5">
                <SummaryItems cart={cart} total={total} />
            </div>
        </details>
    );
}

// The three steps, as numbered sections; the indicator follows focus.
const STEPS = [
    { id: 'contact', key: 'checkout.stepContact' },
    { id: 'delivery', key: 'checkout.stepDelivery' },
    { id: 'review', key: 'checkout.stepReview' },
];

function StepIndicator({ current }) {
    const { t } = useLang();
    return (
        <nav aria-label={t('checkout.steps')} className="mt-6">
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                {STEPS.map((step, index) => {
                    const active = step.id === current;
                    const done = STEPS.findIndex(item => item.id === current) > index;
                    return (
                        <li key={step.id} className="flex items-center gap-3">
                            <a href={`#step-${step.id}`} aria-current={active ? 'step' : undefined} className={cx('inline-flex items-center gap-2 font-medium', active ? 'text-ink' : 'text-ink-muted hover:text-ink')}>
                                <span className={cx('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold', active ? 'bg-navy-900 text-white' : done ? 'bg-accent-400 text-navy-950' : 'border border-line-input text-ink-muted')}>
                                    {done ? <Icon as={Check} size={14} /> : index + 1}
                                </span>
                                {t(step.key)}
                            </a>
                            {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-line-strong sm:w-10" />}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

function Step({ id, number, title, children }) {
    return (
        <section id={`step-${id}`} data-step={id} aria-labelledby={`step-${id}-title`} className="scroll-mt-24 border-t border-line pt-8 first:border-t-0 first:pt-0">
            <h2 id={`step-${id}-title`} className="flex items-center gap-3 text-xl font-semibold text-ink">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 font-sans text-sm font-semibold text-navy-900">{number}</span>
                {title}
            </h2>
            <div className="mt-6">{children}</div>
        </section>
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
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-24">
            <div className="text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-900">
                    <Icon as={Check} size={30} />
                </span>
                <h1 ref={heading} tabIndex={-1} className="mt-6 text-[2rem] font-semibold leading-tight text-ink focus:outline-none lg:text-title-1">
                    {t('confirm.title')}
                </h1>
                <p className="mt-8 text-sm font-medium uppercase tracking-[0.12em] text-ink-muted">{t('confirm.refLabel')}</p>
                <p className="mt-2 flex flex-wrap items-center justify-center gap-4">
                    <bdi dir="ltr" className="font-display text-[2.75rem] font-semibold tracking-[0.04em] text-navy-900 sm:text-display-2">
                        {order.ref}
                    </bdi>
                    <Button size="sm" variant="secondary" icon={copied ? Check : undefined} onClick={copy}>
                        {copied ? t('confirm.copied') : t('confirm.copy')}
                    </Button>
                </p>
                <p className="mx-auto mt-4 max-w-md text-ink-muted">{t('confirm.keepRef')}</p>
                <p className="mt-2 text-sm text-ink-muted">
                    {t('confirm.total')}: <Price value={order.total} size="sm" />
                </p>
                {order.hadOnOrderItems && (
                    <p className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-xl bg-warning-50 p-3 text-start text-sm text-warning-800">
                        <Icon as={Info} size={18} className="mt-0.5 shrink-0" />
                        {t('checkout.confirmBodyDelayed')}
                    </p>
                )}
            </div>

            <section aria-labelledby="next-title" className="mt-14 rounded-2xl bg-surface p-6 sm:p-10">
                <h2 id="next-title" className="text-xl font-semibold text-ink">
                    {t('confirm.nextTitle')}
                </h2>
                <ol className="mt-6 grid gap-6 sm:grid-cols-3">
                    {[1, 2, 3].map(step => (
                        <li key={step} className="border-t-2 border-accent-400 pt-4">
                            <span className="text-sm font-semibold text-accent-700" aria-hidden="true">
                                {String(step).padStart(2, '0')}
                            </span>
                            <span className="mt-2 block font-semibold text-ink">{t(`confirm.step${step}.title`)}</span>
                            <span className="mt-1 block text-sm text-ink-muted">{t(`confirm.step${step}.body`)}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Button size="lg" href={`/track?ref=${encodeURIComponent(order.ref)}`}>
                    {t('confirm.trackShort')}
                </Button>
                {order.member ? (
                    <Button size="lg" href="/account/orders" variant="secondary">
                        {t('confirm.viewAccount')}
                    </Button>
                ) : (
                    <Button size="lg" href={`/account/signup?${signupParams.toString()}`} variant="secondary">
                        {t('confirm.accountTitle')}
                    </Button>
                )}
            </div>
            {!order.member && <p className="mx-auto mt-4 max-w-md text-center text-sm text-ink-muted">{t('confirm.accountBody')}</p>}
            <p className="mt-8 text-center">
                <Link href="/products" prefetch={false} className="text-sm font-semibold text-navy-900 underline-offset-4 hover:underline">
                    {t('cart.continue')}
                </Link>
            </p>
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
    const [step, setStep] = useState('contact');
    const format = useFormat();

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

    const grand = total + DELIVERY_FEE;
    const recap = !user
        ? [guest.name.trim(), guest.phone.trim(), [guest.line.trim(), guest.city.trim()].filter(Boolean).join(', ')].filter(Boolean)
        : addressChoice !== NEW_ADDRESS
          ? (() => {
                const address = (addresses || []).find(item => item.id === addressChoice);
                return address ? [address.fullName, address.phone, `${address.line}, ${address.city}`] : [];
            })()
          : [newAddress.fullName, newAddress.phone, [newAddress.line, newAddress.city].filter(Boolean).join(', ')].map(value => (value || '').trim()).filter(Boolean);

    return (
        <>
            <Seo title={t('checkout.pageTitle')} path="/checkout" noindex />
            {/* Min height: the cart is read from storage after the first paint; the footer shouldn't jump. */}
            <div className="mx-auto min-h-[75vh] max-w-wide px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('checkout.pageTitle') }]} />
                <h1 className="mt-6 text-[2.25rem] font-semibold leading-tight text-ink lg:text-title-1">{t('checkout.pageTitle')}</h1>

                {loaded && !cart.length ? (
                    <EmptyState className="mt-10" icon={ShoppingCart} title={t('checkout.emptyTitle')} description={t('cart.emptyBody')} action={<Button href="/products">{t('home.v2.shop')}</Button>} />
                ) : (
                    <>
                        <StepIndicator current={step} />
                        <SummaryCollapsible cart={cart} total={total} />
                        <div className="mt-8 grid items-start gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
                            <form id="checkout-form" noValidate onSubmit={handleSubmit} onFocus={event => setStep(event.target.closest('[data-step]')?.dataset.step || step)} className="flex flex-col gap-10">
                                {(errorList.length > 0 || serverError) && (
                                    <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-danger-800 focus:outline-none">
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

                                <Step id="contact" number={1} title={t('checkout.stepContact')}>
                                    {!user ? (
                                        <div className="grid gap-5">
                                            {!authLoading && (
                                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-s-4 border-line border-s-navy-900 bg-white p-4">
                                                    <p className="text-sm text-ink">{t('checkout.signInPrompt')}</p>
                                                    <Button href={authLink('login', '/checkout')} variant="secondary" size="sm">
                                                        {t('nav.signIn')}
                                                    </Button>
                                                </div>
                                            )}
                                            <p className="text-sm text-ink-muted">{t('checkout.guestNote')}</p>
                                            <div className="grid gap-5 sm:grid-cols-2">
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
                                        </div>
                                    ) : (
                                        <div className="rounded-xl bg-surface p-4">
                                            <p className="font-medium text-ink">{t('checkout.signedInAs', { name: user.displayName || user.email || user.phoneNumber || '' })}</p>
                                            <p className="mt-1 text-sm text-ink-muted">{t('checkout.contactMember')}</p>
                                        </div>
                                    )}
                                </Step>

                                <Step id="delivery" number={2} title={t('checkout.stepDelivery')}>
                                    {!user ? (
                                        <div className="grid gap-5">
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
                                        <p className="text-ink-muted">{t('account.loading')}</p>
                                    ) : (
                                        <div className="grid gap-5">
                                            <fieldset>
                                                <legend className="mb-3 text-sm font-medium text-ink">{t('checkout.deliverTo')}</legend>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {[...addresses, { id: NEW_ADDRESS }].map(address => {
                                                        const checked = addressChoice === address.id;
                                                        return (
                                                            <label key={address.id} className={cx('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors duration-fast has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-600', checked ? 'border-navy-900 ring-1 ring-navy-900' : 'border-line hover:border-line-input')}>
                                                                <input type="radio" name="addressChoice" className="mt-1 h-5 w-5 accent-navy-900" checked={checked} onChange={() => setAddressChoice(address.id)} />
                                                                {address.id === NEW_ADDRESS ? (
                                                                    <span className="font-medium text-ink">{t('checkout.newAddress')}</span>
                                                                ) : (
                                                                    <span className="text-sm text-ink-muted">
                                                                        <span className="block font-medium text-ink">{address.label || address.fullName}</span>
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
                                                <div className="rounded-2xl border border-line p-5">
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
                                </Step>

                                <Step id="review" number={3} title={t('checkout.reviewTitle')}>
                                    <div className="rounded-2xl bg-surface p-5">
                                        {recap.length ? (
                                            <ul className="space-y-1 text-ink">
                                                {recap.map((line, index) => (
                                                    <li key={index} className={index === 0 ? 'font-medium' : 'text-ink-muted'}>
                                                        {index === 1 ? <bdi dir="ltr">{line}</bdi> : line}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-ink-muted">{t('checkout.reviewEmpty')}</p>
                                        )}
                                        <p className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                                            <span className="font-semibold text-ink">{t('cart.grandTotal')}</span>
                                            <Price value={grand} size="lg" />
                                        </p>
                                    </div>
                                    {hasOnOrderItem && (
                                        <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-sm text-warning-800 lg:hidden">
                                            <Icon as={Info} size={18} className="mt-0.5 shrink-0" />
                                            {t('cart.onOrderBody')}
                                        </p>
                                    )}
                                    <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-6 h-14 text-base">
                                        {submitting ? t('checkout.placing') : t('checkout.place', { total: format.price(grand) })}
                                    </Button>
                                    <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
                                        <Icon as={Truck} size={18} className="mt-0.5 shrink-0 text-navy-900" />
                                        {t('checkout.payment')}
                                    </p>
                                </Step>
                            </form>
                            <SummaryAside cart={cart} total={total} hasOnOrderItem={hasOnOrderItem} />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
