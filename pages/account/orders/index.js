import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '../../../contexts/LangContext';
import { useAuth } from '../../../contexts/AuthContext';
import AccountLayout from '../../../components/account/AccountLayout';
import { StatusBadge, useFormatDate } from '../../../components/account/Status';
import { listMine } from '../../../lib/accountData';
import { formatPrice } from '../../../lib/constants';
import { normalizeOrderStatus, shortId } from '../../../lib/status';
import { imageAt } from '../../../lib/images';

export default function OrdersPage() {
    const { t } = useLang();
    const { user } = useAuth();
    const formatDate = useFormatDate();
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        listMine('orders', user.uid)
            .then(setOrders)
            .catch(err => {
                console.error('[orders] load failed', err);
                setError(t('errors.generic'));
                setOrders([]);
            });
    }, [user, t]);

    return (
        <AccountLayout title={t('orders.title')} eyebrow={t('account.eyebrow')}>
            {error && <p className="ui-alert ui-alert--error mb-4">{error}</p>}
            {orders === null ? (
                <p className="ui-muted">{t('account.loading')}</p>
            ) : orders.length === 0 ? (
                <div className="ui-card ui-empty">
                    <p>{t('orders.empty')}</p>
                    <Link href="/products" className="ui-btn ui-btn--primary mt-4">
                        {t('orders.browse')}
                    </Link>
                </div>
            ) : (
                <div className="record-list">
                    {orders.map(order => {
                        const items = Array.isArray(order.items) ? order.items : [];
                        const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                        const delivered = normalizeOrderStatus(order.status) === 'delivered';
                        return (
                            <Link key={order.id} href={`/account/orders/${order.id}`} className="record-card">
                                <div className="flex items-center gap-3">
                                    <div className="record-card__thumbs" aria-hidden="true">
                                        {items.slice(0, 3).map((item, index) => (
                                            <img key={`${order.id}-${index}`} src={imageAt(item.image || '/assets/site/logo-400.webp', 400)} loading="lazy" alt="" />
                                        ))}
                                    </div>
                                    <div>
                                        <p className="record-card__title">{t('orders.number', { id: shortId(order.id) })}</p>
                                        <p className="record-card__meta">
                                            {formatDate(order.created_at)} · {t('orders.itemCount', { count })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {delivered && <span className="ui-pill">{t('orders.rateItems')}</span>}
                                    <span className="font-bold text-slate-900">{formatPrice(Number(order.total))}</span>
                                    <StatusBadge kind="order" status={order.status} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </AccountLayout>
    );
}
