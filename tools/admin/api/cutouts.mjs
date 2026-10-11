// Photo cutouts for the admin: list originals with their cutout and status, approve / keep the
// original (in bulk), retry with the other model, generate missing ones in small batches, and a
// background queue for new uploads (each photo gets its cutout right after upload, checked and
// approved automatically when it passes, see tools/shared/cutoutQuality.mjs).
// Generated files wait in the git-ignored .cutouts-cache/; approving copies them into
// public/assets, which is published with the catalog (see api/publish.mjs).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const withSlash = value => `/${String(value || '').replace(/^\//, '')}`;

export async function createCutouts({ repoRoot, codeRoot = repoRoot }) {
    const shared = await import(pathToFileURL(path.join(codeRoot, 'tools', 'shared', 'cutouts.mjs')).href);
    let busy = false; // one background-removal job at a time (it uses every CPU core)
    const queue = []; // srcs waiting
    const jobs = new Map(); // src → { state: queued|running|done|failed|unavailable, status?, reasons?, error? }

    const exclusive = async work => {
        if (busy) throw Object.assign(new Error('Another cutout job is still running. Wait for it to finish.'), { status: 409, code: 'cutouts/busy' });
        busy = true;
        try {
            return await work();
        } finally {
            busy = false;
            drain();
        }
    };

    async function available() {
        try {
            await shared.loadRemover();
            return { available: true };
        } catch (error) {
            return { available: false, reason: error.message };
        }
    }

    // Makes the cutout, then approves it when the check passes and auto-approve is on.
    async function makeAndDecide(src, options) {
        const item = await shared.makeCutout(repoRoot, src, options);
        const auto = shared.readSettings(repoRoot).autoApprove && item.check?.ok;
        if (auto) shared.setStatus(repoRoot, [item.src], 'approved', { auto: true });
        return { ...item, status: auto ? 'approved' : 'pending', reasons: item.check?.ok ? [] : item.check?.reasons || [] };
    }

    // Background queue: new uploads, one at a time, without blocking the request.
    async function drain() {
        if (busy || !queue.length) return;
        busy = true;
        try {
            while (queue.length) {
                const src = queue.shift();
                jobs.set(src, { state: 'running' });
                try {
                    const item = await makeAndDecide(src);
                    jobs.set(src, { state: 'done', status: item.status, reasons: item.reasons });
                } catch (error) {
                    if (error.code === 'cutouts/unavailable') {
                        // Not set up: the photo waits for "Generate missing" once it is.
                        [src, ...queue.splice(0)].forEach(waiting => jobs.set(waiting, { state: 'unavailable', error: error.message }));
                    } else jobs.set(src, { state: 'failed', error: error.message });
                }
            }
        } finally {
            busy = false;
        }
    }

    function enqueue(sources) {
        for (const src of sources.map(withSlash)) {
            if (queue.includes(src) || jobs.get(src)?.state === 'running') continue;
            queue.push(src);
            jobs.set(src, { state: 'queued' });
        }
        setImmediate(drain);
        return Object.fromEntries(sources.map(withSlash).map(src => [src, jobs.get(src)]));
    }

    // The editor's view of some photos: the running/queued job if any, else the saved status.
    function states({ sources = [] } = {}) {
        const list = (Array.isArray(sources) ? sources : [sources]).filter(Boolean).map(withSlash);
        const saved = shared.statesOf(repoRoot, list);
        return { states: Object.fromEntries(list.map(src => [src, { ...saved[src], job: jobs.get(src) || null }])) };
    }

    async function list() {
        const images = shared.photoStates(repoRoot);
        const counts = images.reduce((total, image) => ({ ...total, [image.status]: (total[image.status] || 0) + 1 }), {});
        return { images, counts, busy, queued: queue.length, settings: shared.readSettings(repoRoot), ...(await available()) };
    }

    const setStatus = ({ sources, status }) => ({ items: shared.setStatus(repoRoot, sources, status) });

    // Regenerates with the other model (or the one asked for); the check decides again.
    const retry = ({ src, model }) =>
        exclusive(async () => {
            const current = shared.readCache(repoRoot).images[withSlash(src)];
            const next = model || (current?.model === 'medium' ? 'small' : 'medium');
            return { item: await makeAndDecide(src, { model: next }) };
        });

    // The backlog: the next `limit` photos without a cutout (the page calls it again until
    // none are left). Passing cutouts are approved automatically, like new uploads.
    const generate = ({ limit = 5 } = {}) =>
        exclusive(async () => {
            const batch = shared.missing(repoRoot).slice(0, Math.max(1, Math.min(25, Number(limit) || 5)));
            const done = [];
            const failed = [];
            for (const image of batch) {
                try {
                    done.push(await makeAndDecide(image.src));
                } catch (error) {
                    failed.push({ src: image.src, error: error.message });
                    if (error.code === 'cutouts/unavailable') throw error;
                }
            }
            return { done, failed, remaining: shared.missing(repoRoot).length };
        });

    const settings = () => ({ settings: shared.readSettings(repoRoot), ...{} });
    const saveSettings = changes => ({ settings: shared.writeSettings(repoRoot, changes || {}) });
    const counts = () => {
        const images = shared.photoStates(repoRoot);
        return { needsReview: images.filter(image => image.status === 'pending').length, missing: images.filter(image => image.status === 'missing').length };
    };

    return { list, setStatus, retry, generate, enqueue, states, settings, saveSettings, counts, available, prune: () => shared.pruneUnreferenced(repoRoot) };
}
