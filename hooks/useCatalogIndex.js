import { useCallback, useEffect, useState } from 'react';

// The slim catalog (categories + search index), fetched once per visit: on first use, or
// when the browser is idle after the page has loaded.
let cache = null;
let pending = null;
const listeners = new Set();

export function loadCatalogIndex() {
    if (cache) return Promise.resolve(cache);
    if (!pending) {
        pending = fetch('/api/catalog-index')
            .then(response => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
            .then(data => {
                cache = data;
                listeners.forEach(listener => listener(data));
                return data;
            })
            .catch(error => {
                pending = null;
                throw error;
            });
    }
    return pending;
}

export default function useCatalogIndex({ prefetch = false } = {}) {
    const [index, setIndex] = useState(cache);
    useEffect(() => {
        listeners.add(setIndex);
        if (cache) setIndex(cache);
        let idle = null;
        if (prefetch && !cache) {
            const run = () => loadCatalogIndex().catch(() => {});
            idle = 'requestIdleCallback' in window ? window.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500);
        }
        return () => {
            listeners.delete(setIndex);
            if (idle !== null) ('cancelIdleCallback' in window ? window.cancelIdleCallback(idle) : window.clearTimeout(idle));
        };
    }, [prefetch]);
    const load = useCallback(() => loadCatalogIndex().catch(() => null), []);
    return { index, load };
}
