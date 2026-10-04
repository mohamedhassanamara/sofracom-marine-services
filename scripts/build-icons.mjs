#!/usr/bin/env node
// Favicon set from public/logo.jpeg: favicon.ico (16/32/48), apple-touch-icon (180),
// icon-192/512 and site.webmanifest. Run again if the logo changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SOURCE = path.join(PUBLIC, 'logo.jpeg');
// The mark sits in the middle of the square; crop the margin so it reads at 16 px.
const meta = await sharp(SOURCE).metadata();
const crop = Math.round(Math.min(meta.width, meta.height) * 0.72);
const square = await sharp(SOURCE)
    .extract({ left: Math.round((meta.width - crop) / 2), top: Math.round((meta.height - crop) / 2), width: crop, height: crop })
    .toBuffer();
const png = size => sharp(square).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();

// ICO with embedded PNGs (supported by every current browser).
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[index].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[index].length;
});
fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), Buffer.concat([header, ...images]));
fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), await png(180));
fs.writeFileSync(path.join(PUBLIC, 'icon-192.png'), await png(192));
fs.writeFileSync(path.join(PUBLIC, 'icon-512.png'), await png(512));
fs.writeFileSync(
    path.join(PUBLIC, 'site.webmanifest'),
    `${JSON.stringify(
        {
            name: 'SOFRACOM',
            short_name: 'SOFRACOM',
            icons: [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
            theme_color: '#0b2050',
            background_color: '#f8fafc',
            display: 'browser',
        },
        null,
        2
    )}\n`
);
console.log('icons written');
