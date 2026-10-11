import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Select, StatusBadge } from '../../../../components/ui';
import { Search } from '../../../../components/ui/icons';
import { useLang } from '../../../../contexts/LangContext';
import useFormat from '../../../../hooks/useFormat';
import { ORDER_STATUSES, QUOTE_STATUSES, displayRef } from '../../../../lib/status';
import { api } from '../api';
import { Empty, ErrorBox, PageHeader } from '../components/common';
import { navigate, useRoute } from '../router';

const CONFIG = {
    orders: { title: 'Orders', statuses: ORDER_STATUSES, kind: 'order', placeholder: 'Ref (SOF-…), name, phone, email or product' },
    quotes: { title: 'Quotes', statuses: QUOTE_STATUSES, kind: 'quote', placeholder: 'Ref (SOQ-…), name, phone, email or subject' },
};

export default function Orders({ kind }) {
    const { t } = useLang();
    const format = useFormat();
    const route = useRoute();
    const config = CONFIG[kind];
    const filters = { q: route.query.get('q') || '', status: route.query.get('status') || '', from: route.query.get('from') || '', to: route.query.get('to') || '' };
    const [draft, setDraft] = useState(filters.q);
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const key = `${filters.q}|${filters.status}|${filters.from}|${filters.to}`;

    const setFilters = changes => {
        const next = { ...filters, ...changes };
        const params = new URLSearchParams(Object.entries(next).filter(([, value]) => value));
        navigate(`/${kind}${params.toString() ? `?${params}` : ''}`);
    };

    const load = useCallback(
        async (after = null) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), pageSize: '25', ...(after ? { cursor: after } : {}) });
                const result = await api(`/api/${kind}?${params}`);
                setItems(current => (after ? [...current, ...result.items] : result.items));
                setCursor(result.nextCursor);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [kind, key]
    );

    useEffect(() => {
        setDraft(filters.q);
        load();
    }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <PageHeader title={config.title} subtitle="Newest first. Search covers every order, not just the latest." />
            <form
                className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
                onSubmit={event => {
                    event.preventDefault();
                    setFilters({ q: draft.trim() });
                }}
            >
                <label className="min-w-[16rem] flex-1 text-sm font-medium text-slate-700">
                    Search
                    <div className="relative mt-1">
                        <Input value={draft} onChange={event => setDraft(event.target.value)} placeholder={config.placeholder} className="ps-3" />
                    </div>
                </label>
                <label className="text-sm font-medium text-slate-700">
                    Status
                    <Select value={filters.status} onChange={event => setFilters({ status: event.target.value })} className="mt-1 min-w-[11rem]">
                        <option value="">All</option>
                        {config.statuses.map(status => (
                            <option key={status} value={status}>
                                {t(`status.${config.kind}.${status}`)}
                            </option>
                        ))}
                    </Select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                    From
                    <Input type="date" value={filters.from} onChange={event => setFilters({ from: event.target.value })} className="mt-1" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                    To
                    <Input type="date" value={filters.to} onChange={event => setFilters({ to: event.target.value })} className="mt-1" />
                </label>
                <Button type="submit" icon={Search}>
                    Search
                </Button>
                {(filters.q || filters.status || filters.from || filters.to) && (
                    <Button variant="ghost" onClick={() => navigate(`/${kind}`)}>
                        Clear
                    </Button>
                )}
            </form>
            <ErrorBox error={error} onRetry={() => load()} />
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-start text-slate-600">
                        <tr>
                            <th className="px-4 py-2.5 text-start font-semibold">Ref</th>
                            <th className="px-4 py-2.5 text-start font-semibold">Date</th>
                            <th className="px-4 py-2.5 text-start font-semibold">Customer</th>
                            <th className="px-4 py-2.5 text-start font-semibold">{kind === 'orders' ? 'Items' : 'Request'}</th>
                            <th className="px-4 py-2.5 text-end font-semibold">{kind === 'orders' ? 'Total' : 'Quoted'}</th>
                            <th className="px-4 py-2.5 text-start font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {items.map(item => (
                            <tr key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/${kind}/${item.id}`)}>
                                <td className="px-4 py-2.5">
                                    <a href={`#/${kind}/${item.id}`} className="font-mono font-semibold text-navy-900 hover:underline" onClick={event => event.stopPropagation()}>
                                        {displayRef(item)}
                                    </a>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{format.date(item.created_at, true)}</td>
                                <td className="px-4 py-2.5">
                                    <span className="font-medium">{item.customer_name}</span>
                                    <span className="block text-slate-500">{item.customer_phone || item.customer_email}</span>
                                </td>
                                <td className="max-w-xs px-4 py-2.5 text-slate-700">
                                    <span className="line-clamp-2">{kind === 'orders' ? (item.items || []).map(line => `${line.quantity}× ${line.title}`).join(', ') : item.subject || item.details}</span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 text-end font-semibold">{kind === 'orders' ? format.price(item.total) : item.quoted_amount ? format.price(item.quoted_amount) : '—'}</td>
                                <td className="px-4 py-2.5">
                                    <StatusBadge kind={config.kind} status={item.status} size="sm" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!items.length && <Empty>{loading ? 'Loading…' : 'Nothing matches these filters.'}</Empty>}
            </div>
            {cursor && (
                <div className="mt-4 flex justify-center">
                    <Button variant="secondary" loading={loading} onClick={() => load(cursor)}>
                        Load more
                    </Button>
                </div>
            )}
        </>
    );
}
