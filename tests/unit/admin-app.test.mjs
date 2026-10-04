// The local admin app (tools/admin/server.mjs) against a throwaway repository: reachable
// only from its own page, writes need the session token, saves are version-checked and
// validated, uploads aren't staged, Publish commits only the catalog files to main, and
// Rollback reverts the last publish. Firebase isn't needed for these routes.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { makeRepo } from './admin-repo.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const PORT = 5391;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
let repo;
let child;
let token;

function request({ method = 'GET', path: urlPath = '/', headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        const req = http.request(
            { host: '127.0.0.1', port: PORT, method, path: urlPath, headers: { host: `127.0.0.1:${PORT}`, ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}), ...headers } },
            res => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    let json = null;
                    try {
                        json = JSON.parse(data);
                    } catch {
                        // html
                    }
                    resolve({ status: res.statusCode, headers: res.headers, text: data, json });
                });
            }
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}
const own = () => ({ 'x-admin-token': token, origin: `http://127.0.0.1:${PORT}` });
const write = (method, urlPath, body) => request({ method, path: urlPath, body, headers: own() });

before(async () => {
    repo = makeRepo();
    // A real catalog shape: one category, one product with two options.
    repo.write(
        'public/assets/data/products.json',
        `${JSON.stringify({ categories: [{ name: 'Paints', slug: 'paints', products: [{ id: 'p_aaaaaaaa', title: 'Paint', price: 0, stock: 'in', images: [], variants: [{ label: '1L', price: 10, stock: 'in' }, { label: '5L', price: 40, stock: 'in' }], translations: { fr: { title: 'Peinture' }, ar: { title: 'طلاء' } } }] }] }, null, 2)}\n`
    );
    repo.git('add', '-A');
    repo.git('commit', '-qm', 'catalog');
    repo.git('push', '-q', 'origin', 'main');
    child = spawn('node', ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/admin/server.mjs', '--emulator'], {
        cwd: ROOT,
        env: { ...process.env, ADMIN_PORT: String(PORT), ADMIN_REPO_ROOT: repo.work, HOST: '0.0.0.0' },
        stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 80; attempt += 1) {
        try {
            const page = await request();
            token = page.text.match(/<meta name="admin-token" content="([0-9a-f]+)"/)?.[1];
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
});

test('listens on 127.0.0.1 only, whatever HOST says', async () => {
    const lsof = spawn('lsof', ['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN']);
    let out = '';
    lsof.stdout.on('data', chunk => (out += chunk));
    await new Promise(resolve => lsof.on('close', resolve));
    assert.match(out, new RegExp(`127\\.0\\.0\\.1:${PORT}`));
    assert.doesNotMatch(out, new RegExp(`\\*:${PORT}`));
});

test('other websites, foreign hosts and token-less writes are refused', async () => {
    assert.equal((await request({ path: '/api/catalog', headers: { origin: 'https://evil.example' } })).status, 403);
    assert.equal((await request({ path: '/api/catalog', headers: { host: `evil.example:${PORT}` } })).status, 403);
    assert.equal((await request({ path: '/api/catalog', headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
    const noToken = await request({ method: 'PUT', path: '/api/catalog', body: {}, headers: { origin: `http://127.0.0.1:${PORT}` } });
    assert.equal(noToken.status, 403);
    assert.match(noToken.json.error, /token/i);
    const okRead = await request({ path: '/api/catalog' });
    assert.equal(okRead.status, 200);
    assert.equal(okRead.headers['access-control-allow-origin'], undefined);
});

test('catalog saves are validated, version-checked and keep product ids', async () => {
    const { json } = await request({ path: '/api/catalog' });
    const catalog = json.catalog;
    catalog.categories.push({ name: 'Paints again', slug: 'paints', products: [] });
    const duplicate = await write('PUT', '/api/catalog', { catalog, version: json.version });
    assert.equal(duplicate.status, 400);
    assert.match(duplicate.json.error, /slug "paints"/);
    catalog.categories.pop();

    catalog.categories[0].products[0].variants[0].price = 12.5;
    catalog.categories[0].products.push({ title: 'New brush', price: 3, stock: 'in', images: [], variants: [] });
    const saved = await write('PUT', '/api/catalog', { catalog, version: json.version });
    assert.equal(saved.status, 200, saved.text);
    const onDisk = JSON.parse(fs.readFileSync(path.join(repo.work, 'public/assets/data/products.json'), 'utf-8'));
    assert.equal(onDisk.categories[0].products[0].id, 'p_aaaaaaaa');
    assert.match(onDisk.categories[0].products[1].id, /^p_[a-z0-9]{8}$/, 'a new product gets a stable id');

    const stale = await write('PUT', '/api/catalog', { catalog, version: json.version });
    assert.equal(stale.status, 409, 'saving over a newer file is refused');
    assert.equal(repo.git('log', '--oneline').trim().split('\n').length, 2, 'saving never commits');
});

test('uploads become WebP files that are not staged', async () => {
    const uploaded = await write('POST', '/api/upload', { dataUrl: PNG, filename: 'Boat Photo.png', bucket: 'products' });
    assert.equal(uploaded.status, 200, uploaded.text);
    assert.match(uploaded.json.path, /^assets\/products\/boat-photo-800\.webp$/);
    assert.ok(fs.existsSync(path.join(repo.work, 'public', uploaded.json.path)));
    assert.equal(repo.git('diff', '--cached', '--name-only'), '');
});

test('publish: shows the diff, commits only catalog files to main; rollback reverts it', async () => {
    repo.write('lib/code.js', 'module.exports = "unrelated";\n');
    const preview = await request({ path: '/api/publish' });
    assert.equal(preview.status, 200);
    assert.deepEqual(preview.json.blockers, []);
    assert.deepEqual(preview.json.diff.catalog.products.changed.map(item => [item.id, item.fields.join()]), [['p_aaaaaaaa', 'variants']]);
    assert.equal(preview.json.diff.catalog.products.added.length, 1);
    assert.ok(preview.json.files.every(file => file.path.startsWith('public/assets/')));

    const published = await write('POST', '/api/publish', { files: preview.json.files.map(file => file.path) });
    assert.equal(published.status, 200, published.text);
    assert.equal(repo.remoteCommits(), 3);
    assert.match(repo.remoteHead(), /^Publish catalog via admin/);
    assert.match(repo.status(), / M lib\/code\.js/, 'unrelated work stays uncommitted');

    const next = await request({ path: '/api/publish' });
    assert.equal(next.json.files.length, 0);
    assert.match(next.json.lastPublish.subject, /^Publish catalog via admin/);
    const wrong = await write('POST', '/api/publish/rollback', { commit: 'deadbeef' });
    assert.equal(wrong.status, 409);
    const rolled = await write('POST', '/api/publish/rollback', { commit: next.json.lastPublish.sha });
    assert.equal(rolled.status, 200, rolled.text);
    assert.equal(repo.remoteCommits(), 4);
    assert.match(repo.remoteHead(), /^Revert "Publish catalog via admin/);
    const reverted = JSON.parse(fs.readFileSync(path.join(repo.work, 'public/assets/data/products.json'), 'utf-8'));
    assert.equal(reverted.categories[0].products[0].variants[0].price, 10);
});
