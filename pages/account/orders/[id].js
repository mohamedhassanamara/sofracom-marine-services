import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../../contexts/LangContext';
import { useAuth } from '../../../contexts/AuthContext';
import AccountLayout from '../../../components/account/AccountLayout';
import { StatusBadge, StatusTimeline, useFormatDate } from '../../../components/account/Status';
import { getMine } from '../../../lib/accountData';
import useFormat from '../../../hooks/useFormat';
import { normalizeOrderStatus, displayRef } from '../../../lib/status';
import { imageAt } from '../../../lib/images';

// Older orders stored only `price`; newer ones also store unitPrice/lineTotal/subtotal.
const linePrice = item => Number(item.unitPrice ?? item.price) || 0;
const lineTotal = item => Number(item.lineTotal) || linePrice(item) * (Number(item.quantity) || 0);

export default function OrderDetailPage() {
    const { t } = useLang();
    const format = useFormat();
    const { user } = useAuth();
    const router = useRouter();
    const formatDate = useFormatDate();
    const [order, setOrder] = useState(undefined);

    useEffect(() => {
        if (!user || !router.query.id) return;
        getMine('orders', String(router.query.id))
            .then(setOrder)
            .catch(() => setOrder(null));
    }, [user, router.query.id]);

    const title = order ? t('orders.number', { id: displayRef(order) }) : t('orders.title');

    if (order === undefined || order === null) {
        return (
            <AccountLayout title={title} eyebrow={t('orders.title')}>
                {order === null ? (
                    <div className="ui-card ui-empty">
                        <p>{t('orders.notFound')}</p>
                        <Link href="/account/orders" className="ui-btn ui-btn--secondary mt-4">
                            {t('orders.back')}
                        </Link>
                    </div>
                ) : (
                    <p className="ui-muted">{t('account.loading')}</p>
                )}
            </AccountLayout>
        );
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const subtotal = Number(order.subtotal) || items.reduce((sum, item) => sum + lineTotal(item), 0);
    const total = Number(order.total) || 0;
    const deliveryFee = Number.isFinite(Number(order.delivery_fee))
        ? Number(order.delivery_fee)
        : Math.max(0, total - subtotal);
    const delivered = normalizeOrderStatus(order.status) === 'delivered';

    return (
        <AccountLayout
            title={title}
            eyebrow={formatDate(order.created_at, true)}
            actions={<StatusBadge kind="order" status={order.status} />}
        >
            {delivered && (
                <div className="ui-alert ui-alert--success mb-5 flex flex-wrap items-center justify-between gap-3">
                    <span>{t('orders.deliveredPrompt')}</span>
                    <Link href={`/account/reviews?order=${order.id}`} className="ui-btn ui-btn--primary ui-btn--small">
                        {t('orders.rateItems')}
                    </Link>
                </div>
            )}
            <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <section className="ui-card">
                        <h2 className="font-bold text-lg text-slate-900 mb-4">{t('orders.items')}</h2>
                        <div className="order-lines">
                            {items.map((item, index) => {
                                const href = item.productId && item.categorySlug
                                    ? `/products/${item.categorySlug}/${item.productId}`
                                    : null;
                                return (
                                    <div className="order-line" key={`${item.id || item.productId}-${index}`}>
                                        <img src={imageAt(item.image || '/assets/site/logo-400.webp', 400)} loading="lazy" alt="" />
                                        <div>
                                            {href ? (
                                                <Link href={href} className="font-semibold text-slate-900 hover:underline">
                                                    {item.title}
                                                </Link>
                                            ) : (
                                                <p className="font-semibold text-slate-900">{item.title}</p>
                                            )}
                                            <p className="ui-muted">
                                                {item.variantLabel ? `${item.variantLabel} · ` : ''}
                                                {t('orders.qtyTimesPrice', {
                                                    quantity: item.quantity,
                                                    price: format.price(linePrice(item)),
                                                })}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-slate-900">{format.price(lineTotal(item))}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="order-totals mt-5">
                            <div>
                                <span>{t('cart.itemsTotal')}</span>
                                <span>{format.price(subtotal)}</span>
                            </div>
                            <div>
                                <span>{t('cart.deliveryFee')}</span>
                                <span>{format.price(deliveryFee)}</span>
                            </div>
                            <div className="order-totals__grand">
                                <span>{t('cart.grandTotal')}</span>
                                <span>{format.price(total)}</span>
                            </div>
                        </div>
                    </section>
                    <section className="ui-card">
                        <h2 className="font-bold text-lg text-slate-900 mb-3">{t('orders.delivery')}</h2>
                        <p className="text-slate-800">{order.customer_name}</p>
                        <p className="text-slate-700">{order.customer_address}</p>
                        <p className="text-slate-500" dir="ltr" style={{ textAlign: 'start' }}>
                            {order.customer_phone}
                        </p>
                        {order.customer_notes && <p className="ui-muted mt-2">{order.customer_notes}</p>}
                    </section>
                </div>
                <section className="ui-card">
                    <h2 className="font-bold text-lg text-slate-900 mb-4">{t('orders.status')}</h2>
                    <StatusTimeline kind="order" doc={order} />
                </section>
            </div>
            <p className="mt-6">
                <Link href="/account/orders" className="ui-link">
                    {t('orders.back')}
                </Link>
            </p>
        </AccountLayout>
    );
}
