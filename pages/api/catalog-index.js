import { getCategories } from '../../lib/products';
import { buildCatalogIndex } from '../../lib/catalogIndex';

let cached = null;

// Public, cached at the edge until the next deploy (the catalog only changes by deploying).
export default function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ ok: false, error: 'Method not allowed', code: 'method-not-allowed' });
        return;
    }
    if (!cached) cached = buildCatalogIndex(getCategories());
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(cached);
}
