// Cutouts: generated files wait in the git-ignored cache; approving copies them into
// public/assets (the only files that get published); the site shows approved ones only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cutoutResolver } from '../../lib/cutouts.js';
import { catalogImages, photoStates, readManifest, setStatus } from '../../tools/shared/cutouts.mjs';

test('approved cutouts replace the original; anything else keeps it', () => {
    const show = cutoutResolver({
        images: {
            '/assets/products/a-800.webp': { status: 'approved', cutout: '/assets/products/cutouts/a-cut-800.webp' },
            '/assets/products/c-800.webp': { status: 'original' },
        },
    });
    assert.equal(show('/assets/products/a-800.webp'), '/assets/products/cutouts/a-cut-800.webp');
    assert.equal(show('assets/products/a-800.webp'), '/assets/products/cutouts/a-cut-800.webp');
    assert.equal(show('/assets/products/c-800.webp'), '/assets/products/c-800.webp');
    assert.equal(show('/assets/products/new-800.webp'), '/assets/products/new-800.webp');
    assert.equal(cutoutResolver(null)('/x-800.webp'), '/x-800.webp');
});

function fixture() {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cutouts-'));
    const put = (file, content) => {
        fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
        fs.writeFileSync(path.join(repo, file), content);
    };
    put('public/assets/data/products.json', JSON.stringify({ categories: [{ slug: 'x', products: [{ id: 'p_1', title: 'A', needsPhoto: true, images: ['assets/products/a-800.webp', 'assets/products/b-800.webp'] }, { id: 'p_2', title: 'B', image: 'assets/products/b-800.webp' }, { id: 'p_3', title: 'C', image: 'assets/products/c-800.webp' }] }] }));
    put('.cutouts-cache/manifest.json', JSON.stringify({ images: { '/assets/products/a-800.webp': { file: 'a-cut', model: 'medium' }, '/assets/products/b-800.webp': { file: 'b-cut', model: 'small' } } }));
    for (const stem of ['a-cut', 'b-cut']) for (const width of [400, 800, 1600]) put(`.cutouts-cache/files/${stem}-${width}.webp`, stem);
    return { repo, exists: file => fs.existsSync(path.join(repo, file)) };
}

test('approve copies the three sizes into public; keep original and back-to-review remove them', () => {
    const { repo, exists } = fixture();
    const status = () => Object.fromEntries(photoStates(repo).map(image => [image.src, image.status]));
    assert.deepEqual(status(), { '/assets/products/a-800.webp': 'pending', '/assets/products/b-800.webp': 'pending', '/assets/products/c-800.webp': 'missing' });
    assert.ok(!exists('public/assets/products/cutouts'));

    setStatus(repo, ['/assets/products/a-800.webp', 'assets/products/b-800.webp'], 'approved');
    assert.ok(['400', '800', '1600'].every(width => exists(`public/assets/products/cutouts/a-cut-${width}.webp`)));
    assert.deepEqual(readManifest(repo).images['/assets/products/a-800.webp'], { ...readManifest(repo).images['/assets/products/a-800.webp'], status: 'approved', cutout: '/assets/products/cutouts/a-cut-800.webp', model: 'medium' });
    assert.equal(photoStates(repo)[0].preview, '/assets/products/cutouts/a-cut-800.webp');

    setStatus(repo, '/assets/products/b-800.webp', 'original');
    assert.ok(!exists('public/assets/products/cutouts/b-cut-800.webp'));
    assert.equal(readManifest(repo).images['/assets/products/b-800.webp'].status, 'original');
    assert.ok(exists('.cutouts-cache/files/b-cut-800.webp'), 'the cached cutout is kept');

    setStatus(repo, '/assets/products/a-800.webp', 'pending');
    assert.ok(!exists('public/assets/products/cutouts/a-cut-1600.webp'));
    assert.equal(readManifest(repo).images['/assets/products/a-800.webp'], undefined);
    assert.equal(photoStates(repo)[0].preview, '/cutouts-cache/a-cut-800.webp');

    assert.throws(() => setStatus(repo, ['/assets/products/c-800.webp'], 'approved'), /No cutout yet/);
    assert.throws(() => setStatus(repo, ['/assets/products/a-800.webp'], 'deleted'), /Unknown status/);
    // A decision made elsewhere without the cached files can't be approved here.
    fs.rmSync(path.join(repo, '.cutouts-cache/files/b-cut-800.webp'));
    assert.throws(() => setStatus(repo, ['/assets/products/b-800.webp'], 'approved'), /not on this computer/);
});

test('each catalog photo once, with its product and the needs-a-photo flag', () => {
    const { repo } = fixture();
    assert.deepEqual(catalogImages(repo).map(image => [image.src, image.productId, image.needsPhoto]), [
        ['/assets/products/a-800.webp', 'p_1', true],
        ['/assets/products/b-800.webp', 'p_1', true],
        ['/assets/products/c-800.webp', 'p_3', false],
    ]);
});
