// The automatic cutout check (tools/shared/cutoutQuality.mjs) on background-removal outputs:
// transparent PNGs in the original photo's frame. The fixtures are drawn here as SVG, so
// they're exact and need no model: a good tin, a white bottle, an illustration (the whole
// picture kept), a photo cut off at the edges, and two separate objects.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { assessCutout } from '../../tools/shared/cutoutQuality.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const png = body => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">${body}</svg>`)).png().toBuffer();

const FIXTURES = {
    // A paint tin: opaque, colourful, centred, ~25 % of the frame.
    goodTin: () =>
        png(`<rect x="250" y="220" width="300" height="400" rx="20" fill="#c8102e"/>
             <rect x="250" y="380" width="300" height="140" fill="#f2a900"/>
             <path d="M270 230 Q400 120 530 230" stroke="#555" stroke-width="10" fill="none"/>`),
    // A white bottle that came out pale and half-transparent.
    whiteBottle: () =>
        png(`<rect x="320" y="160" width="160" height="500" rx="40" fill="#f6f6f3" fill-opacity="0.75"/>
             <rect x="365" y="110" width="70" height="60" fill="#fafafa" fill-opacity="0.8"/>`),
    // An illustration: flat colours over the whole frame, so nothing was removed.
    illustration: () =>
        png(`<rect width="800" height="800" fill="#eef3fb"/>
             <circle cx="400" cy="400" r="220" fill="#0b2050"/><rect x="0" y="600" width="800" height="200" fill="#b6c8e8"/>`),
    // A close-up whose subject runs off the left, top and right edges.
    edgeCut: () => png(`<rect x="0" y="0" width="800" height="520" fill="#3a5fa6"/><rect x="0" y="420" width="800" height="100" fill="#1d3a73"/>`),
    // Two products side by side, neither dominant.
    twoObjects: () => png(`<rect x="90" y="250" width="240" height="320" fill="#c8102e"/><rect x="470" y="250" width="240" height="320" fill="#0b2050"/>`),
};

test('a good tin passes every check (auto-approved)', async () => {
    const result = await assessCutout(await FIXTURES.goodTin());
    assert.equal(result.ok, true, result.reasons.join(' '));
    assert.ok(result.metrics.coverage > 0.08 && result.metrics.coverage < 0.92);
    assert.equal(result.metrics.edges, 0);
});

test('a white, half-transparent bottle needs review (it may have lost its edges)', async () => {
    const result = await assessCutout(await FIXTURES.whiteBottle());
    assert.equal(result.ok, false);
    assert.match(result.reasons.join(' '), /near-white or half-transparent/);
});

test('an illustration keeps the whole picture: needs review', async () => {
    const result = await assessCutout(await FIXTURES.illustration());
    assert.equal(result.ok, false);
    assert.match(result.reasons.join(' '), /whole picture was kept/);
});

test('a subject cut off at 3 edges needs review', async () => {
    const result = await assessCutout(await FIXTURES.edgeCut());
    assert.equal(result.ok, false);
    assert.equal(result.metrics.edges, 3);
    assert.match(result.reasons.join(' '), /3 or more edges/);
});

test('two separate objects: no single main object', async () => {
    const result = await assessCutout(await FIXTURES.twoObjects());
    assert.equal(result.ok, false);
    assert.ok(result.metrics.mainShare < 0.7);
    assert.match(result.reasons.join(' '), /Several separate objects/);
});

test('an empty mask (everything removed) needs review', async () => {
    const result = await assessCutout(await png(''));
    assert.equal(result.ok, false);
    assert.match(result.reasons.join(' '), /Almost nothing was kept/);
});
