import { randomUUID } from 'crypto';
import { getDb, getFirebaseApp, usingEmulators } from '../../lib/firebase/admin';
import { apiRoute, clientIp, readJson, HttpError } from '../../lib/server/http';
import { rateLimit, MINUTE } from '../../lib/server/rateLimit';
import { cleanString } from '../../lib/server/validate';
import { priceCart } from '../../lib/server/catalog';
import { formatPrice } from '../../lib/constants';

function readCustomer(payload) {
    const customer = payload.customer && typeof payload.customer === 'object' ? payload.customer : {};
    return {
        name: cleanString(customer.name, { field: 'Name', min: 2, max: 120, required: true }),
        phone: cleanString(customer.phone, { field: 'Phone', min: 6, max: 40, required: true }),
        address: cleanString(customer.address, { field: 'Address', min: 6, max: 500, required: true }),
        notes: cleanString(customer.notes, { field: 'Notes', max: 1000 }),
    };
}

async function notifyTeam(order) {
    // There is no messaging emulator; skip push notifications in local/test runs.
    if (usingEmulators()) return;
    try {
        await getFirebaseApp().messaging().send({
            topic: 'sofracom-orders',
            notification: {
                title: `New order from ${order.customer_name}`,
                body: `${order.items.length} item(s) · ${formatPrice(order.total)}`,
            },
            data: {
                orderId: order.id,
                customerName: order.customer_name,
                total: String(order.total ?? 0),
                currency: order.currency,
            },
        });
    } catch (err) {
        console.warn('[order] FCM notify failed', err.message);
    }
}

export default apiRoute(
    {
        POST: async (req, res) => {
            rateLimit(`order:${clientIp(req)}`, { limit: 10, windowMs: 10 * MINUTE });
            const payload = await readJson(req);
            if (!payload || typeof payload !== 'object') throw new HttpError(400, 'Missing request body');

            const customer = readCustomer(payload);
            // Prices, titles and stock come from the catalog, never from the request.
            const priced = priceCart(payload.items);

            const orderId = randomUUID();
            const now = new Date().toISOString();
            const order = {
                id: orderId,
                created_at: now,
                customer_name: customer.name,
                customer_phone: customer.phone,
                customer_address: customer.address,
                customer_notes: customer.notes,
                // `id` and `price` keep the line shape older readers (order-admin, mobile app) expect.
                items: priced.items.map(({ stock, ...line }) => ({
                    ...line,
                    id: line.variantLabel ? `${line.productId}-${line.variantLabel}` : line.productId,
                    price: line.unitPrice,
                })),
                productIds: priced.productIds,
                subtotal: priced.subtotal,
                delivery_fee: priced.deliveryFee,
                total: priced.total,
                currency: priced.currency,
                status: 'pending',
                statusHistory: [{ status: 'pending', at: now }],
            };

            await getDb().collection('orders').doc(orderId).set(order);
            await notifyTeam(order);

            res.status(200).json({
                ok: true,
                orderId,
                persisted: true,
                total: order.total,
                hasOnOrderItem: priced.hasOnOrderItem,
            });
        },
    },
    { cors: true }
);
