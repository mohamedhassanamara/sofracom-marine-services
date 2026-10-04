import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '../components/Seo';
import { Breadcrumb, Button, Card, Field, Input, Select, Textarea } from '../components/ui';
import { cx } from '../components/ui/cx';
import { AlertTriangle, Anchor, CheckCircle2, Icon, MessageSquareText, Package, Paintbrush, Ship, Sparkles, Wrench, X, Zap } from '../components/ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import useCatalogIndex from '../hooks/useCatalogIndex';
import { apiRequest, errorMessage } from '../lib/apiClient';
import { BOAT_TYPES, QUOTE_SERVICES } from '../lib/quote';

const SERVICE_ICONS = { antifouling: Paintbrush, gelcoat: Sparkles, deck: Anchor, electrical: Zap, polishing: Wrench, haulout: Ship, products: Package, other: MessageSquareText };
const serviceTitle = (t, key) => (key === 'products' || key === 'other' ? t(`quote.service.${key}`) : t(`home.service.${key}.title`));
const serviceBody = (t, key) => (key === 'products' || key === 'other' ? t(`quote.service.${key}Body`) : t(`home.service.${key}.body`));

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
                <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
                    <Card padding="lg" className="text-center">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-700">
                            <Icon as={CheckCircle2} size={32} />
                        </span>
                        <h1 ref={successRef} tabIndex={-1} className="mt-4 text-2xl font-bold text-navy-900 focus:outline-none sm:text-3xl">
                            {t('quote.successTitle')}
                        </h1>
                        {sent.ref && (
                            <div className="mx-auto mt-6 max-w-sm rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 p-4">
                                <p className="text-sm font-medium text-slate-700">{t('quote.refLabel')}</p>
                                <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-navy-900">
                                    <bdi dir="ltr">{sent.ref}</bdi>
                                </p>
                            </div>
                        )}
                        <p className="mt-4 text-slate-700">{t('quote.successBody')}</p>
                        {user && <p className="mt-1 text-sm text-slate-600">{t('quote.accountHint')}</p>}
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            {user && <Button href="/account/quotes">{t('confirm.viewAccount')}</Button>}
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSent(null);
                                    setForm(current => ({ ...EMPTY, name: current.name, email: current.email, phone: current.phone }));
                                    setProductId('');
                                }}
                            >
                                {t('quote.another')}
                            </Button>
                            <Button href="/products" variant="ghost">
                                {t('home.hero.shop')}
                            </Button>
                        </div>
                    </Card>
                </div>
            </>
        );
    }

    const errorList = Object.entries(errors);
    return (
        <>
            <Seo title={t('quote.title')} description={t('quote.intro')} path="/quote" />
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('quote.title') }]} />
                <h1 className="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">{t('quote.title')}</h1>
                <p className="mt-2 text-slate-600">{t('quote.intro')}</p>

                <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-6">
                    {(errorList.length > 0 || serverError) && (
                        <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-danger-800 focus:outline-none">
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

                    <Card as="fieldset" id="quote-service" tabIndex={-1} aria-invalid={errors.service ? true : undefined}>
                        <legend className="float-start mb-4 w-full text-lg font-semibold text-navy-900">1. {t('quote.step.service')}</legend>
                        <div className="clear-both grid gap-2 sm:grid-cols-2">
                            {QUOTE_SERVICES.map(key => {
                                const checked = form.service === key;
                                return (
                                    <label key={key} className={cx('flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors duration-fast has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-600 has-[:focus-visible]:ring-offset-2', checked ? 'border-navy-900 bg-navy-50' : 'border-slate-200 hover:border-slate-300')}>
                                        <input type="radio" name="service" value={key} checked={checked} onChange={update('service')} className="sr-only" />
                                        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', checked ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-700')}>
                                            <Icon as={SERVICE_ICONS[key]} size={18} />
                                        </span>
                                        <span>
                                            <span className="block font-semibold text-slate-900">{serviceTitle(t, key)}</span>
                                            <span className="block text-sm text-slate-600">{serviceBody(t, key)}</span>
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
                    </Card>

                    <Card as="fieldset">
                        <legend className="float-start mb-1 w-full text-lg font-semibold text-navy-900">2. {t('quote.step.boat')}</legend>
                        <p className="clear-both mb-4 text-sm text-slate-600">{t('quote.boatOptional')}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
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
                    </Card>

                    <Card as="fieldset">
                        <legend className="float-start mb-4 w-full text-lg font-semibold text-navy-900">3. {t('quote.step.details')}</legend>
                        <div className="clear-both grid gap-4">
                            {productId && productTitle && (
                                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <img src={product.image} alt="" className="h-12 w-12 rounded-md bg-white object-contain p-0.5" />
                                    <span className="min-w-0 flex-1 text-sm">
                                        <span className="block text-slate-600">{t('quote.about')}</span>
                                        <span className="block truncate font-semibold text-slate-900">{productTitle}</span>
                                    </span>
                                    <Button variant="ghost" size="sm" icon={X} label={t('quote.removeProduct')} onClick={() => setProductId('')} />
                                </div>
                            )}
                            <Field id="quote-details" label={t('quote.details')} hint={t('quote.detailsHint')} required error={fieldError('details')}>
                                <Textarea rows={6} value={form.details} onChange={update('details')} maxLength={5000} />
                            </Field>
                        </div>
                    </Card>

                    <Card as="fieldset">
                        <legend className="float-start mb-4 w-full text-lg font-semibold text-navy-900">4. {t('quote.step.contact')}</legend>
                        <div className="clear-both grid gap-4 sm:grid-cols-2">
                            <Field id="quote-name" label={t('form.name')} required error={fieldError('name')}>
                                <Input autoComplete="name" value={form.name} onChange={update('name')} maxLength={120} />
                            </Field>
                            <Field id="quote-email" label={t('form.email')} required error={fieldError('email')}>
                                <Input type="email" autoComplete="email" dir="ltr" value={form.email} onChange={update('email')} maxLength={200} />
                            </Field>
                            <Field id="quote-phone" label={t('quote.phoneOptional')} className="sm:col-span-2">
                                <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={form.phone} onChange={update('phone')} maxLength={40} />
                            </Field>
                        </div>
                    </Card>

                    <div>
                        <Button type="submit" size="lg" icon={MessageSquareText} loading={sending}>
                            {sending ? t('quote.sending') : t('quote.submit')}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
