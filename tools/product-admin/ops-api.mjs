// Local operations API for the admin tool: devices, orders/quotes, reviews, customers.
// Runs only on this computer (127.0.0.1) with the Admin SDK and the local service-account
// key; it is never deployed. Every write goes through the same shared functions as the
// website API (lib/server/*), so status history, review stats and enrolment rules match.
//
// Target: the Firebase emulators when FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
// are set (npm run admin:emulated), otherwise PRODUCTION (npm run admin).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const firebase = require('../../lib/firebase/admin.js');
const lib = file => pathToFileURL(path.join(repoRoot, 'lib', 'server', file)).href;

const [{ HttpError }, devices, statusUpdates, moderation, users] = await Promise.all([
    import(lib('http.js')),
    import(lib('devices.js')),
    import(lib('statusUpdates.js')),
    import(lib('reviewModeration.js')),
    import(lib('adminUsers.js')),
]);

// Recorded as `by` in status history, review moderation and admin events.
const STAFF = { uid: `local-admin:${os.userInfo().username}` };

export function target() {
    if (firebase.usingEmulators()) {
        return { mode: 'emulator', projectId: process.env.GCLOUD_PROJECT || 'demo-sofracom' };
    }
    try {
        const app = firebase.getFirebaseApp();
        const projectId = app.options.projectId || app.options.credential?.projectId || 'unknown';
        return { mode: 'production', projectId };
    } catch (err) {
        return { mode: 'production', projectId: 'unknown', error: err.message };
    }
}

function productTitles() {
    const file = path.join(repoRoot, 'public', 'assets', 'data', 'products.json');
    const titles = new Map();
    const catalog = JSON.parse(fs.readFileSync(file, 'utf-8'));
    (catalog.categories || []).forEach(category =>
        (category.products || []).forEach(product => titles.set(product.id, product.title))
    );
    return titles;
}

const send = (res, status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
};

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
            if (data.length > 100_000) reject(new HttpError(413, 'Payload too large'));
        });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch {
                reject(new HttpError(400, 'Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

const ROUTES = {
    'GET /api/ops/target': async () => target(),

    // Devices (staff phone app)
    'GET /api/ops/devices': async () => ({
        devices: await devices.listDevices(),
        code: await devices.latestCodeStatus(),
    }),
    'POST /api/ops/devices/code': async () => devices.generateCode(STAFF),
    'POST /api/ops/devices/revoke': async ({ body }) => ({ device: await devices.revokeDevice(body.id, STAFF) }),

    // Orders and quotes
    'GET /api/ops/orders': async ({ url }) => ({
        items: await statusUpdates.listForStaff('orders', { status: url.searchParams.get('status') || undefined }),
    }),
    'GET /api/ops/quotes': async ({ url }) => ({
        items: await statusUpdates.listForStaff('quotes', { status: url.searchParams.get('status') || undefined }),
    }),
    'POST /api/ops/orders/status': async ({ body }) => ({ item: await statusUpdates.changeStatus('orders', body, STAFF) }),
    'POST /api/ops/quotes/status': async ({ body }) => ({ item: await statusUpdates.changeStatus('quotes', body, STAFF) }),

    // Reviews
    'GET /api/ops/reviews': async ({ url }) => {
        const titles = productTitles();
        const items = await moderation.listReviewsForStaff({ status: url.searchParams.get('status') || undefined });
        return { items: items.map(review => ({ ...review, productTitle: titles.get(review.productId) || review.productId })) };
    },
    'POST /api/ops/reviews/status': async ({ body }) => ({
        item: await moderation.setReviewStatus(body.id, body.status, STAFF),
    }),

    // Customers
    'GET /api/ops/users': async ({ url }) => ({ users: await users.searchUsers(url.searchParams.get('q') || '') }),
    'GET /api/ops/user': async ({ url }) => users.userDetail(url.searchParams.get('uid')),
    'POST /api/ops/users/temp-password': async ({ body }) => users.setTemporaryPassword(body.uid, STAFF),
};

// Returns true when the request was an operations API call.
export async function handleOps(req, res, url) {
    if (!url.pathname.startsWith('/api/ops/')) return false;
    const route = ROUTES[`${req.method} ${url.pathname}`];
    if (!route) {
        send(res, 404, { ok: false, error: 'Not found', code: 'not-found' });
        return true;
    }
    try {
        const body = req.method === 'POST' ? await readBody(req) : {};
        send(res, 200, { ok: true, ...(await route({ url, body })) });
    } catch (err) {
        if (err instanceof HttpError) {
            send(res, err.status, { ok: false, error: err.message, code: err.code });
        } else {
            console.error(`[ops] ${req.method} ${url.pathname} failed`, err);
            send(res, 500, { ok: false, error: err.message || 'Server error', code: 'server/error' });
        }
    }
    return true;
}
