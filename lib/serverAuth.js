const { getFirebaseApp } = require('../pages/api/firebase-service');

function extractToken(req) {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header) return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

async function authenticateRequest(req) {
    const token = extractToken(req);
    if (!token) {
        const error = new Error('Missing Authorization header');
        error.status = 401;
        throw error;
    }
    try {
        const decoded = await getFirebaseApp().auth().verifyIdToken(token);
        return {
            uid: decoded.uid,
            email: decoded.email || null,
            token,
        };
    } catch (err) {
        const error = new Error('Invalid authentication token');
        error.status = 401;
        throw error;
    }
}

module.exports = {
    authenticateRequest,
};
