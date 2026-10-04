import { apiRoute } from '../../lib/server/http';
import { getAllStats } from '../../lib/server/reviews';

// Public: average rating and count for every reviewed product (for cards and search).
export default apiRoute({
    GET: async (req, res) => {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.status(200).json({ ok: true, stats: await getAllStats() });
    },
});
