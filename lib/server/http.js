// Small helpers shared by API routes: JSON body parsing, responses, method routing
// and uniform error handling.

const DEFAULT_CODES = {
    400: 'bad-request',
    401: 'auth/required',
    403: 'forbidden',
    404: 'not-found',
    405: 'method-not-allowed',
    413: 'payload-too-large',
    429: 'rate-limited',
};

// Every API error carries a machine-readable code, falling back to one per status.
export class HttpError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code || DEFAULT_CODES[status] || 'error';
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

// Maps unexpected Firebase/gRPC failures to stable codes so a 500 always says what
// kind of problem it is (the details stay in the server log).
export function classifyServerError(err) {
    const text = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
    const grpc = typeof err?.code === 'number' ? err.code : null;
    if (text.includes('requires an index') || text.includes('index is currently building')) {
        return { status: 500, code: 'server/index-missing' };
    }
    if (
        text.includes('missing firebase credentials') ||
        text.includes('invalid_grant') ||
        text.includes('failed to parse private key') ||
        text.includes('invalid jwt signature') ||
        text.includes('credential implementation provided') ||
        text.includes('getting metadata from plugin failed') ||
        text.includes('decoder routines') ||
        grpc === 16
    ) {
        return { status: 500, code: 'server/credentials' };
    }
    if (grpc === 7 || text.includes('permission_denied') || text.includes('permission denied')) {
        return { status: 500, code: 'server/permission-denied' };
    }
    if (grpc === 14 || grpc === 4 || text.includes('deadline exceeded') || text.includes('unavailable')) {
        return { status: 503, code: 'server/unavailable' };
    }
    return { status: 500, code: 'server/error' };
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
            res.status(405).json({ ok: false, error: 'Method not allowed', code: 'method-not-allowed' });
            return;
        }
        try {
            await run(req, res);
        } catch (err) {
            if (err instanceof HttpError) {
                res.status(err.status).json({ ok: false, error: err.message, code: err.code });
                return;
            }
            const { status, code } = classifyServerError(err);
            // The full error (stack, gRPC details) goes to the server log only.
            console.error(`[api] ${req.method} ${req.url} failed (${code})`, err);
            res.status(status).json({ ok: false, error: 'Something went wrong. Please try again.', code });
        }
    };
}
