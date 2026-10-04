import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import useRequireAuth from '../../hooks/useRequireAuth';
import { StatusBadge, useFormatDate } from '../../components/account/Status';
import AdminReviews from '../../components/admin/AdminReviews';
import { apiRequest, errorMessage } from '../../lib/apiClient';
import { formatPrice } from '../../lib/constants';
import { ORDER_STATUSES, QUOTE_STATUSES, historyFor, normalizeOrderStatus, normalizeQuoteStatus, shortId } from '../../lib/status';

const TABS = {
    orders: { kind: 'order', statuses: ORDER_STATUSES, normalize: normalizeOrderStatus },
    quotes: { kind: 'quote', statuses: QUOTE_STATUSES, normalize: normalizeQuoteStatus },
};

function StatusEditor({ tab, item, onSaved }) {
    const { t } = useLang();
    const { user } = useRequireAuth();
    const config = TABS[tab];
    const [status, setStatus] = useState(item.status);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => setStatus(item.status), [item.status]);

    const save = async () => {
        setBusy(true);
        setError('');
        try {
            const result = await apiRequest(`/api/admin/${tab}`, {
                method: 'PATCH',
                body: { id: item.id, status, note },
                user,
            });
            setNote('');
            onSaved(result.item);
        } catch (err) {
            setError(errorMessage(t, err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid gap-2">
            <select value={status} onChange={event => setStatus(event.target.value)} aria-label={t('admin.status')}>
                {config.statuses.map(option => (
                    <option key={option} value={option}>
                        {t(`status.${config.kind}.${option}`)}
                    </option>
                ))}
            </select>
            <input
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder={t('admin.notePlaceholder')}
                maxLength={500}
                aria-label={t('admin.note')}
            />
            <button
                type="button"
                className="ui-btn ui-btn--primary ui-btn--small"
                onClick={save}
                disabled={busy || (status === item.status && !note.trim())}
            >
                {busy ? t('account.saving') : t('admin.update')}
            </button>
            {error && <p className="cart-alert error">{error}</p>}
        </div>
    );
}

function RecordDetails({ tab, item }) {
    const { t } = useLang();
    const formatDate = useFormatDate();
    const config = TABS[tab];
    return (
        <details>
            <summary className="ui-link" style={{ textDecoration: 'none' }}>
                {t('admin.details')}
            </summary>
            <div className="mt-2 grid gap-2 text-sm">
                {tab === 'orders' ? (
                    <>
                        <p>{item.customer_address}</p>
                        {item.customer_notes && <p className="ui-muted">{item.customer_notes}</p>}
                        <ul className="list-disc" style={{ paddingInlineStart: '1.2rem' }}>
                            {(item.items || []).map((line, index) => (
                                <li key={index}>
                                    {line.quantity} × {line.title}
                                    {line.variantLabel ? ` (${line.variantLabel})` : ''} ·{' '}
                                    {formatPrice(Number(line.lineTotal ?? (line.price || 0) * line.quantity))}
                                </li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <p style={{ whiteSpace: 'pre-line' }}>{item.details}</p>
                )}
                <ol className="ui-muted">
                    {historyFor(item, config.normalize).map((entry, index) => (
                        <li key={index}>
                            {formatDate(entry.at, true)} · {t(`status.${config.kind}.${entry.status}`)}
                            {entry.note ? ` — ${entry.note}` : ''}
                        </li>
                    ))}
                </ol>
            </div>
        </details>
    );
}

function RecordsTable({ tab }) {
    const { t } = useLang();
    const { user } = useRequireAuth();
    const formatDate = useFormatDate();
    const config = TABS[tab];
    const [filter, setFilter] = useState('');
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setItems(null);
        setError('');
        try {
            const query = filter ? `?status=${filter}` : '';
            const result = await apiRequest(`/api/admin/${tab}${query}`, { user });
            setItems(result.items);
        } catch (err) {
            setError(errorMessage(t, err));
            setItems([]);
        }
    }, [tab, filter, user, t]);

    useEffect(() => {
        load();
    }, [load]);

    const replace = updated =>
        setItems(current => current.map(item => (item.id === updated.id ? { ...updated, status: config.normalize(updated.status) } : item)));

    return (
        <section className="ui-card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <label className="ui-field" style={{ minWidth: '14rem' }}>
                    <span>{t('admin.filter')}</span>
                    <select value={filter} onChange={event => setFilter(event.target.value)}>
                        <option value="">{t('admin.all')}</option>
                        {config.statuses.map(option => (
                            <option key={option} value={option}>
                                {t(`status.${config.kind}.${option}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={load}>
                    {t('admin.refresh')}
                </button>
            </div>
            {error && <p className="ui-alert ui-alert--error mb-3">{error}</p>}
            {items === null ? (
                <p className="ui-muted">{t('account.loading')}</p>
            ) : items.length === 0 ? (
                <p className="ui-empty">{t('admin.empty')}</p>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t('admin.date')}</th>
                                <th>{t('admin.customer')}</th>
                                <th>{tab === 'orders' ? t('admin.total') : t('admin.subject')}</th>
                                <th>{t('admin.status')}</th>
                                <th>{t('admin.change')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <strong>#{shortId(item.id)}</strong>
                                        <br />
                                        <span className="ui-muted">{formatDate(item.created_at, true)}</span>
                                    </td>
                                    <td>
                                        {item.customer_name}
                                        <br />
                                        <span className="ui-muted" dir="ltr">{item.customer_phone}</span>
                                        {(item.email || item.customer_email) && (
                                            <>
                                                <br />
                                                <span className="ui-muted" dir="ltr">{item.email || item.customer_email}</span>
                                            </>
                                        )}
                                        {item.uid && (
                                            <>
                                                <br />
                                                <span className="ui-pill">{t('admin.hasAccount')}</span>
                                            </>
                                        )}
                                    </td>
                                    <td>
                                        {tab === 'orders' ? formatPrice(Number(item.total)) : item.subject || '—'}
                                        <RecordDetails tab={tab} item={item} />
                                    </td>
                                    <td>
                                        <StatusBadge kind={config.kind} status={item.status} />
                                    </td>
                                    <td>
                                        <StatusEditor tab={tab} item={item} onSaved={replace} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

// Minimal staff console: requires the `admin` custom claim (checked again by every API call).
export default function AdminPage() {
    const { t } = useLang();
    const { user, loading, isAdmin } = useRequireAuth();
    const [tab, setTab] = useState('orders');

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <Head>
                <title>{`${t('admin.title')} · SOFRACOM`}</title>
                <meta name="robots" content="noindex" />
            </Head>
            <div className="account-header">
                <div>
                    <p className="account-eyebrow">SOFRACOM</p>
                    <h1>{t('admin.title')}</h1>
                </div>
                <Link href="/account" className="ui-link">
                    {t('nav.account')}
                </Link>
            </div>
            {loading || !user ? (
                <p className="ui-muted">{t('account.loading')}</p>
            ) : !isAdmin ? (
                <p className="ui-alert ui-alert--error">{t('errors.auth/forbidden')}</p>
            ) : (
                <>
                    <div className="admin-tabs mb-5" role="tablist">
                        {['orders', 'quotes', 'reviews'].map(key => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                className={tab === key ? 'active' : ''}
                                onClick={() => setTab(key)}
                            >
                                {t(`admin.tab.${key}`)}
                            </button>
                        ))}
                    </div>
                    {tab === 'reviews' ? <AdminReviews /> : <RecordsTable key={tab} tab={tab} />}
                </>
            )}
        </main>
    );
}
