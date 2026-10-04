// Shared setup for API tests: starts `next dev` against the Firebase emulators
// (run via `npm run test:api`, which wraps everything in `firebase emulators:exec`).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const PORT = Number(process.env.TEST_PORT || 3199);
export const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-sofracom';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const IDENTITY = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('API tests must run against the emulators: use `npm run test:api`.');
}

export const admin = require('../../lib/firebase/admin.js');

let server = null;

export async function startServer() {
    if (server) return;
    server = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
        cwd: new URL('../..', import.meta.url).pathname,
        env: {
            ...process.env,
            GCLOUD_PROJECT: PROJECT,
            NEXT_DIST_DIR: '.next-test',
            NEXT_TELEMETRY_DISABLED: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
    });
    let output = '';
    server.stdout.on('data', chunk => (output += chunk));
    server.stderr.on('data', chunk => (output += chunk));
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${BASE}/api/product-stats`);
            if (response.ok) return;
        } catch {
            // not up yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`next dev did not start:\n${output.slice(-2000)}`);
}

export function stopServer() {
    if (!server) return;
    try {
        process.kill(-server.pid, 'SIGTERM');
    } catch {
        server.kill('SIGTERM');
    }
    server = null;
}

export async function resetEmulators() {
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
        method: 'DELETE',
    });
    await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

let counter = 0;

// Creates an emulator user and returns { uid, email, token, refresh() }.
export async function createUser({ name = 'Test Buyer', verified = false, isAdmin = false } = {}) {
    counter += 1;
    const email = `user${Date.now()}${counter}@example.test`;
    const password = 'emulator-pass-123';
    const auth = admin.getAuth();
    const record = await auth.createUser({ email, password, displayName: name, emailVerified: verified });
    if (isAdmin) await auth.setCustomUserClaims(record.uid, { admin: true });
    const signIn = async () => {
        const response = await fetch(`${IDENTITY}/accounts:signInWithPassword?key=demo-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });
        const body = await response.json();
        if (!body.idToken) throw new Error(`sign-in failed: ${JSON.stringify(body)}`);
        return body.idToken;
    };
    const user = { uid: record.uid, email, token: await signIn() };
    user.refresh = async () => {
        user.token = await signIn();
        return user;
    };
    return user;
}

export async function api(path, { method = 'GET', body, user, headers = {} } = {}) {
    const response = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
            // Each test gets its own "IP" so the in-memory rate limits don't interfere.
            'X-Forwarded-For': headers['X-Forwarded-For'] || `10.0.${counter % 250}.${Math.floor(Math.random() * 250)}`,
            ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
}

export const db = () => admin.getDb();

// Two real catalog products with variants, used for orders and reviews.
export const PRODUCT_A = 'p_bamzqzdm';
export const PRODUCT_B = (() => {
    const catalog = require('../../public/assets/data/products.json');
    for (const category of catalog.categories) {
        for (const product of category.products) {
            const firstVariant = product.variants?.[0];
            if (product.id !== PRODUCT_A && product.stock !== 'out' && firstVariant?.stock !== 'out') return product.id;
        }
    }
    return null;
})();

export const GUEST = { name: 'Guest Buyer', phone: '+21612345678', address: 'Marina Monastir, quay 3' };
