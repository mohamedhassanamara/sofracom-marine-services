import { useEffect, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest, errorMessage } from '../../lib/apiClient';
import { StarInput } from './Stars';

const MAX_COMMENT = 1000;

// Modal to write or edit the signed-in user's review of one product.
export default function ReviewForm({ productId, productTitle, existing, onClose, onSaved, onDeleted }) {
    const { t, lang } = useLang();
    const { user } = useAuth();
    const [rating, setRating] = useState(existing?.rating || 0);
    const [comment, setComment] = useState(existing?.comment || '');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const onKey = event => event.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async event => {
        event.preventDefault();
        if (!rating) {
            setError(t('reviews.ratingRequired'));
            return;
        }
        setBusy(true);
        setError('');
        try {
            const result = await apiRequest('/api/reviews', {
                method: 'POST',
                body: { productId, rating, comment, lang },
                user,
            });
            onSaved(result);
        } catch (err) {
            setError(errorMessage(t, err));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        setError('');
        try {
            const result = await apiRequest(`/api/reviews?productId=${encodeURIComponent(productId)}`, {
                method: 'DELETE',
                user,
            });
            onDeleted?.(result);
        } catch (err) {
            setError(errorMessage(t, err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="review-form-title" onClick={onClose}>
            <form className="ui-card modal-card ui-form" onSubmit={submit} onClick={event => event.stopPropagation()} noValidate>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="account-eyebrow">{existing ? t('reviews.editTitle') : t('reviews.writeTitle')}</p>
                        <h2 id="review-form-title" className="font-bold text-lg text-gray-900">
                            {productTitle}
                        </h2>
                    </div>
                    <button type="button" className="checkout-modal-close" aria-label={t('reviews.close')} onClick={onClose}>
                        ×
                    </button>
                </div>
                {existing?.status === 'hidden' && <p className="ui-alert ui-alert--warning">{t('reviews.hiddenNotice')}</p>}
                <div className="ui-field">
                    <span>{t('reviews.yourRating')}</span>
                    <StarInput value={rating} onChange={setRating} />
                </div>
                <label className="ui-field">
                    <span>{t('reviews.comment')}</span>
                    <textarea
                        rows="5"
                        value={comment}
                        maxLength={MAX_COMMENT}
                        onChange={event => setComment(event.target.value)}
                        placeholder={t('reviews.commentPlaceholder')}
                        dir="auto"
                    />
                    <span className="char-count">
                        {comment.length}/{MAX_COMMENT}
                    </span>
                </label>
                {error && <p className="ui-alert ui-alert--error" role="alert">{error}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                        <button type="submit" className="ui-btn ui-btn--primary" disabled={busy}>
                            {busy ? t('account.saving') : existing ? t('reviews.update') : t('reviews.submit')}
                        </button>
                        <button type="button" className="ui-btn ui-btn--secondary" onClick={onClose}>
                            {t('address.cancel')}
                        </button>
                    </div>
                    {existing && onDeleted && (
                        confirmDelete ? (
                            <button type="button" className="ui-btn ui-btn--danger ui-btn--small" onClick={remove} disabled={busy}>
                                {t('reviews.confirmDelete')}
                            </button>
                        ) : (
                            <button type="button" className="ui-btn ui-btn--danger ui-btn--small" onClick={() => setConfirmDelete(true)}>
                                {t('reviews.delete')}
                            </button>
                        )
                    )}
                </div>
            </form>
        </div>
    );
}
