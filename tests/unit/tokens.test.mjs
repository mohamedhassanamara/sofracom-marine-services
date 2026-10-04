// The design tokens meet WCAG AA where they are meant to carry text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { colors, tones, statusTone } = require('../../lib/design/tokens.js');

const luminance = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
};

test('text shades pass AA (4.5:1) on white and on slate-50', () => {
    const text = [colors.navy[500], colors.navy[900], colors.accent[600], colors.slate[500], colors.slate[700], colors.success[700], colors.warning[700], colors.danger[600]];
    for (const fg of text) {
        assert.ok(contrast(fg, '#ffffff') >= 4.5, `${fg} on white: ${contrast(fg, '#ffffff').toFixed(2)}`);
        assert.ok(contrast(fg, colors.slate[50]) >= 4.5, `${fg} on slate-50`);
    }
});

test('white text passes AA on the primary and danger buttons', () => {
    for (const bg of [colors.navy[900], colors.navy[700], colors.navy[600], colors.danger[600], colors.accent[700]]) {
        assert.ok(contrast('#ffffff', bg) >= 4.5, `white on ${bg}: ${contrast('#ffffff', bg).toFixed(2)}`);
    }
});

test('every status/stock badge tone passes AA, and its dot is visible (3:1) on white', () => {
    for (const [name, tone] of Object.entries(tones)) {
        assert.ok(contrast(tone.fg, tone.bg) >= 4.5, `${name} badge: ${contrast(tone.fg, tone.bg).toFixed(2)}`);
        assert.ok(contrast(tone.solid, '#ffffff') >= 3, `${name} solid: ${contrast(tone.solid, '#ffffff').toFixed(2)}`);
    }
});

test('every order and quote status has a tone', () => {
    const { ORDER_STATUSES, QUOTE_STATUSES } = require('../../lib/status.js');
    for (const status of ORDER_STATUSES) assert.ok(tones[statusTone.order[status]], status);
    for (const status of QUOTE_STATUSES) assert.ok(tones[statusTone.quote[status]], status);
});

test('the accent brand blue is legible on navy (for links and focus on dark)', () => {
    assert.ok(contrast(colors.accent[400], colors.navy[900]) >= 4.5);
});
