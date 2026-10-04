import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest, errorMessage } from '../../lib/apiClient';
import { useFormatDate } from '../account/Status';
import { Stars } from './Stars';
import ReviewForm from './ReviewForm';
import { authLink } from '../../lib/redirect';

function RatingSummary({ stats }) {
    const { t } = useLang();
    const count = stats?.count || 0;
    return (
        <div className="rating-summary">
            <div>
                <p className="rating-summary__score">{count ? stats.avg.toFixed(1) : '–'}</p>
                <Stars value={stats?.avg || 0} size="lg" />
                <p className="ui-muted mt-1">{t('reviews.count', { count })}</p>
            </div>
            <div className="rating-bars">
                {[5, 4, 3, 2, 1].map(star => {
                    const n = stats?.dist?.[star] || 0;
                    const pct = count ? Math.round((n / count) * 100) : 0;
                    return (
                        <div className="rating-bar" key={star}>
                            <span>{t('reviews.nStarsShort', { count: star })}</span>
                            <span
                                className="rating-bar__track"
                                role="img"
                                aria-label={t('reviews.barLabel', { count: n, stars: star })}
                            >
                                <span className="rating-bar__fill" style={{ width: `${pct}%`, display: 'block' }} />
                            </span>
                            <span>{pct}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Reviews section for a statically generated product page. Everything is loaded in
// the browser so new reviews show up without a redeploy.
export default function ProductReviews({ productId, productTitle }) {
    const { t } = useLang();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const formatDate = useFormatDate();
    const [sort, setSort] = useState('newest');
    const [stats, setStats] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mine, setMine] = useState(null); // { eligible, review }
    const [formOpen, setFormOpen] = useState(false);
    const [notice, setNotice] = useState('');

    const loadPage = useCallback(
        async ({ append = false, from = null, fresh = false } = {}) => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({ productId, sort });
                if (from) params.set('cursor', from);
                // Skip the short CDN cache right after the user changed their own review.
                if (fresh) params.set('fresh', String(Date.now()));
                const result = await apiRequest(`/api/reviews?${params}`);
                if (result.stats) setStats(result.stats);
                setReviews(current => (append ? [...current, ...result.reviews] : result.reviews));
                setCursor(result.nextCursor);
            } catch (err) {
                setError(errorMessage(t, err));
            } finally {
                setLoading(false);
            }
        },
        [productId, sort, t]
    );

    useEffect(() => {
        loadPage();
    }, [loadPage]);

    const loadMine = useCallback(async () => {
        if (!user) {
            setMine(null);
            return;
        }
        try {
            setMine(await apiRequest(`/api/reviews/mine?productId=${encodeURIComponent(productId)}`, { user }));
        } catch {
            setMine(null);
        }
    }, [user, productId]);

    useEffect(() => {
        loadMine();
    }, [loadMine]);

    // Deep link from "Rate your items": /products/...#write-review opens the form once.
    // The hash is then dropped, so publishing (which reloads `mine`) doesn't reopen it.
    const autoOpened = useRef(false);
    useEffect(() => {
        if (autoOpened.current || !mine?.eligible || !router.asPath.endsWith('#write-review')) return;
        autoOpened.current = true;
        setFormOpen(true);
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }, [mine, router.asPath]);

    const afterChange = (result, message) => {
        setFormOpen(false);
        if (result?.stats) setStats(result.stats);
        setNotice(message);
        loadPage({ fresh: true });
        loadMine();
    };

    const renderAction = () => {
        if (authLoading) return null;
        if (!user) {
            return (
                <p className="ui-muted">
                    <Link href={authLink('login', router.asPath, { hash: 'write-review' })} className="ui-link">
                        {t('nav.signIn')}
                    </Link>{' '}
                    {t('reviews.signInToReview')}
                </p>
            );
        }
        if (mine?.review) {
            return (
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setFormOpen(true)}>
                    {t('reviews.editYours')}
                </button>
            );
        }
        if (mine?.eligible) {
            return (
                <button type="button" className="ui-btn ui-btn--primary" onClick={() => setFormOpen(true)}>
                    {t('reviews.write')}
                </button>
            );
        }
        return mine ? <p className="ui-muted">{t('reviews.onlyBuyers')}</p> : null;
    };

    return (
        <section id="reviews" className="mt-12" aria-labelledby="reviews-title">
            <div className="review-toolbar mb-5">
                <h2 id="reviews-title" className="text-2xl font-extrabold text-slate-900">
                    {t('reviews.title')}
                </h2>
                {renderAction()}
            </div>
            {notice && <p className="ui-alert ui-alert--success mb-4" role="status">{notice}</p>}
            <div className="ui-card mb-6">
                <RatingSummary stats={stats} />
            </div>
            {stats?.count > 0 && (
                <div className="review-toolbar mb-4">
                    <span className="ui-muted">{t('reviews.count', { count: stats.count })}</span>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        {t('reviews.sortBy')}
                        <select value={sort} onChange={event => setSort(event.target.value)}>
                            <option value="newest">{t('reviews.sortNewest')}</option>
                            <option value="highest">{t('reviews.sortHighest')}</option>
                            <option value="lowest">{t('reviews.sortLowest')}</option>
                        </select>
                    </label>
                </div>
            )}
            {error && <p className="ui-alert ui-alert--error mb-4">{error}</p>}
            {!loading && !error && reviews.length === 0 ? (
                <div className="ui-card ui-empty">{t('reviews.none')}</div>
            ) : (
                <div className="review-list">
                    {reviews.map(review => (
                        <article className="review-item" key={review.id}>
                            <div className="review-item__head">
                                <bdi className="review-item__name">{review.displayName}</bdi>
                                <Stars value={review.rating} size="sm" />
                                {review.verified && <span className="verified-badge">✓ {t('reviews.verified')}</span>}
                                <span className="review-item__date">{formatDate(review.createdAt)}</span>
                            </div>
                            {review.comment && (
                                <p className="review-item__comment" lang={review.lang || undefined} dir="auto">
                                    {review.comment}
                                </p>
                            )}
                        </article>
                    ))}
                </div>
            )}
            {cursor && (
                <div className="text-center mt-5">
                    <button
                        type="button"
                        className="ui-btn ui-btn--secondary"
                        onClick={() => loadPage({ append: true, from: cursor })}
                        disabled={loading}
                    >
                        {loading ? t('account.loading') : t('reviews.loadMore')}
                    </button>
                </div>
            )}
            {formOpen && (
                <ReviewForm
                    productId={productId}
                    productTitle={productTitle}
                    existing={mine?.review}
                    onClose={() => setFormOpen(false)}
                    onSaved={result => afterChange(result, result.review.created ? t('reviews.thanks') : t('reviews.updated'))}
                    onDeleted={result => afterChange(result, t('reviews.deleted'))}
                />
            )}
        </section>
    );
}
