import { useEffect, useState } from 'react';
import { StatusBadge } from '../../../../components/ui';
import useFormat from '../../../../hooks/useFormat';
import { displayRef } from '../../../../lib/status';
import { api } from '../api';
import { Empty, ErrorBox, PageHeader, Panel } from '../components/common';

function Count({ label, value, href, tone }) {
    return (
        <a href={href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className={`mt-1 text-4xl font-bold ${tone}`}>{value ?? '–'}</p>
        </a>
    );
}

export default function Today() {
    const format = useFormat();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const load = () => api('/api/today').then(setData).catch(setError);
    useEffect(() => {
        load();
    }, []);

    return (
        <>
            <PageHeader title="Today" subtitle="What needs attention." />
            <ErrorBox error={error} onRetry={load} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Count label="New orders (pending)" value={data?.newOrders.count} href="#/orders?status=pending" tone="text-warning-700" />
                <Count label="Quotes to answer" value={data?.openQuotes.count} href="#/quotes?status=received" tone="text-accent-700" />
                <Count label="Reviews this week" value={data?.recentReviews.count} href="#/reviews" tone="text-navy-800" />
                <Count label="Translations to review" value={data?.translations.count} href="#/catalog?review=1" tone="text-danger-700" />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel title="New orders" actions={<a href="#/orders?status=pending" className="text-sm font-semibold text-accent-700">All →</a>}>
                    {data?.newOrders.items.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.newOrders.items.map(order => (
                                <li key={order.id}>
                                    <a href={`#/orders/${order.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                                        <span>
                                            <span className="font-mono font-semibold">{displayRef(order)}</span> · {order.customer_name}
                                            <span className="block text-sm text-slate-500">{format.date(order.created_at, true)}</span>
                                        </span>
                                        <span className="font-semibold">{format.price(order.total)}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty>{data ? 'No new orders.' : 'Loading…'}</Empty>
                    )}
                </Panel>
                <Panel title="Quotes to answer" actions={<a href="#/quotes?status=received" className="text-sm font-semibold text-accent-700">All →</a>}>
                    {data?.openQuotes.items.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.openQuotes.items.map(quote => (
                                <li key={quote.id}>
                                    <a href={`#/quotes/${quote.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                                        <span className="min-w-0">
                                            <span className="font-mono font-semibold">{displayRef(quote)}</span> · {quote.customer_name}
                                            <span className="block truncate text-sm text-slate-500">{quote.subject || quote.details}</span>
                                        </span>
                                        <StatusBadge kind="quote" status={quote.status} size="sm" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty>{data ? 'No open quote requests.' : 'Loading…'}</Empty>
                    )}
                </Panel>
                <Panel title="Recent reviews" actions={<a href="#/reviews" className="text-sm font-semibold text-accent-700">All →</a>}>
                    {data?.recentReviews.items.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.recentReviews.items.map(review => (
                                <li key={review.id} className="py-2.5">
                                    <p className="font-medium">
                                        {'★'.repeat(review.rating)}
                                        <span className="text-slate-300">{'★'.repeat(5 - review.rating)}</span> · {review.productTitle}
                                    </p>
                                    {review.comment && <p className="line-clamp-2 text-sm text-slate-600">{review.comment}</p>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty>{data ? 'No reviews this week.' : 'Loading…'}</Empty>
                    )}
                </Panel>
                <Panel title="Translations to review" actions={<a href="#/catalog?review=1" className="text-sm font-semibold text-accent-700">All →</a>}>
                    {data?.translations.items.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.translations.items.slice(0, 6).map(item => (
                                <li key={`${item.kind}-${item.id || item.slug}-${item.lang}`}>
                                    <a href={item.kind === 'product' ? `#/catalog/product/${item.id}` : '#/catalog/categories'} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                                        <span className="truncate">{item.title}</span>
                                        <span className="shrink-0 text-xs font-semibold uppercase text-slate-500">
                                            {item.lang} · {item.reason === 'missing' ? 'missing' : 'draft'}
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty>{data ? 'All translations reviewed.' : 'Loading…'}</Empty>
                    )}
                </Panel>
            </div>
        </>
    );
}
