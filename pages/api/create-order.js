const { randomUUID } = require('crypto');
const { getFirebaseApp } = require('./firebase-service');
const { authenticateRequest } = require('../../lib/serverAuth');

/* ---------- utils ---------- */
async function readJson(req) {
    if (req.body && typeof req.body === 'object') return req.body;

    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk.toString();
            if (data.length > 1_000_000) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            try { resolve(data ? JSON.parse(data) : {}); }
            catch { reject(new Error('Invalid JSON payload')); }
        });
        req.on('error', reject);
    });
}

function validatePayload(payload) {
    const errors = [];
    if (!payload || typeof payload !== 'object') return ['Missing request body'];

    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) errors.push('Cart is empty');

    const customer = payload.customer || {};
    if (!customer.name || String(customer.name).trim().length < 2) errors.push('Name is required');
    if (!customer.phone || String(customer.phone).trim().length < 6) errors.push('Phone is required');
    if (!customer.address || String(customer.address).trim().length < 6) errors.push('Address is required');

    return errors;
}

/* ---------- handler ---------- */
module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS');
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
    }

    let auth;
    try {
        auth = await authenticateRequest(req);
    } catch (err) {
        res.status(err.status || 401).json({ ok: false, error: err.message });
        return;
    }

    let payload;
    try {
        payload = await readJson(req);
    } catch (err) {
        res.status(400).json({ ok: false, error: err.message });
        return;
    }

    const errors = validatePayload(payload);
    if (errors.length) {
        res.status(400).json({ ok: false, error: errors.join(', ') });
        return;
    }

    const orderId = randomUUID();
    const timestamp = new Date().toISOString();

    const order = {
        id: orderId,
        created_at: timestamp,
        customer_name: payload.customer.name.trim(),
        customer_phone: payload.customer.phone.trim(),
        customer_address: payload.customer.address.trim(),
        customer_address_id: payload.customer.addressId || null,
        customer_notes: (payload.customer.notes || '').trim(),
        customer_uid: auth.uid,
        customer_email: auth.email || '',
        items: payload.items,
        delivery_fee: Number.isFinite(payload.delivery_fee) ? payload.delivery_fee : 0,
        total: Number.isFinite(payload.total) ? payload.total : 0,
        currency: payload.currency || 'TND',
        status: 'new',
    };

    try {
        const firestore = getFirebaseApp().firestore();
        await firestore.collection('orders').doc(orderId).set(order);
        const profileRef = firestore.collection('profiles').doc(auth.uid);
        await profileRef.collection('orders').doc(orderId).set(order);
        await profileRef.set(
            {
                name: order.customer_name,
                phone: order.customer_phone,
                ...(order.customer_address ? { last_address: order.customer_address } : {}),
                updated_at: timestamp,
            },
            { merge: true }
        );

        try {
            const messaging = getFirebaseApp().messaging();
            const summary = Number.isFinite(order.total)
                ? new Intl.NumberFormat('fr-TN', { style: 'currency', currency: order.currency || 'TND' }).format(order.total)
                : `${order.total || 0} ${order.currency || 'TND'}`;

            await messaging.send({
                topic: 'sofracom-orders',
                notification: {
                    title: `New order from ${order.customer_name}`,
                    body: `${order.items.length} item(s) · ${summary}`,
                },
                data: {
                    orderId,
                    customerName: order.customer_name,
                    total: String(order.total ?? 0),
                    currency: order.currency || 'TND',
                },
            });
        } catch (err) {
            console.warn('[order] FCM notify failed', err);
        }

        res.status(200).json({ ok: true, orderId, persisted: true });
    } catch (err) {
        console.error('[order] persistence failed', err);
        res.status(500).json({ ok: false, error: err.message || 'Unable to store order' });
    }
};
