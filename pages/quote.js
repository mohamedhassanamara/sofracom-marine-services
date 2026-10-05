import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '../components/Seo';
import { Breadcrumb, Button, Field, Input, Select, Textarea } from '../components/ui';
import { cx } from '../components/ui/cx';
import { AlertTriangle, Check, Icon, MessageSquareText, X } from '../components/ui/icons';
import { SERVICE_ICONS } from '../components/ui/serviceIcons';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import useCatalogIndex from '../hooks/useCatalogIndex';
import { apiRequest, errorMessage } from '../lib/apiClient';
import { imageAt, photoClass } from '../lib/images';
import { BOAT_TYPES, QUOTE_SERVICES } from '../lib/quote';

const serviceTitle = (t, key) => (key === 'products' || key === 'other' ? t(`quote.service.${key}`) : t(`home.service.${key}.title`));

const EMPTY = { service: '', boatType: '', boatLength: '', details: '', name: '', email: '', phone: '' };

export default function QuotePage() {
    const { t, lang } = useLang();
    const router = useRouter();
    const { user, email: accountEmail, profile } = useAuth();
    const { index, load } = useCatalogIndex();
    const [form, setForm] = useState(EMPTY);
    const [productId, setProductId] = useState('');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(null); // { ref }
    const alertRef = useRef(null);
    const successRef = useRef(null);

    // Pre-fill from ?service=… (service cards) or ?product=… ("Ask for a quote on this").
    useEffect(() => {
        if (!router.isReady) return;
        const { service, product } = router.query;
        if (typeof product === 'string' && product) {
            setProductId(product);
            setForm(current => ({ ...current, service: current.service || 'products' }));
            load();
        }
        if (typeof service === 'string' && QUOTE_SERVICES.includes(service)) setForm(current => ({ ...current, service }));
    }, [router.isReady, router.query, load]);

    // Signed in: contact details filled in (empty fields only).
    useEffect(() => {
        if (!user) return;
        setForm(current => ({
            ...current,
            name: current.name || profile?.name || user.displayName || '',
            email: current.email || accountEmail || profile?.email || '',
            phone: current.phone || profile?.phone || '',
        }));
    }, [user, profile, accountEmail]);

    const product = useMemo(() => (productId && index ? index.products.find(item => item.id === productId) || null : null), [productId, index]);
    const productTitle = product ? product.title[lang] || product.title.en : '';
    const update = field => event => setForm({ ...form, [field]: event.target.value });
    const fieldError = key => (errors[key] ? t(errors[key]) : undefined);

    const submit = async event => {
        event.preventDefault();
        const problems = {};
        if (!form.service) problems.service = 'quote.errorService';
        if (form.details.trim().length < 10) problems.details = 'quote.errorDetails';
        if (form.name.trim().length < 2) problems.name = 'quote.errorName';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) problems.email = 'quote.errorEmail';
        setErrors(problems);
        setServerError('');
        if (Object.keys(problems).length) {
            requestAnimationFrame(() => alertRef.current?.focus());
            return;
        }
        setSending(true);
        try {
            const subject = [serviceTitle(t, form.service), productTitle].filter(Boolean).join(' · ');
            const result = await apiRequest('/api/create-quote', {
                method: 'POST',
                user,
                body: {
                    service: form.service,
                    boatType: form.boatType || undefined,
                    boatLength: form.boatLength || undefined,
                    productId: productId || undefined,
                    subject,
                    details: form.details,
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                },
            });
            setSent({ ref: result.ref });
            window.scrollTo({ top: 0 });
            requestAnimationFrame(() => successRef.current?.focus());
        } catch (err) {
            setServerError(errorMessage(t, err));
            requestAnimationFrame(() => alertRef.current?.focus());
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <>
                <Seo title={t('quote.title')} path="/quote" />
                <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6 lg:py-24">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-900">
                        <Icon as={Check} size={30} />
                    </span>
                    <h1 ref={successRef} tabIndex={-1} className="mt-6 text-[2rem] font-semibold leading-tight text-ink focus:outline-none lg:text-title-1">
                        {t('quote.successTitle')}
                    </h1>
                    {sent.ref && (
                        <>
                            <p className="mt-8 text-sm font-medium uppercase tracking-[0.12em] text-ink-muted">{t('quote.refLabel')}</p>
                            <p className="mt-2 font-display text-[2.75rem] font-semibold tracking-[0.04em] text-navy-900 sm:text-display-2">
                                <bdi dir="ltr">{sent.ref}</bdi>
                            </p>
                        </>
                    )}
                    <p className="mx-auto mt-4 max-w-md text-ink-muted">{t('quote.successBody')}</p>
                    {user && <p className="mt-2 text-sm text-ink-muted">{t('quote.accountHint')}</p>}
                    <div className="mt-10 flex flex-wrap justify-center gap-3">
                        {user && (
                            <Button size="lg" href="/account/quotes">
                                {t('confirm.viewAccount')}
                            </Button>
                        )}
                        <Button
                            size="lg"
                            variant="secondary"
                            onClick={() => {
                                setSent(null);
                                setForm(current => ({ ...EMPTY, name: current.name, email: current.email, phone: current.phone }));
                                setProductId('');
                            }}
                        >
                            {t('quote.another')}
                        </Button>
                    </div>
                    <p className="mt-8">
                        <Link href="/products" prefetch={false} className="text-sm font-semibold text-navy-900 underline-offset-4 hover:underline">
                            {t('home.v2.shop')}
                        </Link>
                    </p>
                </div>
            </>
        );
    }

    const errorList = Object.entries(errors);
    const stepTitle = (number, key) => (
        <span className="flex items-center gap-3 text-xl font-semibold text-ink">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 font-sans text-sm font-semibold text-navy-900">{number}</span>
            {t(key)}
        </span>
    );
    return (
        <>
            <Seo title={t('quote.title')} description={t('quote.intro')} path="/quote" />
            <div className="mx-auto max-w-wide px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('quote.title') }]} />
                <h1 className="mt-6 text-[2.25rem] font-semibold leading-tight text-ink lg:text-title-1">{t('quote.title')}</h1>
                <p className="mt-4 max-w-2xl text-body-lg text-ink-muted">{t('quote.intro')}</p>

                <form onSubmit={submit} noValidate className="mt-10 flex max-w-5xl flex-col gap-12">
                    {(errorList.length > 0 || serverError) && (
                        <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-danger-800 focus:outline-none">
                            <p className="flex items-center gap-2 font-semibold">
                                <Icon as={AlertTriangle} size={18} />
                                {serverError || t('checkout.errorSummary')}
                            </p>
                            {errorList.length > 0 && (
                                <ul className="ms-7 mt-2 list-disc space-y-1 text-sm">
                                    {errorList.map(([field, key]) => (
                                        <li key={field}>
                                            <a href={`#quote-${field}`} className="underline">
                                                {t(key)}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <fieldset id="quote-service" tabIndex={-1} aria-invalid={errors.service ? true : undefined} className="focus:outline-none">
                        <legend className="mb-6">{stepTitle(1, 'quote.step.service')}</legend>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                            {QUOTE_SERVICES.map(key => {
                                const checked = form.service === key;
                                return (
                                    <label
                                        key={key}
                                        className={cx(
                                            'relative flex cursor-pointer flex-col items-start gap-2.5 rounded-2xl border p-3.5 transition-colors duration-fast has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-600 sm:p-5',
                                            checked ? 'border-navy-900 bg-navy-50 ring-1 ring-navy-900' : 'border-line bg-white hover:border-line-input'
                                        )}
                                    >
                                        <input type="radio" name="service" value={key} checked={checked} onChange={update('service')} className="sr-only" />
                                        <span className={cx('flex h-12 w-12 items-center justify-center rounded-full text-navy-900 sm:h-14 sm:w-14', checked ? 'bg-white' : 'bg-navy-50')} aria-hidden="true">
                                            <Icon as={SERVICE_ICONS[key]} size={32} strokeWidth={1.75} />
                                        </span>
                                        <span className="flex flex-col gap-0.5 pe-6">
                                            <span className="font-semibold leading-snug text-ink">{serviceTitle(t, key)}</span>
                                            <span className="line-clamp-2 text-sm text-ink-muted">{t(`quote.short.${key}`)}</span>
                                        </span>
                                        <span className={cx('absolute end-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-fast', checked ? 'border-navy-900 bg-navy-900 text-white' : 'border-line-input bg-white')} aria-hidden="true">
                                            {checked && <Icon as={Check} size={14} strokeWidth={3} />}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.service && (
                            <p className="mt-3 text-sm font-medium text-danger-700" role="alert">
                                {t(errors.service)}
                            </p>
                        )}
                    </fieldset>

                    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                        <fieldset className="flex flex-col gap-5">
                            <legend className="mb-6">{stepTitle(2, 'quote.step.boat')}</legend>
                            <p className="-mt-2 text-sm text-ink-muted">{t('quote.boatOptional')}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Field id="quote-boatType" label={t('quote.boatType')}>
                                    <Select value={form.boatType} onChange={update('boatType')}>
                                        <option value="">{t('quote.boatTypeNone')}</option>
                                        {BOAT_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {t(`quote.boat.${type}`)}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field id="quote-boatLength" label={t('quote.boatLength')}>
                                    <Input type="number" inputMode="decimal" min="1" max="100" step="0.1" value={form.boatLength} onChange={update('boatLength')} />
                                </Field>
                            </div>
                            {productId && productTitle && (
                                <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
                                    <img src={imageAt(product.image, 400)} alt="" className={cx('h-14 w-14 rounded-lg bg-white object-contain p-1', photoClass(product.image))} />
                                    <span className="min-w-0 flex-1 text-sm">
                                        <span className="block text-ink-muted">{t('quote.about')}</span>
                                        <span className="block truncate font-medium text-ink">{productTitle}</span>
                                    </span>
                                    <Button variant="ghost" size="sm" icon={X} label={t('quote.removeProduct')} onClick={() => setProductId('')} />
                                </div>
                            )}
                            <Field id="quote-details" label={t('quote.details')} hint={t('quote.detailsHint')} required error={fieldError('details')}>
                                <Textarea rows={4} value={form.details} onChange={update('details')} maxLength={5000} />
                            </Field>
                        </fieldset>

                        <fieldset className="flex flex-col gap-5">
                            <legend className="mb-6">{stepTitle(3, 'quote.step.contact')}</legend>
                            <Field id="quote-name" label={t('form.name')} required error={fieldError('name')}>
                                <Input autoComplete="name" value={form.name} onChange={update('name')} maxLength={120} />
                            </Field>
                            <Field id="quote-email" label={t('form.email')} required error={fieldError('email')}>
                                <Input type="email" autoComplete="email" dir="ltr" value={form.email} onChange={update('email')} maxLength={200} />
                            </Field>
                            <Field id="quote-phone" label={t('quote.phoneOptional')}>
                                <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={form.phone} onChange={update('phone')} maxLength={40} />
                            </Field>
                            <Button type="submit" size="lg" icon={MessageSquareText} loading={sending} fullWidth className="mt-2 h-14 text-base">
                                {sending ? t('quote.sending') : t('quote.submit')}
                            </Button>
                        </fieldset>
                    </div>
                </form>
            </div>
        </>
    );
}
