// Publish = commit only the catalog/gallery files and their assets, push to main.
// Rollback = revert the last publish commit (same scope) and push.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { diffCatalog, diffGallery } from './diff.mjs';

const require = createRequire(import.meta.url);
const shared = require('../../shared/publish.js');

export const PUBLISH_SCOPE = [
    'public/assets/data/products.json',
    'public/assets/data/gallery.json',
    'public/assets/products',
    'public/assets/categories',
    'public/assets/datasheets',
    'public/assets/gallery',
];
export const PUBLISH_PREFIX = 'Publish catalog via admin';
const PUBLISH_SUBJECT = /^(Publish catalog via admin|Update (products|gallery) via admin tool)/;

const fail = (status, message, code) => Object.assign(new Error(message), { status, code });

export function createPublisher({ repoRoot }) {
    const git = (...args) => {
        const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf-8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
        return { ok: result.status === 0, out: (result.stdout || '').trim(), err: (result.stderr || '').trim() };
    };
    const credentials = () => ({
        token: process.env.PRODUCT_ADMIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
        username: process.env.PRODUCT_ADMIN_GITHUB_USERNAME || process.env.GITHUB_USERNAME || 'x-access-token',
    });
    const committed = file => {
        const shown = git('show', `HEAD:${file}`);
        try {
            return shown.ok ? JSON.parse(shown.out) : null;
        } catch {
            return null;
        }
    };
    const onDisk = file => {
        try {
            return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf-8'));
        } catch {
            return null;
        }
    };

    function lastPublish() {
        const log = git('log', '-n', '30', '--format=%H%x09%h%x09%cI%x09%s', 'HEAD', '--', ...PUBLISH_SCOPE);
        if (!log.ok || !log.out) return null;
        for (const line of log.out.split('\n')) {
            const [sha, short, date, subject] = line.split('\t');
            if (!PUBLISH_SUBJECT.test(subject)) continue;
            const files = git('show', '--name-only', '--format=', sha).out.split('\n').filter(Boolean);
            const inScope = files.every(file => PUBLISH_SCOPE.some(entry => file === entry || file.startsWith(`${entry}/`)));
            return { sha, short, date, subject, files, inScope, isHead: git('rev-parse', 'HEAD').out === sha };
        }
        return null;
    }

    function gitSummary() {
        const result = shared.preview({ repoRoot, scope: PUBLISH_SCOPE, credentials: credentials() });
        return { branch: result.branch, changes: result.files.length, blockers: result.blockers.filter(text => !/^Nothing to publish/.test(text)) };
    }

    function preview() {
        const result = shared.preview({ repoRoot, scope: PUBLISH_SCOPE, credentials: credentials() });
        return {
            ...result,
            diff: {
                catalog: diffCatalog(committed('public/assets/data/products.json'), onDisk('public/assets/data/products.json')),
                gallery: diffGallery(committed('public/assets/data/gallery.json'), onDisk('public/assets/data/gallery.json')),
            },
            lastPublish: lastPublish(),
            deploymentConfigured: Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID),
        };
    }

    function publish({ files }) {
        return shared.publish({
            repoRoot,
            scope: PUBLISH_SCOPE,
            credentials: credentials(),
            confirmed: files,
            message: `${PUBLISH_PREFIX} (${new Date().toISOString()})`,
        });
    }

    // Undo the last publish: a new commit that reverts it (history is kept), pushed to main.
    function rollback({ commit }) {
        const current = shared.preview({ repoRoot, scope: PUBLISH_SCOPE, credentials: credentials() });
        const blockers = current.blockers.filter(text => !/^Nothing to publish/.test(text));
        if (blockers.length) throw fail(409, blockers.join(' '), 'publish/blocked');
        if (current.files.length) throw fail(409, 'There are unpublished catalog changes. Publish or discard them before rolling back.', 'publish/dirty');
        const last = lastPublish();
        if (!last) throw fail(404, 'No publish to roll back.', 'publish/none');
        if (!last.inScope) throw fail(409, `The last publish (${last.short}) also changed other files; roll it back with git instead.`, 'publish/scope');
        if (commit !== last.sha && commit !== last.short) throw fail(409, 'The last publish changed since you looked. Reload and try again.', 'publish/stale');
        const reverted = git('revert', '--no-edit', last.sha);
        if (!reverted.ok) {
            git('revert', '--abort');
            throw fail(409, `Could not undo ${last.short} automatically (later changes touch the same lines). ${reverted.err}`, 'publish/conflict');
        }
        const remote = shared.resolveRemote(repoRoot, credentials());
        const pushed = git('push', remote.url, 'HEAD:refs/heads/main');
        const sha = git('rev-parse', '--short', 'HEAD').out;
        if (!pushed.ok) {
            const detail = remote.secret ? pushed.err.split(remote.secret).join('***') : pushed.err;
            throw fail(502, `Reverted locally as ${sha}, but the push failed. ${detail}`, 'publish/push');
        }
        return { reverted: last.short, commit: sha, message: `Rolled back ${last.short}; the site redeploys from ${sha}.` };
    }

    // The latest production deployment on Vercel (needs VERCEL_TOKEN and VERCEL_PROJECT_ID).
    async function deploymentStatus() {
        const token = process.env.VERCEL_TOKEN;
        const projectId = process.env.VERCEL_PROJECT_ID;
        if (!token || !projectId) return { configured: false };
        const params = new URLSearchParams({ projectId, target: 'production', limit: '1' });
        if (process.env.VERCEL_TEAM_ID) params.set('teamId', process.env.VERCEL_TEAM_ID);
        const response = await fetch(`https://api.vercel.com/v6/deployments?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw fail(502, `Vercel answered ${response.status}`, 'vercel/error');
        const data = await response.json();
        const deployment = data.deployments?.[0];
        if (!deployment) return { configured: true, deployment: null };
        return {
            configured: true,
            deployment: {
                state: deployment.state || deployment.readyState,
                url: deployment.url ? `https://${deployment.url}` : null,
                createdAt: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : null,
                commit: deployment.meta?.githubCommitSha?.slice(0, 7) || null,
                message: deployment.meta?.githubCommitMessage || null,
            },
        };
    }

    return { gitSummary, preview, publish, rollback, deploymentStatus, lastPublish };
}
