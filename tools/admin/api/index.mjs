// JSON API of the local admin. Every Firebase write goes through the same shared functions
// as the website (lib/server/*), so histories, review stats and enrolment rules match.
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createCatalogStore } from './catalog.mjs';
import { createPublisher } from './publish.mjs';

const require = createRequire(import.meta.url);

class ApiError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function readBody(req, limit = 15 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', chunk => {
            size += chunk.length;
            if (size > limit) {
                reject(new ApiError(413, 'Payload too large', 'payload-too-large'));
                req.destroy();
            } else chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const text = Buffer.concat(chunks).toString('utf-8');
                resolve(text ? JSON.parse(text) : {});
            } catch {
                reject(new ApiError(400, 'Invalid JSON', 'validation'));
            }
        });
        req.on('error', reject);
    });
}

export async function createApi({ repoRoot, codeRoot = repoRoot, targetMode }) {
    const lib = file => import(pathToFileURL(path.join(codeRoot, 'lib', 'server', file)).href);
    const firebase = require(path.join(codeRoot, 'lib', 'firebase', 'admin.js'));
    const [{ HttpError }, devices, statusUpdates, moderation, users, desk] = await Promise.all([
        lib('http.js'),
        lib('devices.js'),
        lib('statusUpdates.js'),
        lib('reviewModeration.js'),
        lib('adminUsers.js'),
        lib('staffDesk.js'),
    ]);
    const catalog = createCatalogStore({ repoRoot });
    const publisher = createPublisher({ repoRoot });
    // Recorded as `by` in status history, notes, review moderation and device events.
    const STAFF = { uid: `local-admin:${os.userInfo().username}` };

    function target() {
        if (firebase.usingEmulators()) return { mode: 'emulator', projectId: process.env.GCLOUD_PROJECT || 'demo-sofracom' };
        try {
            const app = firebase.getFirebaseApp();
            return { mode: 'production', projectId: app.options.projectId || app.options.credential?.projectId || 'unknown' };
        } catch (err) {
            return { mode: 'production', projectId: 'unknown', error: err.message };
        }
    }

    const titles = () => new Map(catalog.products().map(product => [product.id, product.title]));

    // [method, pattern, handler({ params, query, body })]
    const routes = [
        ['GET', '/api/meta', async () => ({ target: { ...target(), requested: targetMode }, git: publisher.gitSummary() })],

        ['GET', '/api/today', async () => {
            const today = await desk.todayForStaff();
            const names = titles();
            today.recentReviews.items = today.recentReviews.items.map(review => ({ ...review, productTitle: names.get(review.productId) || review.productId }));
            return { ...today, translations: catalog.translationQueue() };
        }],

        // Orders and quotes
        ['GET', '/api/:collection(orders|quotes)', async ({ params, query }) =>
            desk.searchForStaff(params.collection, { status: query.get('status') || '', q: query.get('q') || '', from: query.get('from') || '', to: query.get('to') || '', cursor: query.get('cursor') || '', pageSize: query.get('pageSize') || 25 })],
        ['GET', '/api/:collection(orders|quotes)/:id', async ({ params }) => ({ item: await desk.getForStaff(params.collection, params.id) })],
        ['POST', '/api/:collection(orders|quotes)/:id/status', async ({ params, body }) => ({ item: await statusUpdates.changeStatus(params.collection, { id: params.id, status: body.status, note: body.note }, STAFF) })],
        ['POST', '/api/:collection(orders|quotes)/:id/notes', async ({ params, body }) => ({ item: await desk.addStaffNote(params.collection, { id: params.id, text: body.text }, STAFF) })],
        ['POST', '/api/quotes/:id/reply', async ({ params, body }) => ({ item: await desk.setQuoteReply({ id: params.id, amount: body.amount, note: body.note }, STAFF) })],

        // Reviews
        ['GET', '/api/reviews', async ({ query }) => {
            const names = titles();
            const q = (query.get('q') || '').toLowerCase();
            const items = (await moderation.listReviewsForStaff({ status: query.get('status') || undefined }))
                .map(review => ({ ...review, productTitle: names.get(review.productId) || review.productId }))
                .filter(review => !q || [review.productTitle, review.comment, review.title, review.displayName].join(' ').toLowerCase().includes(q));
            return { items };
        }],
        ['POST', '/api/reviews/:id/status', async ({ params, body }) => ({ item: await moderation.setReviewStatus(params.id, body.status, STAFF) })],

        // Customers
        ['GET', '/api/customers', async ({ query }) => ({ users: await users.searchUsers(query.get('q') || '') })],
        ['GET', '/api/customers/:uid', async ({ params }) => users.userDetail(params.uid)],
        ['POST', '/api/customers/:uid/temp-password', async ({ params }) => users.setTemporaryPassword(params.uid, STAFF)],

        // Staff phones
        ['GET', '/api/devices', async () => ({ devices: await devices.listDevices(), code: await devices.latestCodeStatus() })],
        ['POST', '/api/devices/code', async () => devices.generateCode(STAFF)],
        ['POST', '/api/devices/:id/revoke', async ({ params }) => ({ device: await devices.revokeDevice(params.id, STAFF) })],

        // Catalog and gallery (local files; published with /api/publish)
        ['GET', '/api/catalog', async () => ({ catalog: catalog.readCatalog(), version: catalog.version('catalog') })],
        ['PUT', '/api/catalog', async ({ body }) => catalog.saveCatalog(body.catalog, { version: body.version })],
        ['POST', '/api/catalog/validate', async ({ body }) => catalog.validate(body.catalog)],
        ['GET', '/api/gallery', async () => ({ gallery: catalog.readGallery(), version: catalog.version('gallery') })],
        ['PUT', '/api/gallery', async ({ body }) => catalog.saveGallery(body.gallery, { version: body.version })],
        ['POST', '/api/upload', async ({ body }) => catalog.upload(body)],

        // Publish
        ['GET', '/api/publish', async () => publisher.preview()],
        ['POST', '/api/publish', async ({ body }) => publisher.publish(body)],
        ['POST', '/api/publish/rollback', async ({ body }) => publisher.rollback(body)],
        ['GET', '/api/publish/deployment', async () => publisher.deploymentStatus()],
    ].map(([method, pattern, handler]) => {
        const names = [];
        const regex = new RegExp(
            `^${pattern.replace(/:(\w+)(\(([^)]+)\))?/g, (match, name, group, alternatives) => {
                names.push(name);
                return alternatives ? `(${alternatives})` : '([^/]+)';
            })}$`
        );
        return { method, regex, names, handler };
    });

    async function handle(req, res, url) {
        const send = (status, payload) => {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(payload));
        };
        let route = null;
        let match = null;
        for (const candidate of routes) {
            if (candidate.method !== req.method) continue;
            match = url.pathname.match(candidate.regex);
            if (match) {
                route = candidate;
                break;
            }
        }
        if (!route) {
            send(404, { ok: false, error: 'Not found', code: 'not-found' });
            return;
        }
        try {
            const params = Object.fromEntries(route.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
            const body = req.method === 'GET' ? {} : await readBody(req);
            send(200, { ok: true, ...(await route.handler({ params, query: url.searchParams, body })) });
        } catch (err) {
            const status = err.status || err.statusCode || 500;
            if (status >= 500 && !(err instanceof HttpError)) console.error(`[admin] ${req.method} ${url.pathname}`, err);
            send(status, { ok: false, error: err.message || 'Server error', code: err.code || 'server/error', ...(err.details ? { details: err.details } : {}) });
        }
    }

    return { handle };
}
