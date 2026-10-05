// The site shows a cutout only once it is approved; everything else keeps the original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cutoutResolver } from '../../lib/cutouts.js';
import { readManifest, setStatus, catalogImages } from '../../tools/shared/cutouts.mjs';

const manifest = {
    images: {
        '/assets/products/a-800.webp': { cutout: '/assets/products/cutouts/a-cut-800.webp', status: 'approved' },
        '/assets/products/b-800.webp': { cutout: '/assets/products/cutouts/b-cut-800.webp', status: 'pending' },
        '/assets/products/c-800.webp': { cutout: '/assets/products/cutouts/c-cut-800.webp', status: 'original' },
    },
};

test('approved cutouts replace the original; pending and kept originals do not', () => {
    const show = cutoutResolver(manifest);
    assert.equal(show('/assets/products/a-800.webp'), '/assets/products/cutouts/a-cut-800.webp');
    assert.equal(show('assets/products/a-800.webp'), '/assets/products/cutouts/a-cut-800.webp');
    assert.equal(show('/assets/products/b-800.webp'), '/assets/products/b-800.webp');
    assert.equal(show('/assets/products/c-800.webp'), '/assets/products/c-800.webp');
    assert.equal(show('/assets/products/new-800.webp'), '/assets/products/new-800.webp');
    assert.equal(cutoutResolver(null)('/x-800.webp'), '/x-800.webp');
});

test('statuses change in bulk, are reversible and never touch the files', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cutouts-'));
    fs.mkdirSync(path.join(repo, 'public/assets/data'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'public/assets/data/cutouts.json'), JSON.stringify(manifest));
    fs.writeFileSync(
        path.join(repo, 'public/assets/data/products.json'),
        JSON.stringify({ categories: [{ slug: 'x', products: [{ id: 'p_1', title: 'A', images: ['assets/products/a-800.webp', 'assets/products/b-800.webp'] }, { id: 'p_2', title: 'B', image: 'assets/products/b-800.webp' }] }] })
    );
    setStatus(repo, ['/assets/products/b-800.webp', 'assets/products/c-800.webp'], 'approved');
    assert.equal(readManifest(repo).images['/assets/products/b-800.webp'].status, 'approved');
    setStatus(repo, '/assets/products/b-800.webp', 'original');
    assert.equal(readManifest(repo).images['/assets/products/b-800.webp'].status, 'original');
    assert.equal(readManifest(repo).images['/assets/products/b-800.webp'].cutout, '/assets/products/cutouts/b-cut-800.webp');
    assert.throws(() => setStatus(repo, ['/assets/products/zzz-800.webp'], 'approved'), /No cutout yet/);
    assert.throws(() => setStatus(repo, ['/assets/products/a-800.webp'], 'deleted'), /Unknown status/);
    // Each photo once, with its product.
    assert.deepEqual(catalogImages(repo).map(image => [image.src, image.productId]), [
        ['/assets/products/a-800.webp', 'p_1'],
        ['/assets/products/b-800.webp', 'p_1'],
    ]);
});
