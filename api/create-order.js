const { randomUUID } = require('crypto');
const admin = require('firebase-admin');

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

/* ---------- firebase admin bootstrap without json file ---------- */
function getFirebaseApp() {
    if (admin.apps.length) return admin.app();

    // Option A: Single base64 env var
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64) {
        const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        return admin.initializeApp({ credential: admin.credential.cert(json) });
    }

    // Option B: Three separate env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
        );
    }

    // Convert escaped newlines to real newlines if needed
    privateKey = privateKey.replace(/\\n/g, '\n');

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
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
        customer_notes: (payload.customer.notes || '').trim(),
        items: payload.items,
        total: Number.isFinite(payload.total) ? payload.total : 0,
        currency: payload.currency || 'TND',
        status: 'new',
    };

    try {
        const app = getFirebaseApp();
        const firestore = app.firestore();
        await firestore.collection('orders').doc(orderId).set(order);

        res.status(200).json({ ok: true, orderId, persisted: true });
    } catch (err) {
        console.error('[order] persistence failed', err);
        res.status(500).json({ ok: false, error: err.message || 'Unable to store order' });
    }
};