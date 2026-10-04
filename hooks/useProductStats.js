import { useEffect, useState } from 'react';

// Ratings for all reviewed products, fetched once per page load and shared by every
// card. Product pages are static, so this is loaded in the browser.
let cache = null;
let pending = null;

const fetchStats = () => {
    if (!pending) {
        pending = fetch('/api/product-stats')
            .then(response => (response.ok ? response.json() : { stats: {} }))
            .then(result => {
                cache = result.stats || {};
                return cache;
            })
            .catch(() => {
                pending = null;
                return {};
            });
    }
    return pending;
};

export default function useProductStats() {
    const [stats, setStats] = useState(cache || {});
    useEffect(() => {
        let active = true;
        fetchStats().then(result => active && setStats(result));
        return () => {
            active = false;
        };
    }, []);
    return stats;
}
