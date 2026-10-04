// The local admin servers (tools/product-admin, tools/gallery-admin) accept requests only
// from their own pages: right Host, same origin, and the session token on every write.
// Both run against a throwaway repository, so nothing here touches this checkout or Firebase.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { makeRepo } from './admin-repo.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// http.request rather than fetch, so tests can send any Host / Origin header.
function request(port, { method = 'GET', path: urlPath = '/', headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        const req = http.request(
            {
                host: '127.0.0.1',
                port,
                method,
                path: urlPath,
                headers: {
                    host: `127.0.0.1:${port}`,
                    ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
                    ...headers,
                },
            },
            res => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    let json = null;
                    try {
                        json = JSON.parse(data);
                    } catch {
                        // HTML or text
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

async function startTool(script, port, repoRoot) {
    const child = spawn('node', ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', script], {
        cwd: ROOT,
        env: { ...process.env, PORT: String(port), ADMIN_REPO_ROOT: repoRoot, HOST: '0.0.0.0' },
        stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
            const page = await request(port);
            const token = page.text.match(/<meta name="admin-token" content="([0-9a-f]+)"/)?.[1];
            if (token) return { child, token };
        } catch {
            // starting
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    child.kill();
    throw new Error(`${script} did not start`);
}

const TOOLS = [
    { name: 'product admin', script: 'tools/product-admin/server.js', port: 5391, save: '/api/products', data: { categories: [] }, bucket: 'products' },
    { name: 'gallery admin', script: 'tools/gallery-admin/server.js', port: 5392, save: '/api/gallery', data: { entries: [] }, bucket: 'gallery' },
];

for (const tool of TOOLS) {
    describe(tool.name, () => {
        let repo;
        let server;
        const own = () => ({ 'x-admin-token': server.token, origin: `http://127.0.0.1:${tool.port}` });

        before(async () => {
            repo = makeRepo();
            server = await startTool(tool.script, tool.port, repo.work);
        });
        after(() => {
            server?.child.kill();
            repo?.cleanup();
        });

        test('listens on 127.0.0.1 only, whatever HOST says', async () => {
            const lsof = spawn('lsof', ['-nP', `-iTCP:${tool.port}`, '-sTCP:LISTEN']);
            let out = '';
            lsof.stdout.on('data', chunk => (out += chunk));
            await new Promise(resolve => lsof.on('close', resolve));
            assert.match(out, new RegExp(`127\\.0\\.0\\.1:${tool.port}`));
            assert.doesNotMatch(out, new RegExp(`\\*:${tool.port}`));
        });

        test('sends no CORS headers and has no preflight', async () => {
            const page = await request(tool.port, { path: tool.save });
            assert.equal(page.status, 200);
            assert.equal(page.headers['access-control-allow-origin'], undefined);
            const preflight = await request(tool.port, { method: 'OPTIONS', path: tool.save, headers: { origin: 'https://evil.example' } });
            assert.equal(preflight.status, 403);
            assert.equal(preflight.headers['access-control-allow-origin'], undefined);
        });

        test('rejects another website (Origin or Sec-Fetch-Site), even with the token', async () => {
            const foreign = await request(tool.port, { method: 'POST', path: tool.save, body: tool.data, headers: { ...own(), origin: 'https://evil.example' } });
            assert.equal(foreign.status, 403);
            assert.match(foreign.json.error, /origin/i);
            const read = await request(tool.port, { path: tool.save, headers: { origin: 'https://evil.example' } });
            assert.equal(read.status, 403);
            const crossSite = await request(tool.port, { method: 'POST', path: tool.save, body: tool.data, headers: { 'x-admin-token': server.token, 'sec-fetch-site': 'cross-site' } });
            assert.equal(crossSite.status, 403);
        });

        test('rejects a foreign Host (DNS rebinding)', async () => {
            const rebound = await request(tool.port, { path: tool.save, headers: { host: `evil.example:${tool.port}` } });
            assert.equal(rebound.status, 403);
            assert.match(rebound.json.error, /host/i);
        });

        test('rejects writes without the session token, or with a wrong one', async () => {
            const missing = await request(tool.port, { method: 'POST', path: tool.save, body: tool.data, headers: { origin: `http://127.0.0.1:${tool.port}` } });
            assert.equal(missing.status, 403);
            assert.match(missing.json.error, /token/i);
            const wrong = await request(tool.port, { method: 'POST', path: tool.save, body: tool.data, headers: { ...own(), 'x-admin-token': 'f'.repeat(48) } });
            assert.equal(wrong.status, 403);
            const publish = await request(tool.port, { method: 'POST', path: '/api/publish', body: { files: [] } });
            assert.equal(publish.status, 403);
        });

        test('Save writes the file locally and commits nothing', async () => {
            const saved = await request(tool.port, { method: 'POST', path: tool.save, body: tool.data, headers: own() });
            assert.equal(saved.status, 200, saved.text);
            assert.equal(repo.remoteCommits(), 1);
            assert.equal(repo.git('log', '--oneline').trim().split('\n').length, 1);
        });

        test('an upload is written but not staged', async () => {
            const uploaded = await request(tool.port, { method: 'POST', path: '/api/upload', body: { dataUrl: PNG, filename: 'Boat Photo.png', bucket: tool.bucket }, headers: own() });
            assert.equal(uploaded.status, 200, uploaded.text);
            assert.ok(fs.existsSync(path.join(repo.work, 'public', uploaded.json.path)));
            assert.equal(repo.git('diff', '--cached', '--name-only'), '');
            assert.match(repo.status(), new RegExp(`\\?\\? public/${uploaded.json.path}`));
        });

        test('Publish commits only its own files, after confirming that exact list', async () => {
            repo.write('lib/code.js', 'module.exports = "unrelated";\n');
            const before = await request(tool.port, { path: '/api/publish/preview' });
            assert.equal(before.status, 200);
            assert.deepEqual(before.json.blockers, []);
            assert.ok(before.json.files.length >= 1);
            assert.ok(before.json.files.every(file => file.path.startsWith('public/assets/')));

            const published = await request(tool.port, { method: 'POST', path: '/api/publish', body: { files: before.json.files.map(file => file.path) }, headers: own() });
            assert.equal(published.status, 200, published.text);
            assert.equal(repo.remoteCommits(), 2);
            const committed = repo.remoteHead().trim().split('\n').slice(1).filter(Boolean);
            assert.deepEqual(committed, before.json.files.map(file => file.path));
            assert.match(repo.status(), / M lib\/code\.js/);
        });
    });
}
