// Automatic check of a background-removal result (the transparent PNG in the original
// photo's frame, before trimming). A cutout is approved automatically only when every check
// passes; otherwise it waits in Admin → Photos with the reasons listed.
//
//   coverage  the subject covers 8–92 % of the frame (an empty mask, or a "cutout" that kept
//             the whole picture, e.g. an illustration on a plain background, fails)
//   faint     the subject isn't near-white or half-transparent: mean opacity ≥ 0.85 and mean
//             brightness ≤ 0.9 over the subject, so a white bottle that may have lost its
//             edges gets a human look
//   single    one main object: the largest connected piece is ≥ 70 % of the subject
//   edges     the subject's box doesn't touch 3 or 4 sides of the frame (cut-off photo)
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

export const LIMITS = { minCoverage: 0.08, maxCoverage: 0.92, minAlpha: 0.85, maxLuminance: 0.9, minMainShare: 0.7, maxEdges: 2 };
const SIDE = 256; // analysed size: plenty for these measures, fast
const SOLID = 128; // a pixel counts as subject from this opacity

const REASONS = {
    empty: 'Almost nothing was kept: the subject may have been removed.',
    coverageLow: 'The subject is very small in the photo (under 8 %).',
    coverageHigh: 'Almost the whole picture was kept (over 92 %): background not removed, or an illustration.',
    faint: 'The subject is near-white or half-transparent: check that no part of it was lost.',
    pieces: 'Several separate objects: the largest is under 70 % of what was kept.',
    edges: 'The subject touches 3 or more edges of the photo: it may be cut off.',
};

export async function assessCutout(png) {
    const { data, info } = await sharp(png).ensureAlpha().resize(SIDE, SIDE, { fit: 'fill', kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const solid = new Uint8Array(width * height);
    let count = 0;
    let alphaSum = 0;
    let lumSum = 0;
    let visible = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const i = (y * width + x) * 4;
            const alpha = data[i + 3];
            if (alpha > 8) {
                visible += 1;
                alphaSum += alpha / 255;
                lumSum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
            }
            if (alpha >= SOLID) {
                solid[y * width + x] = 1;
                count += 1;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    const total = width * height;
    const coverage = count / total;
    const meanAlpha = visible ? alphaSum / visible : 0;
    const meanLuminance = visible ? lumSum / visible : 0;

    // Largest 4-connected piece of the subject.
    let largest = 0;
    const seen = new Uint8Array(total);
    const stack = new Int32Array(total);
    for (let start = 0; start < total; start += 1) {
        if (!solid[start] || seen[start]) continue;
        let size = 0;
        let top = 0;
        stack[top++] = start;
        seen[start] = 1;
        while (top) {
            const at = stack[--top];
            size += 1;
            const x = at % width;
            const neighbours = [x > 0 ? at - 1 : -1, x < width - 1 ? at + 1 : -1, at - width, at + width];
            for (const next of neighbours) {
                if (next >= 0 && next < total && solid[next] && !seen[next]) {
                    seen[next] = 1;
                    stack[top++] = next;
                }
            }
        }
        if (size > largest) largest = size;
    }
    const mainShare = count ? largest / count : 0;
    const margin = 1;
    const edges = count ? [minX <= margin, minY <= margin, maxX >= width - 1 - margin, maxY >= height - 1 - margin].filter(Boolean).length : 0;

    const reasons = [];
    if (coverage < 0.005) reasons.push(REASONS.empty);
    else if (coverage < LIMITS.minCoverage) reasons.push(REASONS.coverageLow);
    if (coverage > LIMITS.maxCoverage) reasons.push(REASONS.coverageHigh);
    if (count && (meanAlpha < LIMITS.minAlpha || meanLuminance > LIMITS.maxLuminance)) reasons.push(REASONS.faint);
    if (count && mainShare < LIMITS.minMainShare) reasons.push(REASONS.pieces);
    if (edges > LIMITS.maxEdges) reasons.push(REASONS.edges);

    const round = value => Math.round(value * 1000) / 1000;
    return { ok: reasons.length === 0, reasons, metrics: { coverage: round(coverage), meanAlpha: round(meanAlpha), meanLuminance: round(meanLuminance), mainShare: round(mainShare), edges } };
}
