import { randomUUID } from 'crypto';
import { getDb, getFirebaseApp, usingEmulators } from '../../lib/firebase/admin';
import { apiRoute, clientIp, readJson, HttpError } from '../../lib/server/http';
import { rateLimit, MINUTE } from '../../lib/server/rateLimit';
import { cleanEmail, cleanString } from '../../lib/server/validate';
import { getUser } from '../../lib/server/auth';
import { addAddress, addressesRef, cleanAddress, ensureUserDoc, formatAddress, userRef } from '../../lib/server/users';
import { priceCart } from '../../lib/server/catalog';
import { formatPrice } from '../../lib/constants';
import { reserveRef } from '../../lib/server/refs';

function readGuestCustomer(customer) {
    return {
        name: cleanString(customer.name, { field: 'Name', min: 2, max: 120, required: true }),
        phone: cleanString(customer.phone, { field: 'Phone', min: 6, max: 40, required: true }),
        address: cleanString(customer.address, { field: 'Address', min: 6, max: 500, required: true }),
        addressId: null,
    };
}

// Signed-in customers either pick a saved address (read from their own
// users/{uid}/addresses, never from the request) or enter a new one, optionally saved.
async function readMemberCustomer(user, payload, customer) {
    if (payload.addressId) {
        const id = cleanString(payload.addressId, { field: 'Address id', max: 64, required: true });
        const snapshot = await addressesRef(user.uid).doc(id).get();
        if (!snapshot.exists) throw new HttpError(400, 'Saved address not found', 'address/not-found');
        const address = snapshot.data();
        return { name: address.fullName, phone: address.phone, address: formatAddress(address), addressId: id };
    }
    if (payload.newAddress) {
        const address = cleanAddress(payload.newAddress);
        let addressId = null;
        if (payload.saveAddress === true) {
            await ensureUserDoc(user);
            try {
                addressId = await addAddress(user.uid, address);
            } catch (err) {
                // A full address book must not block the order itself.
                if (err.code !== 'address/limit') throw err;
            }
        }
        return { name: address.fullName, phone: address.phone, address: formatAddress(address), addressId };
    }
    return readGuestCustomer(customer);
}

async function notifyTeam(order) {
    // There is no messaging emulator; skip push notifications in local/test runs.
    if (usingEmulators()) return;
    try {
        await getFirebaseApp().messaging().send({
            topic: 'sofracom-orders',
            // No customer details in the push itself; the app loads them from Firestore.
            notification: {
                title: `New order ${order.ref}`,
                body: `${order.items.length} item(s) · ${formatPrice(order.total, 'fr')}`,
            },
            data: { orderId: order.id },
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

            const user = await getUser(req);
            const rawCustomer = payload.customer && typeof payload.customer === 'object' ? payload.customer : {};
            // Prices, titles and stock come from the catalog, never from the request.
            const priced = priceCart(payload.items);
            const customer = user
                ? await readMemberCustomer(user, payload, rawCustomer)
                : readGuestCustomer(rawCustomer);
            const notes = cleanString(rawCustomer.notes, { field: 'Notes', max: 1000 });
            // Identity comes from the verified token; guests may leave an email to link later.
            // Phone accounts have no login email, so fall back to their profile contact email.
            const profileEmail = user && !user.email ? (await userRef(user.uid).get()).data()?.email : null;
            const email = user ? user.email || profileEmail || null : cleanEmail(rawCustomer.email) || null;

            const orderId = randomUUID();
            const now = new Date().toISOString();
            const db = getDb();
            const ref = await reserveRef(db, 'order', orderId);
            const order = {
                id: orderId,
                ref,
                created_at: now,
                customer_name: customer.name,
                customer_phone: customer.phone,
                customer_address: customer.address,
                customer_address_id: customer.addressId,
                customer_notes: notes,
                customer_email: email || '',
                uid: user ? user.uid : null,
                email,
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

            await db.collection('orders').doc(orderId).set(order);
            await notifyTeam(order);

            res.status(200).json({
                ok: true,
                orderId,
                ref,
                persisted: true,
                total: order.total,
                hasOnOrderItem: priced.hasOnOrderItem,
            });
        },
    },
    { cors: true }
);
