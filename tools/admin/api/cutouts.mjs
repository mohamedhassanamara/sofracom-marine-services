// Photo cutouts for the admin's Photos page: list originals with their cutout and status,
// approve / keep the original (in bulk), retry with the other model, generate missing ones
// in small batches. Files and the manifest live in the repository and are published like
// the catalog (see api/publish.mjs).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function createCutouts({ repoRoot, codeRoot = repoRoot }) {
    const shared = await import(pathToFileURL(path.join(codeRoot, 'tools', 'shared', 'cutouts.mjs')).href);
    let busy = false; // one background-removal job at a time (it uses every CPU core)

    const exclusive = async work => {
        if (busy) throw Object.assign(new Error('Another cutout job is still running. Wait for it to finish.'), { status: 409, code: 'cutouts/busy' });
        busy = true;
        try {
            return await work();
        } finally {
            busy = false;
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

    async function list() {
        const manifest = shared.readManifest(repoRoot);
        const images = shared.catalogImages(repoRoot).map(image => ({ ...image, ...(manifest.images[image.src] || { status: 'missing' }) }));
        const counts = images.reduce((total, image) => ({ ...total, [image.status]: (total[image.status] || 0) + 1 }), {});
        return { images, counts, busy, ...(await available()) };
    }

    const setStatus = ({ sources, status }) => ({ items: shared.setStatus(repoRoot, sources, status) });

    // Regenerates with the other model (or the one asked for); the result is pending again.
    const retry = ({ src, model }) =>
        exclusive(async () => {
            const current = shared.readManifest(repoRoot).images[`/${String(src || '').replace(/^\//, '')}`];
            const next = model || (current?.model === 'medium' ? 'small' : 'medium');
            return { item: await shared.makeCutout(repoRoot, src, { model: next }) };
        });

    // The next `limit` photos without a cutout (the page calls it again until none are left).
    const generate = ({ limit = 5 } = {}) =>
        exclusive(async () => {
            const batch = shared.missing(repoRoot).slice(0, Math.max(1, Math.min(25, Number(limit) || 5)));
            const done = [];
            const failed = [];
            for (const image of batch) {
                try {
                    done.push(await shared.makeCutout(repoRoot, image.src));
                } catch (error) {
                    failed.push({ src: image.src, error: error.message });
                    if (error.code === 'cutouts/unavailable') throw error;
                }
            }
            return { done, failed, remaining: shared.missing(repoRoot).length };
        });

    return { list, setStatus, retry, generate };
}
