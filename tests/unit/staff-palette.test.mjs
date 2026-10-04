// The staff phone app uses the same status colours and labels as the website and the admin:
// its lib/status_palette.dart must equal what scripts/export-staff-palette.mjs generates.
// Skipped when the app's repository isn't next to this one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { staffPaletteDart } from '../../scripts/export-staff-palette.mjs';

const APP = process.env.STAFF_APP_DIR || path.resolve(new URL('../..', import.meta.url).pathname, '..', '..', 'IdeaProjects', 'sofracom_admin_pp');
const file = path.join(APP, 'lib', 'status_palette.dart');

test('the generated palette covers every status with a tone', () => {
    const dart = staffPaletteDart();
    for (const status of ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'received', 'in_review', 'quoted', 'accepted', 'declined', 'completed']) {
        assert.match(dart, new RegExp(`StatusInfo\\('${status}', '[^']+', '(neutral|info|primary|warning|success|danger)'\\)`));
    }
});

test('the staff app has the current palette', { skip: !fs.existsSync(file) && 'staff app not checked out next to this repo' }, () => {
    assert.equal(fs.readFileSync(file, 'utf-8'), staffPaletteDart(), 'run: node scripts/export-staff-palette.mjs --write <staff app dir>');
});
