import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFormatDate } from '../account/Status';
import { Stars } from '../reviews/Stars';
import { apiRequest, errorMessage } from '../../lib/apiClient';

// Staff review moderation: hiding a review removes it from the product page and stats.
export default function AdminReviews() {
    const { t } = useLang();
    const { user } = useAuth();
    const formatDate = useFormatDate();
    const [filter, setFilter] = useState('');
    const [items, setItems] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setItems(null);
        setError('');
        try {
            const query = filter ? `?status=${filter}` : '';
            const result = await apiRequest(`/api/admin/reviews${query}`, { user });
            setItems(result.items);
        } catch (err) {
            setError(errorMessage(t, err));
            setItems([]);
        }
    }, [filter, user, t]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = async review => {
        setBusyId(review.id);
        setError('');
        try {
            const status = review.status === 'hidden' ? 'published' : 'hidden';
            const result = await apiRequest('/api/admin/reviews', { method: 'PATCH', body: { id: review.id, status }, user });
            setItems(current => current.map(item => (item.id === review.id ? { ...item, ...result.item } : item)));
        } catch (err) {
            setError(errorMessage(t, err));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section className="ui-card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <label className="ui-field" style={{ minWidth: '14rem' }}>
                    <span>{t('admin.filter')}</span>
                    <select value={filter} onChange={event => setFilter(event.target.value)}>
                        <option value="">{t('admin.all')}</option>
                        <option value="published">{t('reviews.published')}</option>
                        <option value="hidden">{t('reviews.hidden')}</option>
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
                                <th>{t('admin.product')}</th>
                                <th>{t('admin.review')}</th>
                                <th>{t('admin.status')}</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(review => (
                                <tr key={review.id}>
                                    <td className="ui-muted">{formatDate(review.updatedAt, true)}</td>
                                    <td>{review.productTitle}</td>
                                    <td style={{ maxWidth: '28rem' }}>
                                        <strong>{review.displayName}</strong> <Stars value={review.rating} size="sm" />
                                        {review.comment && (
                                            <p className="mt-1" dir="auto" style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                                                {review.comment}
                                            </p>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${review.status === 'hidden' ? 'status-badge--stopped' : 'status-badge--done'}`}>
                                            {review.status === 'hidden' ? t('reviews.hidden') : t('reviews.published')}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`ui-btn ui-btn--small ${review.status === 'hidden' ? 'ui-btn--secondary' : 'ui-btn--danger'}`}
                                            onClick={() => toggle(review)}
                                            disabled={busyId === review.id}
                                        >
                                            {review.status === 'hidden' ? t('admin.unhide') : t('admin.hide')}
                                        </button>
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
