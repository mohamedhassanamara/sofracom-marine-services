const { randomUUID } = require('crypto');
const { getFirebaseApp } = require('./firebase-service');

async function readJson(req) {
    if (req.body && typeof req.body === 'object') return req.body;

    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk.toString();
            if (data.length > 500_000) {
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

function validateQuote(payload) {
    const errors = [];
    if (!payload || typeof payload !== 'object') return ['Missing request body'];
    if (!payload.name || String(payload.name).trim().length < 2) errors.push('Name is required');
    if (!payload.email || String(payload.email).trim().length < 5 || !payload.email.includes('@')) errors.push('Valid email is required');
    if (!payload.details || String(payload.details).trim().length < 10) errors.push('Tell us more about your project');
    return errors;
}

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

    const errors = validateQuote(payload);
    if (errors.length) {
        res.status(400).json({ ok: false, error: errors.join(', ') });
        return;
    }

    const quoteId = randomUUID();
    const timestamp = new Date().toISOString();
    const quote = {
        id: quoteId,
        created_at: timestamp,
        customer_name: payload.name.trim(),
        customer_email: payload.email.trim(),
        customer_phone: (payload.phone || '').trim(),
        subject: (payload.subject || '').trim(),
        details: payload.details.trim(),
        project_type: payload.project_type || 'general',
        status: 'new',
    };

    try {
        const firestore = getFirebaseApp().firestore();
        await firestore.collection('quotes').doc(quoteId).set(quote);
        try {
            const messaging = getFirebaseApp().messaging();
            const bodyText = quote.details.length > 100 ? `${quote.details.slice(0, 100)}…` : quote.details;
            await messaging.send({
                topic: 'sofracom-quotes',
                notification: {
                    title: `New quote from ${quote.customer_name}`,
                    body: bodyText || 'Project request received',
                },
                data: {
                    quoteId,
                    customerName: quote.customer_name,
                    subject: quote.subject || 'Project request',
                },
            });
        } catch (err) {
            console.warn('[quote] FCM notify failed', err);
        }
        res.status(200).json({ ok: true, quoteId });
    } catch (err) {
        console.error('[quote] persistence failed', err);
        res.status(500).json({ ok: false, error: err.message || 'Unable to store quote' });
    }
};
