// Small helpers shared by API routes: JSON body parsing, responses, method routing
// and uniform error handling.

export class HttpError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export async function readJson(req, maxBytes = 100_000) {
    if (req.body && typeof req.body === 'object') {
        if (JSON.stringify(req.body).length > maxBytes) {
            throw new HttpError(413, 'Payload too large');
        }
        return req.body;
    }
    if (typeof req.body === 'string') {
        if (req.body.length > maxBytes) throw new HttpError(413, 'Payload too large');
        try {
            return req.body ? JSON.parse(req.body) : {};
        } catch {
            throw new HttpError(400, 'Invalid JSON payload');
        }
    }
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk.toString();
            if (data.length > maxBytes) {
                reject(new HttpError(413, 'Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch {
                reject(new HttpError(400, 'Invalid JSON payload'));
            }
        });
        req.on('error', reject);
    });
}

export const clientIp = req => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress || 'unknown';
};

// Routes a request to handlers keyed by HTTP method and turns thrown HttpErrors into
// `{ok:false,error}` responses. `cors: true` keeps the open CORS policy the public
// order/quote endpoints already had.
export function apiRoute(handlers, { cors = false } = {}) {
    return async function handler(req, res) {
        res.setHeader('Content-Type', 'application/json');
        const allowed = [...Object.keys(handlers), 'OPTIONS'].join(', ');
        if (cors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', allowed);
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        const run = handlers[req.method];
        if (!run) {
            res.setHeader('Allow', allowed);
            res.status(405).json({ ok: false, error: 'Method not allowed' });
            return;
        }
        try {
            await run(req, res);
        } catch (err) {
            if (err instanceof HttpError) {
                res.status(err.status).json({ ok: false, error: err.message, code: err.code });
                return;
            }
            console.error(`[api] ${req.method} ${req.url} failed`, err);
            res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
        }
    };
}
