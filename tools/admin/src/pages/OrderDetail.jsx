import { useEffect, useState } from 'react';
import { StatusTimeline } from '../../../../components/account/Status';
import { Button, Field, Input, Price, Select, StatusBadge, Textarea, useToast } from '../../../../components/ui';
import { ArrowLeft } from '../../../../components/ui/icons';
import { useLang } from '../../../../contexts/LangContext';
import useFormat from '../../../../hooks/useFormat';
import { BOAT_TYPES } from '../../../../lib/quote';
import { ORDER_FLOW, ORDER_STATUSES, QUOTE_FLOW, QUOTE_STATUSES, displayRef } from '../../../../lib/status';
import { api, siteUrl } from '../api';
import { Confirm, ErrorBox, PageHeader, Panel } from '../components/common';

const CONFIG = {
    orders: { kind: 'order', statuses: ORDER_STATUSES, flow: ORDER_FLOW, confirm: ['cancelled', 'delivered'] },
    quotes: { kind: 'quote', statuses: QUOTE_STATUSES, flow: QUOTE_FLOW, confirm: ['declined', 'completed'] },
};

const Row = ({ label, children }) => (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5 text-sm">
        <dt className="text-slate-500">{label}</dt>
        <dd className="min-w-0 break-words text-slate-900">{children || '—'}</dd>
    </div>
);

export default function OrderDetail({ kind, id }) {
    const { t } = useLang();
    const format = useFormat();
    const toast = useToast();
    const config = CONFIG[kind];
    const [item, setItem] = useState(null);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('');
    const [note, setNote] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [staffNote, setStaffNote] = useState('');
    const [reply, setReply] = useState({ amount: '', note: '' });

    const load = () =>
        api(`/api/${kind}/${id}`)
            .then(result => {
                setItem(result.item);
                const position = config.flow.indexOf(result.item.status);
                setStatus(config.flow[position + 1] || result.item.status);
                setReply({ amount: result.item.quoted_amount ?? '', note: result.item.reply_note || '' });
            })
            .catch(setError);
    useEffect(() => {
        load();
    }, [kind, id]); // eslint-disable-line react-hooks/exhaustive-deps

    const changeStatus = async () => {
        setBusy(true);
        try {
            const result = await api(`/api/${kind}/${id}/status`, { method: 'POST', body: { status, note } });
            setItem(result.item);
            setNote('');
            setConfirming(false);
            toast.show({ title: `Status changed to “${t(`status.${config.kind}.${status}`)}”`, description: displayRef(result.item) });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Status not changed', description: err.message });
        } finally {
            setBusy(false);
        }
    };
    const submitStatus = event => {
        event.preventDefault();
        if (config.confirm.includes(status)) setConfirming(true);
        else changeStatus();
    };

    const addNote = async event => {
        event.preventDefault();
        if (!staffNote.trim()) return;
        try {
            const result = await api(`/api/${kind}/${id}/notes`, { method: 'POST', body: { text: staffNote } });
            setItem(result.item);
            setStaffNote('');
            toast.show({ title: 'Note added' });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Note not saved', description: err.message });
        }
    };

    const saveReply = async event => {
        event.preventDefault();
        setBusy(true);
        try {
            const result = await api(`/api/quotes/${id}/reply`, { method: 'POST', body: reply });
            setItem(result.item);
            toast.show({ title: 'Quote saved', description: `${format.price(result.item.quoted_amount)} · status: ${t(`status.quote.${result.item.status}`)}` });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Quote not saved', description: err.message });
        } finally {
            setBusy(false);
        }
    };

    if (error) return <ErrorBox error={error} onRetry={load} />;
    if (!item) return <p className="text-slate-500">Loading…</p>;

    return (
        <>
            <a href={`#/${kind}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline">
                <ArrowLeft size={16} /> {kind === 'orders' ? 'Orders' : 'Quotes'}
            </a>
            <PageHeader title={<span className="font-mono">{displayRef(item)}</span>} subtitle={`Received ${format.date(item.created_at, true)}${item.uid ? ' · customer account' : ' · guest'}`} actions={<StatusBadge kind={config.kind} status={item.status} />} />
            <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
                <div className="space-y-6">
                    <Panel title="Customer">
                        <dl>
                            <Row label="Name">{item.customer_name}</Row>
                            <Row label="Phone">{item.customer_phone ? <a href={`tel:${item.customer_phone}`} className="text-accent-700 hover:underline">{item.customer_phone}</a> : null}</Row>
                            <Row label="Email">{item.customer_email || item.email ? <a href={`mailto:${item.customer_email || item.email}`} className="text-accent-700 hover:underline">{item.customer_email || item.email}</a> : null}</Row>
                            {kind === 'orders' && <Row label="Address">{item.customer_address}</Row>}
                            {kind === 'orders' && <Row label="Customer notes">{item.customer_notes}</Row>}
                            {item.uid && (
                                <Row label="Account">
                                    <a href={`#/customers/${item.uid}`} className="text-accent-700 hover:underline">
                                        Open customer
                                    </a>
                                </Row>
                            )}
                        </dl>
                    </Panel>
                    {kind === 'orders' ? (
                        <Panel title="Items">
                            <ul className="divide-y divide-slate-200">
                                {(item.items || []).map((line, index) => (
                                    <li key={`${line.productId}-${index}`} className="flex items-center gap-3 py-2.5 text-sm">
                                        {line.image && <img src={siteUrl(line.image)} alt="" className="h-12 w-12 rounded-md border border-slate-200 bg-white object-contain" />}
                                        <span className="flex-1">
                                            <span className="block font-medium">{line.title}</span>
                                            <span className="text-slate-500">{[line.variantLabel, line.productId].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        <span>{line.quantity} × {format.price(line.unitPrice ?? line.price)}</span>
                                        <Price value={(line.unitPrice ?? line.price) * line.quantity} size="sm" />
                                    </li>
                                ))}
                            </ul>
                            <dl className="mt-3 border-t border-slate-200 pt-3 text-sm">
                                <Row label="Subtotal">{format.price(item.subtotal)}</Row>
                                <Row label="Delivery">{format.price(item.delivery_fee)}</Row>
                                <Row label="Total">
                                    <b>{format.price(item.total)}</b>
                                </Row>
                            </dl>
                        </Panel>
                    ) : (
                        <Panel title="Request">
                            <dl>
                                <Row label="Service">{item.service ? t(item.service === 'products' || item.service === 'other' ? `quote.service.${item.service}` : `home.service.${item.service}.title`) : item.project_type}</Row>
                                <Row label="Boat">{[item.boat_type && BOAT_TYPES.includes(item.boat_type) ? t(`quote.boat.${item.boat_type}`) : null, item.boat_length_m ? `${item.boat_length_m} m` : null].filter(Boolean).join(' · ')}</Row>
                                <Row label="Product">{item.product_title}</Row>
                                <Row label="Subject">{item.subject}</Row>
                                <Row label="Details">
                                    <span className="whitespace-pre-line">{item.details}</span>
                                </Row>
                            </dl>
                        </Panel>
                    )}
                    {kind === 'quotes' && (
                        <Panel title="Quote">
                            <form onSubmit={saveReply} className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                                <Field label="Amount (TND)" hint="Up to 3 decimals">
                                    <Input type="number" inputMode="decimal" min="0" step="0.001" value={reply.amount} onChange={event => setReply({ ...reply, amount: event.target.value })} />
                                </Field>
                                <Field label="Reply to the customer" hint="Shown on the customer's timeline; send it by email or phone too.">
                                    <Textarea rows={3} value={reply.note} onChange={event => setReply({ ...reply, note: event.target.value })} maxLength={2000} />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Button type="submit" loading={busy}>
                                        Save quote
                                    </Button>
                                    {item.reply_at && <span className="ms-3 text-sm text-slate-500">Last saved {format.date(item.reply_at, true)}</span>}
                                </div>
                            </form>
                        </Panel>
                    )}
                    <Panel title="Internal notes" actions={<span className="text-xs text-slate-500">Never shown to the customer</span>}>
                        {(item.staffNotes || []).length > 0 && (
                            <ul className="mb-4 space-y-2">
                                {item.staffNotes.map((entry, index) => (
                                    <li key={index} className="rounded-md bg-slate-50 p-3 text-sm">
                                        <p className="whitespace-pre-line">{entry.text}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {format.date(entry.at, true)} · {entry.by}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <form onSubmit={addNote} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Field label="Add a note" className="flex-1">
                                <Textarea rows={2} value={staffNote} onChange={event => setStaffNote(event.target.value)} maxLength={1000} />
                            </Field>
                            <Button type="submit" variant="secondary" disabled={!staffNote.trim()}>
                                Add note
                            </Button>
                        </form>
                    </Panel>
                </div>
                <div className="space-y-6">
                    <Panel title="Change status">
                        <form onSubmit={submitStatus} className="space-y-3">
                            <Field label="New status">
                                <Select value={status} onChange={event => setStatus(event.target.value)}>
                                    {config.statuses.map(value => (
                                        <option key={value} value={value}>
                                            {t(`status.${config.kind}.${value}`)}
                                            {value === item.status ? ' (current)' : ''}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Note for the customer" hint="Optional. Shown on their timeline and /track.">
                                <Textarea rows={2} value={note} onChange={event => setNote(event.target.value)} maxLength={500} />
                            </Field>
                            <Button type="submit" fullWidth loading={busy} disabled={status === item.status && !note.trim()}>
                                Save status
                            </Button>
                        </form>
                    </Panel>
                    <Panel title="History">
                        <StatusTimeline kind={config.kind} doc={item} />
                    </Panel>
                </div>
            </div>
            <Confirm
                open={confirming}
                title={`Mark ${displayRef(item)} as “${t(`status.${config.kind}.${status}`)}”?`}
                body={<p>{status === 'cancelled' || status === 'declined' ? 'The customer sees this immediately. It stops the order.' : 'The customer sees this immediately. Only do it once it is really done.'}</p>}
                confirmLabel={`Yes, ${t(`status.${config.kind}.${status}`).toLowerCase()}`}
                tone={status === 'cancelled' || status === 'declined' ? 'danger' : 'primary'}
                busy={busy}
                onConfirm={changeStatus}
                onClose={() => setConfirming(false)}
            />
        </>
    );
}
