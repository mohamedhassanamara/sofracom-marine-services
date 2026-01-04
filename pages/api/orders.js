const { getFirebaseApp } = require('./firebase-service');
const { authenticateRequest } = require('../../lib/serverAuth');

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function sendResponse(res, status, payload) {
    res.writeHead(status, DEFAULT_HEADERS);
    res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendResponse(res, 204, {});
        return;
    }

    if (req.method !== 'GET') {
        sendResponse(res, 405, { ok: false, error: 'Method not allowed' });
        return;
    }

    let auth;
    try {
        auth = await authenticateRequest(req);
    } catch (err) {
        const status = err.status || 401;
        sendResponse(res, status, { ok: false, error: err.message });
        return;
    }

    try {
        const firestore = getFirebaseApp().firestore();
        const snapshot = await firestore
            .collection('profiles')
            .doc(auth.uid)
            .collection('orders')
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();
        const orders = snapshot.docs.map(doc => doc.data());
        sendResponse(res, 200, { ok: true, orders });
    } catch (error) {
        console.error('[orders] fetch failed', error);
        sendResponse(res, 500, { ok: false, error: 'Unable to load orders' });
    }
};
