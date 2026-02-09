import { useCallback, useEffect, useState } from 'react';

export function useReviews(productId, options = {}) {
    const { limit = 5, summaryOnly = false, token = '' } = options;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState({ count: 0, average: 0 });
    const [reviews, setReviews] = useState([]);
    const [viewer, setViewer] = useState(null);

    const fetchReviews = useCallback(async () => {
        if (!productId) return;
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ productId });
            if (limit) params.set('limit', String(limit));
            if (summaryOnly) params.set('summaryOnly', '1');
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await fetch(`/api/reviews?${params.toString()}`, { headers });
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || 'Unable to load reviews');
            }
            const nextSummary = payload.summary || {};
            const nextCount = Number(nextSummary.count ?? nextSummary.total) || 0;
            const nextAverage = Number(nextSummary.average) || 0;
            setSummary({ count: nextCount, average: nextAverage });
            setViewer(payload.viewer || null);
            if (!summaryOnly) {
                setReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
            }
        } catch (err) {
            setError(err.message || 'Unable to load reviews');
            setSummary({ count: 0, average: 0 });
            setViewer(null);
            if (!summaryOnly) {
                setReviews([]);
            }
        } finally {
            setLoading(false);
        }
    }, [limit, productId, summaryOnly, token]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    return { loading, error, summary, reviews, viewer, refresh: fetchReviews };
}
