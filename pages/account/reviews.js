import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import AccountLayout from '../../components/account/AccountLayout';
import { useFormatDate } from '../../components/account/Status';
import { Stars } from '../../components/reviews/Stars';
import ReviewForm from '../../components/reviews/ReviewForm';
import { apiRequest, errorMessage } from '../../lib/apiClient';
import { imageAt } from '../../lib/images';
import { Badge } from '../../components/ui';

const productHref = item => (item.categorySlug ? `/products/${item.categorySlug}/${item.productId}` : null);

export default function AccountReviewsPage() {
    const { t } = useLang();
    const { user } = useAuth();
    const router = useRouter();
    const formatDate = useFormatDate();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null); // { productId, title, existing }
    const [notice, setNotice] = useState('');
    const fromOrder = typeof router.query.order === 'string' ? router.query.order : null;

    const load = useCallback(async () => {
        if (!user) return;
        try {
            setData(await apiRequest('/api/reviews/mine', { user }));
        } catch (err) {
            setError(errorMessage(t, err));
            setData({ toReview: [], reviews: [] });
        }
    }, [user, t]);

    useEffect(() => {
        load();
    }, [load]);

    const done = message => {
        setEditing(null);
        setNotice(message);
        load();
    };

    // Items from the order the customer came from ("Rate your items") are listed first.
    const toReview = data
        ? [...data.toReview].sort((a, b) => Number(b.orderId === fromOrder) - Number(a.orderId === fromOrder))
        : [];

    return (
        <AccountLayout
            title={t('reviews.accountTitle')}
            eyebrow={t('account.eyebrow')}
            badges={{ toReview: data?.toReview.length || 0 }}
        >
            {notice && <p className="ui-alert ui-alert--success mb-4" role="status">{notice}</p>}
            {error && <p className="ui-alert ui-alert--error mb-4">{error}</p>}
            {data === null ? (
                <p className="ui-muted">{t('account.loading')}</p>
            ) : (
                <>
                    <section className="account-section">
                        <h2 className="font-bold text-lg text-slate-900 mb-3">{t('reviews.toReview')}</h2>
                        {toReview.length === 0 ? (
                            <div className="ui-card ui-empty">
                                <p>{t('reviews.nothingToReview')}</p>
                            </div>
                        ) : (
                            <div className="record-list">
                                {toReview.map(item => (
                                    <div className="record-card" key={item.productId}>
                                        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                                            <div className="record-card__thumbs" aria-hidden="true">
                                                <img src={imageAt(item.image, 400)} alt="" loading="lazy" />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                {productHref(item) ? (
                                                    <Link href={productHref(item)} className="record-card__title hover:underline">
                                                        {item.title}
                                                    </Link>
                                                ) : (
                                                    <p className="record-card__title">{item.title}</p>
                                                )}
                                                {item.orderId === fromOrder && (
                                                    <p className="record-card__meta">{t('reviews.fromThisOrder')}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="ui-btn ui-btn--primary ui-btn--small"
                                            onClick={() => setEditing({ productId: item.productId, title: item.title, existing: null })}
                                        >
                                            {t('reviews.write')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    <section className="account-section">
                        <h2 className="font-bold text-lg text-slate-900 mb-3">{t('reviews.mine')}</h2>
                        {data.reviews.length === 0 ? (
                            <div className="ui-card ui-empty">
                                <p>{t('reviews.noneYet')}</p>
                            </div>
                        ) : (
                            <div className="review-list">
                                {data.reviews.map(review => (
                                    <article className="review-item" key={review.id}>
                                        <div className="review-item__head">
                                            {productHref(review) ? (
                                                <Link href={productHref(review)} className="review-item__name hover:underline">
                                                    {review.title}
                                                </Link>
                                            ) : (
                                                <span className="review-item__name">{review.title}</span>
                                            )}
                                            <Stars value={review.rating} size="sm" />
                                            <span className="review-item__date">{formatDate(review.updatedAt)}</span>
                                            {review.status === 'hidden' && (
                                                <Badge tone="danger" size="sm">{t('reviews.hidden')}</Badge>
                                            )}
                                        </div>
                                        {review.comment && (
                                            <p className="review-item__comment" dir="auto">
                                                {review.comment}
                                            </p>
                                        )}
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                className="ui-btn ui-btn--secondary ui-btn--small"
                                                onClick={() =>
                                                    setEditing({ productId: review.productId, title: review.title, existing: review })
                                                }
                                            >
                                                {t('reviews.editOrDelete')}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
            {editing && (
                <ReviewForm
                    productId={editing.productId}
                    productTitle={editing.title}
                    existing={editing.existing}
                    onClose={() => setEditing(null)}
                    onSaved={result => done(result.review.created ? t('reviews.thanks') : t('reviews.updated'))}
                    onDeleted={() => done(t('reviews.deleted'))}
                />
            )}
        </AccountLayout>
    );
}
