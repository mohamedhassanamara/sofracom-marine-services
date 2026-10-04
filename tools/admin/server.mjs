#!/usr/bin/env node
// SOFRACOM local admin: one app for orders, quotes, catalog, gallery, reviews, customers,
// staff phones and publishing. Runs only on this computer (127.0.0.1) and is never deployed.
//
//   npm run admin                 # asks: emulator or production
//   npm run admin -- --emulator   # the Firebase emulators (demo-sofracom)
//   npm run admin -- --production # real data (red banner in the app)
//
// Same protections as Phase 0 (tools/shared/guard.js): own Host/Origin only, a per-session
// token on every write. Catalog/gallery edits are saved to the files; Publish commits only
// those files and pushes to main.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
// The code always comes from this checkout; ADMIN_REPO_ROOT points the catalog files and git
// at another checkout (tests use a throwaway repository).
const codeRoot = path.resolve(here, '..', '..');
const repoRoot = process.env.ADMIN_REPO_ROOT ? path.resolve(process.env.ADMIN_REPO_ROOT) : codeRoot;
const PORT = Number(process.env.ADMIN_PORT || 5180);
const EMULATOR_ENV = {
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    GCLOUD_PROJECT: 'demo-sofracom',
};

function loadEnvFile() {
    const envPath = path.join(codeRoot, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const key = trimmed.slice(0, trimmed.indexOf('=')).trim();
        const value = trimmed.slice(trimmed.indexOf('=') + 1).trim();
        if (key && !process.env[key]) process.env[key] = value;
    }
}

async function chooseTarget() {
    if (process.argv.includes('--emulator')) return 'emulator';
    if (process.argv.includes('--production')) return 'production';
    if (process.env.FIRESTORE_EMULATOR_HOST) return 'emulator';
    if (!process.stdin.isTTY) {
        console.error('Choose a target: npm run admin -- --emulator   or   npm run admin -- --production');
        process.exit(1);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Firebase target? [e]mulator / [p]roduction: ')).trim().toLowerCase();
    rl.close();
    if (answer.startsWith('p')) return 'production';
    if (answer.startsWith('e')) return 'emulator';
    console.error('Nothing chosen; exiting.');
    process.exit(1);
}

loadEnvFile();
const targetMode = await chooseTarget();
if (targetMode === 'emulator') Object.assign(process.env, EMULATOR_ENV);
process.env.ADMIN_REPO_ROOT = repoRoot;

const { HOST, createGuard } = require('../shared/guard.js');
const guard = createGuard({ port: PORT });
const { createApi } = await import('./api/index.mjs');
const api = await createApi({ repoRoot, codeRoot, targetMode });

const send = (res, status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
};

// The site's own public files (product photos, favicon) for previews.
function servePublic(req, res, pathname) {
    const publicRoot = path.join(repoRoot, 'public');
    const relative = decodeURIComponent(pathname.replace(/^\/site\//, '/'));
    const file = path.resolve(publicRoot, `.${relative}`);
    if (!file.startsWith(publicRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end('Not found');
        return;
    }
    const types = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
}

let vite = null;
const server = http.createServer(async (req, res) => {
    const denied = guard.check(req);
    if (denied) {
        send(res, denied.status, { ok: false, error: denied.error });
        return;
    }
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
        await api.handle(req, res, url);
        return;
    }
    if (url.pathname.startsWith('/site/')) {
        servePublic(req, res, url.pathname);
        return;
    }
    vite.middlewares(req, res, async () => {
        // Every other path is the SPA (hash routes), with the session token in the page.
        try {
            const template = fs.readFileSync(path.join(here, 'index.html'), 'utf-8');
            const html = await vite.transformIndexHtml(url.pathname, template);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(guard.injectToken(html));
        } catch (err) {
            vite.ssrFixStacktrace?.(err);
            res.writeHead(500).end(err.message);
        }
    });
});

// Vite's hot-reload websocket shares this server (one port, nothing else listening).
const { createServer: createVite } = await import('vite');
vite = await createVite({
    configFile: path.join(here, 'vite.config.mjs'),
    server: { middlewareMode: true, ws: { server } },
    appType: 'custom',
    logLevel: 'warn',
});

server.listen(PORT, HOST, () => {
    const banner = targetMode === 'production' ? '\x1b[41m\x1b[97m PRODUCTION \x1b[0m real customer data' : '\x1b[42m\x1b[30m EMULATOR \x1b[0m local test data (demo-sofracom)';
    console.log(`\nSOFRACOM admin → http://${HOST}:${PORT}   ${banner}`);
    console.log(`Session token (already in the page): ${guard.token}\n`);
});
