// Responsive images: srcset from the stored -800 path, and the derivatives the upload
// pipeline writes (tools/shared/images.js): three WebP widths, never above 200 KB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { imageAt, srcSetFor } from '../../lib/images.js';

const require = createRequire(import.meta.url);
const images = require('../../tools/shared/images.js');

test('srcset and size picks come from the -800 path; other paths are served as-is', () => {
    assert.equal(
        srcSetFor('assets/products/a-800.webp'),
        '/assets/products/a-400.webp 400w, /assets/products/a-800.webp 800w, /assets/products/a-1600.webp 1600w'
    );
    assert.equal(imageAt('/assets/products/a-800.webp', 300), '/assets/products/a-400.webp');
    assert.equal(imageAt('/assets/products/a-800.webp', 1400), '/assets/products/a-1600.webp');
    assert.equal(srcSetFor('/logo.jpeg'), undefined);
    assert.equal(imageAt('/logo.jpeg', 400), '/logo.jpeg');
    assert.equal(imageAt('https://example.test/x.png'), 'https://example.test/x.png');
});

test('a large photo becomes 400/800/1600 WebP files, each at most 200 KB, never upscaled', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sofracom-img-'));
    try {
        // Noise is the worst case for compression (like a detailed phone photo).
        const width = 3000;
        const height = 2000;
        const noise = Buffer.alloc(width * height * 3);
        for (let i = 0; i < noise.length; i += 1) noise[i] = (i * 2654435761) % 251;
        const photo = await sharp(noise, { raw: { width, height, channels: 3 } }).png().toBuffer();
        const { files, main } = await images.writeResponsive(photo, dir, 'boat');
        assert.deepEqual(files.map(file => path.basename(file)), ['boat-400.webp', 'boat-800.webp', 'boat-1600.webp']);
        assert.equal(path.basename(main), 'boat-800.webp');
        for (const file of files) {
            assert.ok(fs.statSync(file).size <= images.MAX_BYTES, `${path.basename(file)} is ${fs.statSync(file).size} bytes`);
            assert.equal((await sharp(file).metadata()).format, 'webp');
        }
        assert.equal((await sharp(files[0]).metadata()).width, 400);

        const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#0b2050' } }).png().toBuffer();
        const tiny = await images.writeResponsive(small, dir, 'logo');
        assert.equal((await sharp(tiny.files[2]).metadata()).width, 300);
        assert.equal(images.uniqueStem(dir, 'boat'), 'boat-2');
        assert.equal(images.uniqueStem(dir, 'new'), 'new');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('every image the catalog and gallery reference is an optimized WebP that exists', () => {
    const root = new URL('../../public/', import.meta.url).pathname;
    const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/products.json'), 'utf-8'));
    const gallery = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/gallery.json'), 'utf-8'));
    const refs = [];
    for (const category of catalog.categories) {
        refs.push(category.image);
        for (const product of category.products) refs.push(product.image, ...(product.images || []));
    }
    for (const entry of gallery.entries) if (entry.type !== 'video') refs.push(entry.src);
    const bad = refs.filter(Boolean).filter(ref => !images.isOptimized(ref) || !fs.existsSync(path.join(root, ref.replace(/^\//, ''))));
    assert.deepEqual(bad, []);
});
