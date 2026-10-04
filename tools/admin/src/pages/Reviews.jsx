import { useEffect, useState } from 'react';
import { Badge, Button, Input, Select, Stars, useToast } from '../../../../components/ui';
import useFormat from '../../../../hooks/useFormat';
import { api } from '../api';
import { Confirm, Empty, ErrorBox, PageHeader } from '../components/common';

export default function Reviews() {
    const format = useFormat();
    const toast = useToast();
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('');
    const [items, setItems] = useState(null);
    const [error, setError] = useState(null);
    const [target, setTarget] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = () => {
        const params = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) });
        return api(`/api/reviews?${params}`).then(result => setItems(result.items), setError);
    };
    useEffect(() => {
        load();
    }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

    const apply = async () => {
        setBusy(true);
        try {
            const next = target.status === 'published' ? 'hidden' : 'published';
            await api(`/api/reviews/${encodeURIComponent(target.id)}/status`, { method: 'POST', body: { status: next } });
            toast.show({ title: next === 'hidden' ? 'Review hidden' : 'Review published again', description: 'Ratings were recalculated.' });
            setTarget(null);
            load();
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Not changed', description: err.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader title="Reviews" subtitle="Only customers with a delivered order can review. Hiding removes a review from the site and from the product's rating." />
            <form
                className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
                onSubmit={event => {
                    event.preventDefault();
                    load();
                }}
            >
                <label className="min-w-[14rem] flex-1 text-sm font-medium text-slate-700">
                    Search
                    <Input className="mt-1" value={q} onChange={event => setQ(event.target.value)} placeholder="Product, name or text" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                    Status
                    <Select className="mt-1" value={status} onChange={event => setStatus(event.target.value)}>
                        <option value="">All</option>
                        <option value="published">Published</option>
                        <option value="hidden">Hidden</option>
                    </Select>
                </label>
                <Button type="submit">Search</Button>
            </form>
            <ErrorBox error={error} onRetry={load} />
            <ul className="space-y-3">
                {(items || []).map(review => (
                    <li key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold text-slate-900">{review.productTitle}</p>
                                <p className="flex items-center gap-2 text-sm text-slate-600">
                                    <Stars value={review.rating} size="sm" /> {review.displayName || 'Customer'} · {format.date(review.updatedAt || review.createdAt, true)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge tone={review.status === 'published' ? 'success' : 'danger'} size="sm">
                                    {review.status}
                                </Badge>
                                <Button size="sm" variant={review.status === 'published' ? 'danger' : 'secondary'} onClick={() => setTarget(review)}>
                                    {review.status === 'published' ? 'Hide' : 'Unhide'}
                                </Button>
                            </div>
                        </div>
                        {review.title && <p className="mt-2 font-medium">{review.title}</p>}
                        {review.comment && <p className="mt-1 whitespace-pre-line text-slate-700">{review.comment}</p>}
                    </li>
                ))}
            </ul>
            {items && !items.length && <Empty>No reviews match.</Empty>}
            {!items && !error && <Empty>Loading…</Empty>}
            <Confirm
                open={Boolean(target)}
                title={target?.status === 'published' ? 'Hide this review?' : 'Publish this review again?'}
                body={<p>{target?.status === 'published' ? 'It disappears from the product page and the rating is recalculated. You can unhide it later.' : 'It shows on the product page again and counts in the rating.'}</p>}
                confirmLabel={target?.status === 'published' ? 'Hide review' : 'Unhide'}
                tone={target?.status === 'published' ? 'danger' : 'primary'}
                busy={busy}
                onConfirm={apply}
                onClose={() => setTarget(null)}
            />
        </>
    );
}
