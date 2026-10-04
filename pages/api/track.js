import { getDb } from '../../lib/firebase/admin';
import { apiRoute, clientIp, readJson, HttpError } from '../../lib/server/http';
import { durableRateLimit } from '../../lib/server/durableRateLimit';
import { normalizeRef } from '../../lib/server/refs';
import { HOUR } from '../../lib/server/rateLimit';
import { historyFor, normalizeOrderStatus } from '../../lib/status';

// Guest order tracking: reference + the phone number given at checkout → status timeline
// and items. Never the name, address, email or notes. Every failure looks the same, and
// attempts are capped per IP and per reference across all server instances.
const NOT_FOUND = () => new HttpError(404, 'No order matches that reference and phone number.', 'track/not-found');
const digits = value => String(value || '').replace(/\D/g, '');
// Tunisian numbers are 8 digits; compare those so "+216 52 663 210" matches "52663210".
const samePhone = (given, stored) => {
    const a = digits(given);
    const b = digits(stored);
    return a.length >= 8 && b.length >= 8 && a.slice(-8) === b.slice(-8);
};

export default apiRoute({
    POST: async (req, res) => {
        const payload = await readJson(req, 2_000);
        const ref = normalizeRef(payload?.ref);
        const phone = typeof payload?.phone === 'string' ? payload.phone : '';
        if (!ref || ref.startsWith('SOQ') || digits(phone).length < 8) {
            throw new HttpError(400, 'Enter your order reference (SOF-XXXXX) and phone number.', 'track/invalid');
        }

        const db = getDb();
        await durableRateLimit(db, `track-ip:${clientIp(req)}`, { limit: 20, windowMs: HOUR });
        await durableRateLimit(db, `track-ref:${ref}`, { limit: 8, windowMs: HOUR });

        const refDoc = await db.collection('refs').doc(ref).get();
        if (!refDoc.exists || refDoc.data().kind !== 'order') throw NOT_FOUND();
        const snapshot = await db.collection('orders').doc(refDoc.data().docId).get();
        if (!snapshot.exists) throw NOT_FOUND();
        const order = snapshot.data();
        if (!samePhone(phone, order.customer_phone)) throw NOT_FOUND();

        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({
            ok: true,
            order: {
                ref,
                createdAt: order.created_at || null,
                status: normalizeOrderStatus(order.status),
                history: historyFor(order, normalizeOrderStatus).map(({ status, at, note }) => ({ status, at: at || null, note: note || null })),
                items: (order.items || []).map(item => ({
                    productId: item.productId || null,
                    title: item.title || '',
                    variantLabel: item.variantLabel || null,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice ?? item.price ?? 0,
                    image: item.image || null,
                })),
                subtotal: order.subtotal ?? null,
                deliveryFee: order.delivery_fee ?? null,
                total: order.total ?? null,
                hasAccount: Boolean(order.uid),
            },
        });
    },
});
