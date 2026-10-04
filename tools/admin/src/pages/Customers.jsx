import { useEffect, useState } from 'react';
import { Badge, Button, Input, StatusBadge, useToast } from '../../../../components/ui';
import { ArrowLeft } from '../../../../components/ui/icons';
import useFormat from '../../../../hooks/useFormat';
import { displayRef } from '../../../../lib/status';
import { api } from '../api';
import { Confirm, Empty, ErrorBox, PageHeader, Panel } from '../components/common';
import { navigate } from '../router';

function CustomerDetail({ uid }) {
    const format = useFormat();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [password, setPassword] = useState(null);
    useEffect(() => {
        api(`/api/customers/${encodeURIComponent(uid)}`).then(setData, setError);
    }, [uid]);

    const reset = async () => {
        setBusy(true);
        try {
            const result = await api(`/api/customers/${encodeURIComponent(uid)}/temp-password`, { method: 'POST', body: {} });
            setPassword(result.password || result.temporaryPassword);
            setConfirm(false);
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Password not changed', description: err.message });
        } finally {
            setBusy(false);
        }
    };

    if (error) return <ErrorBox error={error} />;
    if (!data) return <p className="text-slate-500">Loading…</p>;
    const { user } = data;
    return (
        <>
            <a href="#/customers" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline">
                <ArrowLeft size={16} /> Customers
            </a>
            <PageHeader title={user.name || '(no name)'} subtitle={[user.phoneDisplay, user.email].filter(Boolean).join(' · ')} actions={<Button variant="secondary" onClick={() => setConfirm(true)}>Temporary password…</Button>} />
            {password && (
                <div role="status" className="mb-6 rounded-lg border border-warning-200 bg-warning-50 p-4 text-warning-800">
                    <p className="font-semibold">Temporary password (shown once):</p>
                    <p className="mt-1 font-mono text-2xl tracking-wider text-slate-900">{password}</p>
                    <p className="mt-1 text-sm">Give it to the customer by phone. They must choose a new one right after signing in.</p>
                </div>
            )}
            <div className="grid gap-6 xl:grid-cols-2">
                <Panel title={`Orders (${data.orders.length})`}>
                    {data.orders.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.orders.map(order => (
                                <li key={order.id}>
                                    <a href={`#/orders/${order.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                                        <span>
                                            <span className="font-mono font-semibold">{displayRef(order)}</span>
                                            <span className="block text-sm text-slate-500">{format.date(order.created_at, true)}</span>
                                        </span>
                                        <span className="flex items-center gap-3">
                                            {format.price(order.total)}
                                            <StatusBadge kind="order" status={order.status} size="sm" />
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty>No orders.</Empty>
                    )}
                </Panel>
                <Panel title={`Quotes (${data.quotes.length})`}>
                    {data.quotes.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.quotes.map(quote => (
                                <li key={quote.id}>
                                    <a href={`#/quotes/${quote.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                                        <span className="min-w-0">
                                            <span className="font-mono font-semibold">{displayRef(quote)}</span>
                                            <span className="block truncate text-sm text-slate-500">{quote.subject || quote.details}</span>
                                        </span>
                                        <StatusBadge kind="quote" status={quote.status} size="sm" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty>No quote requests.</Empty>
                    )}
                </Panel>
            </div>
            <Confirm
                open={confirm}
                title="Set a temporary password?"
                body={<p>The current password stops working immediately and the customer is signed out everywhere. They must choose a new password after signing in with the temporary one.</p>}
                confirmLabel="Set temporary password"
                busy={busy}
                onConfirm={reset}
                onClose={() => setConfirm(false)}
            />
        </>
    );
}

export default function Customers({ id }) {
    const [q, setQ] = useState('');
    const [users, setUsers] = useState(null);
    const [error, setError] = useState(null);
    const search = () => api(`/api/customers?q=${encodeURIComponent(q)}`).then(result => setUsers(result.users), setError);
    useEffect(() => {
        if (!id) search();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
    if (id) return <CustomerDetail uid={id} />;
    return (
        <>
            <PageHeader title="Customers" subtitle="Website accounts. Search by phone (any format), email, or the start of a name." />
            <form
                className="mb-4 flex gap-3 rounded-lg border border-slate-200 bg-white p-4"
                onSubmit={event => {
                    event.preventDefault();
                    search();
                }}
            >
                <Input value={q} onChange={event => setQ(event.target.value)} placeholder="52 663 210, name@example.com, Sami…" />
                <Button type="submit">Search</Button>
            </form>
            <ErrorBox error={error} />
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-2.5 text-start font-semibold">Name</th>
                            <th className="px-4 py-2.5 text-start font-semibold">Phone</th>
                            <th className="px-4 py-2.5 text-start font-semibold">Email</th>
                            <th className="px-4 py-2.5 text-start font-semibold">Sign-in</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {(users || []).map(user => (
                            <tr key={user.uid} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/customers/${user.uid}`)}>
                                <td className="px-4 py-2.5 font-medium">
                                    <a href={`#/customers/${user.uid}`} onClick={event => event.stopPropagation()} className="hover:underline">
                                        {user.name || '(no name)'}
                                    </a>
                                </td>
                                <td className="px-4 py-2.5">{user.phoneDisplay}</td>
                                <td className="px-4 py-2.5">
                                    {user.email} {user.emailVerified && <Badge size="sm" tone="success">verified</Badge>}
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">{user.accountType === 'phone' ? 'Phone' : (user.providers || []).includes('google.com') ? 'Google' : 'Email'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users && !users.length && <Empty>No accounts found.</Empty>}
                {!users && <Empty>Loading…</Empty>}
            </div>
        </>
    );
}
