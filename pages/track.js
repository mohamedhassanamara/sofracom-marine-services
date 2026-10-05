import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { StatusBadge, StatusTimeline } from '../components/account/Status';
import Seo from '../components/Seo';
import { Breadcrumb, Button, Card, Field, Input, Price } from '../components/ui';
import { AlertTriangle, Icon, Info, Search } from '../components/ui/icons';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import useFormat from '../hooks/useFormat';
import { apiRequest, errorMessage } from '../lib/apiClient';
import { cx } from '../components/ui/cx';
import { imageAt, photoClass } from '../lib/images';

// Guest order tracking: reference + phone → status timeline and items (no personal data).
export default function TrackPage() {
    const { t } = useLang();
    const format = useFormat();
    const router = useRouter();
    const { user } = useAuth();
    const [ref, setRef] = useState('');
    const [phone, setPhone] = useState('');
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const result = useRef(null);
    const errorRef = useRef(null);

    useEffect(() => {
        if (router.isReady && typeof router.query.ref === 'string') setRef(router.query.ref.toUpperCase());
    }, [router.isReady, router.query.ref]);

    const submit = async event => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await apiRequest('/api/track', { method: 'POST', body: { ref, phone } });
            setOrder(response.order);
            requestAnimationFrame(() => result.current?.focus());
        } catch (err) {
            setOrder(null);
            setError(errorMessage(t, err));
            requestAnimationFrame(() => errorRef.current?.focus());
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Seo title={t('track.title')} path="/track" noindex />
            <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('track.title') }]} />
                <h1 className="mt-6 text-[2.25rem] font-semibold leading-tight text-ink lg:text-title-1">{t('track.title')}</h1>
                <p className="mt-4 max-w-2xl text-body-lg text-ink-muted">{t('track.intro')}</p>

                {!order && (
                    <div className="mt-10 rounded-2xl bg-surface p-6 sm:p-10">
                        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                            <Field label={t('track.ref')} required>
                                <Input value={ref} onChange={event => setRef(event.target.value.toUpperCase())} placeholder="SOF-7K3P9" autoCapitalize="characters" autoComplete="off" spellCheck={false} dir="ltr" maxLength={12} className="font-display font-semibold tracking-[0.06em]" />
                            </Field>
                            <Field label={t('track.phone')} required>
                                <Input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={event => setPhone(event.target.value)} maxLength={40} />
                            </Field>
                            <Button type="submit" size="lg" icon={Search} loading={loading} className="h-12">
                                {t('track.submit')}
                            </Button>
                        </form>
                        {error && (
                            <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger-800 focus:outline-none">
                                <Icon as={AlertTriangle} size={18} className="mt-0.5" />
                                {error}
                            </p>
                        )}
                        <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
                            <Icon as={Info} size={16} className="mt-0.5 shrink-0" />
                            {t('track.privacy')}
                        </p>
                    </div>
                )}

                {order && (
                    <section ref={result} tabIndex={-1} aria-labelledby="track-result" className="mt-10 grid items-start gap-6 focus:outline-none lg:grid-cols-[1.1fr_1fr]">
                        <Card>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 id="track-result" className="font-display text-[2rem] font-semibold tracking-[0.04em] text-navy-900">
                                        <bdi dir="ltr">{order.ref}</bdi>
                                    </h2>
                                    {order.createdAt && <p className="text-sm text-ink-muted">{t('track.placedOn', { date: format.date(order.createdAt, true) })}</p>}
                                </div>
                                <StatusBadge kind="order" status={order.status} />
                            </div>
                            <div className="mt-6">
                                <StatusTimeline kind="order" doc={{ status: order.status, statusHistory: order.history }} />
                            </div>
                        </Card>
                        <Card>
                            <h2 className="text-xl font-semibold text-ink">{t('track.items')}</h2>
                            <ul className="mt-3 divide-y divide-line">
                                {order.items.map((item, index) => (
                                    <li key={`${item.productId}-${index}`} className="flex items-center gap-3 py-3">
                                        {item.image && <img src={imageAt(item.image, 400)} alt="" loading="lazy" className={cx('h-14 w-14 rounded-xl bg-surface object-contain p-1', photoClass(item.image))} />}
                                        <span className="min-w-0 flex-1 text-sm">
                                            <span className="block font-medium text-ink">{item.title}</span>
                                            {item.variantLabel && <span className="text-ink-muted">{item.variantLabel}</span>}
                                        </span>
                                        <span className="text-sm text-ink-muted">× {item.quantity}</span>
                                        <Price value={item.unitPrice * item.quantity} size="sm" />
                                    </li>
                                ))}
                            </ul>
                            <dl className="mt-2 space-y-1 border-t border-line pt-3 text-sm">
                                {order.deliveryFee !== null && (
                                    <div className="flex justify-between">
                                        <dt className="text-ink-muted">{t('cart.deliveryFee')}</dt>
                                        <dd>
                                            <Price value={order.deliveryFee} size="sm" />
                                        </dd>
                                    </div>
                                )}
                                {order.total !== null && (
                                    <div className="flex justify-between text-base">
                                        <dt className="font-semibold">{t('cart.grandTotal')}</dt>
                                        <dd>
                                            <Price value={order.total} />
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </Card>
                        <div className="flex flex-wrap gap-3 lg:col-span-2">
                            <Button variant="secondary" onClick={() => setOrder(null)}>
                                {t('track.another')}
                            </Button>
                            {user && (
                                <Button href="/account/orders" variant="ghost">
                                    {t('confirm.viewAccount')}
                                </Button>
                            )}
                        </div>
                    </section>
                )}

                {!user && (
                    <p className="mt-8 text-sm text-ink-muted">
                        {t('track.accountHint')}{' '}
                        <Link href="/account/login?next=%2Faccount%2Forders" className="font-semibold text-navy-900 underline-offset-4 hover:underline">
                            {t('nav.signIn')}
                        </Link>
                    </p>
                )}
            </div>
        </>
    );
}
