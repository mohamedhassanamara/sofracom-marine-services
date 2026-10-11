// Upload → background cutout → automatic check, through the real admin server. The 300 MB
// background-removal model is replaced by a tiny stand-in package (BG_REMOVAL_PATH): it makes
// near-white pixels transparent, which is enough to produce good and bad cutouts on purpose.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { makeRepo } from './admin-repo.mjs';
import { PUBLISH_SCOPE } from '../../tools/admin/api/publish.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const PORT = 5392;
let repo;
let child;
let token;
let fake;

function request({ method = 'GET', path: urlPath = '/', body } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        const headers = { host: `127.0.0.1:${PORT}`, 'x-admin-token': token || '', origin: `http://127.0.0.1:${PORT}`, ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}) };
        const req = http.request({ host: '127.0.0.1', port: PORT, method, path: urlPath, headers }, res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ status: res.statusCode, text: data, json: (() => { try { return JSON.parse(data); } catch { return null; } })() }));
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// Photos on a white background, as product photos usually are.
const photo = async body => `data:image/png;base64,${(await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#ffffff"/>${body}</svg>`)).png().toBuffer()).toString('base64')}`;
const PHOTOS = {
    tin: () => photo('<rect x="250" y="220" width="300" height="400" rx="20" fill="#c8102e"/><rect x="250" y="380" width="300" height="140" fill="#f2a900"/>'),
    whiteBottle: () => photo('<rect x="320" y="160" width="160" height="500" rx="40" fill="#f3f3f1"/>'),
    closeUp: () => photo('<rect x="0" y="0" width="800" height="560" fill="#3a5fa6"/>'),
};

async function upload(name, body, extra = {}) {
    const response = await request({ method: 'POST', path: '/api/upload', body: { dataUrl: await body(), filename: `${name}.png`, bucket: 'products', ...extra } });
    assert.equal(response.status, 200, response.text);
    return response.json;
}
async function settle(src) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
        const { json } = await request({ method: 'POST', path: '/api/cutouts/state', body: { sources: [src] } });
        const state = json.states[src];
        if (!['queued', 'running'].includes(state.job?.state)) return state;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`cutout of ${src} never finished`);
}

before(async () => {
    repo = makeRepo();
    // The stand-in remover: same entry point and signature as @imgly/background-removal-node.
    fake = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-bgr-'));
    fs.mkdirSync(path.join(fake, 'dist'));
    fs.writeFileSync(
        path.join(fake, 'dist', 'index.mjs'),
        `import { createRequire } from 'node:module';
const sharp = createRequire(${JSON.stringify(path.join(ROOT, 'package.json'))})('sharp');
export async function removeBackground(blob) {
    const { data, info } = await sharp(Buffer.from(await blob.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) if (Math.min(data[i], data[i + 1], data[i + 2]) > 235) data[i + 3] = 0;
    const png = await sharp(data, { raw: info }).png().toBuffer();
    return new Blob([png], { type: 'image/png' });
}
`
    );
    child = spawn('node', ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/admin/server.mjs', '--emulator'], {
        cwd: ROOT,
        env: { ...process.env, ADMIN_PORT: String(PORT), ADMIN_REPO_ROOT: repo.work, BG_REMOVAL_PATH: fake },
        stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
            token = (await request()).text.match(/<meta name="admin-token" content="([0-9a-f]+)"/)?.[1];
            if (token) return;
        } catch {
            // starting
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('admin did not start');
});
after(() => {
    child?.kill();
    repo?.cleanup();
    if (fake) fs.rmSync(fake, { recursive: true, force: true });
});

test('a good product photo is cut out in the background and approved automatically', async () => {
    const result = await upload('tin', PHOTOS.tin);
    assert.match(result.path, /^assets\/products\/tin-800\.webp$/);
    assert.ok(['queued', 'running'].includes(result.cutout.state), 'the upload answers before the cutout is made');
    const state = await settle(`/${result.path}`);
    assert.equal(state.job.state, 'done');
    assert.equal(state.status, 'approved');
    assert.equal(state.autoApproved, true);
    assert.ok(fs.existsSync(path.join(repo.work, 'public/assets/products/cutouts/tin-cut-800.webp')), 'approved: copied into public');
    const manifest = JSON.parse(fs.readFileSync(path.join(repo.work, 'public/assets/data/cutouts.json'), 'utf-8'));
    assert.equal(manifest.images['/assets/products/tin-800.webp'].auto, true);
});

test('a white bottle that loses itself and a cut-off close-up wait for review, with the reason', async () => {
    const bottle = await settle(`/${(await upload('bottle', PHOTOS.whiteBottle)).path}`);
    assert.equal(bottle.status, 'pending');
    assert.match(bottle.reasons.join(' '), /Almost nothing was kept/);
    const closeUp = await settle(`/${(await upload('close-up', PHOTOS.closeUp)).path}`);
    assert.equal(closeUp.status, 'pending');
    assert.match(closeUp.reasons.join(' '), /3 or more edges/);
    assert.ok(!fs.existsSync(path.join(repo.work, 'public/assets/products/cutouts/bottle-cut-800.webp')), 'not approved: stays in the git-ignored cache');
    assert.ok(fs.existsSync(path.join(repo.work, '.cutouts-cache/files/bottle-cut-800.webp')));
});

test('auto-approve off: even a good cutout waits; "keep original" uploads get no cutout', async () => {
    assert.equal((await request({ method: 'PUT', path: '/api/settings', body: { autoApprove: false } })).json.settings.autoApprove, false);
    const state = await settle(`/${(await upload('tin-two', PHOTOS.tin)).path}`);
    assert.equal(state.status, 'pending');
    assert.deepEqual(state.reasons, [], 'it passed the checks, it just waits');
    const kept = await upload('illustration', PHOTOS.tin, { keepOriginal: true });
    assert.equal(kept.cutout, undefined);
    assert.equal((await request({ method: 'POST', path: '/api/cutouts/state', body: { sources: [`/${kept.path}`] } })).json.states[`/${kept.path}`].job, null);
    await request({ method: 'PUT', path: '/api/settings', body: { autoApprove: true } });
});

test('the publish scope: approved cutouts, their decisions and the review counts; never the cache or category pictures', () => {
    assert.ok(PUBLISH_SCOPE.includes('public/assets/data/cutouts.json'));
    assert.ok(PUBLISH_SCOPE.includes('public/assets/data/popularity.json'));
    assert.ok(PUBLISH_SCOPE.some(entry => 'public/assets/products/cutouts/x-800.webp'.startsWith(`${entry}/`)), 'approved cutout files are published');
    assert.ok(!PUBLISH_SCOPE.some(entry => entry.startsWith('.cutouts-cache')), 'the cache is never published');
    assert.ok(!PUBLISH_SCOPE.includes('public/assets/categories'), 'categories have no pictures of their own');
});
