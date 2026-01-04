const { randomUUID } = require('crypto');
const { getFirebaseApp } = require('./firebase-service');
const { authenticateRequest } = require('../../lib/serverAuth');

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function readJson(req) {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }
    return {};
}

function sanitizeAddresses(addresses) {
    if (!Array.isArray(addresses)) return [];
    return addresses
        .map(entry => {
            const address = typeof entry.address === 'string' ? entry.address.trim() : '';
            if (!address) return null;
            const label = typeof entry.label === 'string' ? entry.label.trim() : '';
            const id = typeof entry.id === 'string' && entry.id ? entry.id : randomUUID();
            return { id, label, address };
        })
        .filter(Boolean);
}

function sendResponse(res, status, payload) {
    res.writeHead(status, DEFAULT_HEADERS);
    res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendResponse(res, 204, {});
        return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
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

    const firestore = getFirebaseApp().firestore();
    const profileRef = firestore.collection('profiles').doc(auth.uid);

    if (req.method === 'GET') {
        const snapshot = await profileRef.get();
        const profile = snapshot.exists ? snapshot.data() : {};
        sendResponse(res, 200, { ok: true, profile });
        return;
    }

    const payload = await readJson(req);
    const updates = {};
    if (typeof payload.name === 'string') {
        updates.name = payload.name.trim();
    }
    if (typeof payload.phone === 'string') {
        updates.phone = payload.phone.trim();
    }
    const sanitized = sanitizeAddresses(payload.addresses);
    if (payload.hasOwnProperty('addresses')) {
        updates.addresses = sanitized;
    }
    if (payload.defaultAddressId && typeof payload.defaultAddressId === 'string') {
        const addressExists = sanitized.some(address => address.id === payload.defaultAddressId);
        updates.defaultAddressId = addressExists ? payload.defaultAddressId : sanitized[0]?.id || payload.defaultAddressId;
    } else if (sanitized.length && !updates.defaultAddressId) {
        updates.defaultAddressId = sanitized[0].id;
    }
    updates.updated_at = new Date().toISOString();

    try {
        await profileRef.set(updates, { merge: true });
        const updated = await profileRef.get();
        sendResponse(res, 200, { ok: true, profile: updated.exists ? updated.data() : {} });
    } catch (error) {
        console.error('[profile] update failed', error);
        sendResponse(res, 500, { ok: false, error: 'Unable to update profile' });
    }
};
