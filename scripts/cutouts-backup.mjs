#!/usr/bin/env node
// Backs up the cutouts waiting for review (.cutouts-cache/, git-ignored, so not in any
// backup of the repository) into one zip OUTSIDE the repository.
//
//   npm run cutouts:backup -- ~/Backups                    # → ~/Backups/sofracom-cutouts-2026-10-05-1430.zip
//   npm run cutouts:backup -- /Volumes/USB/cutouts.zip     # exact file name
//
// Restore: unzip it in the repository folder (it contains the .cutouts-cache/ folder).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.env.CUTOUTS_REPO_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const cache = path.join(root, '.cutouts-cache');
const fail = message => {
    console.error(message);
    process.exit(1);
};

const target = process.argv[2];
if (!target) fail('Where should the backup go? npm run cutouts:backup -- /path/outside/the/repo');
if (!fs.existsSync(cache) || !fs.readdirSync(cache).length) fail(`Nothing to back up: ${cache} is missing or empty.`);

const expanded = path.resolve(target.replace(/^~(?=$|\/)/, os.homedir()));
const now = new Date();
const two = value => String(value).padStart(2, '0');
const stamp = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}`; // local time
const dest = expanded.endsWith('.zip') ? expanded : path.join(expanded, `sofracom-cutouts-${stamp}.zip`);
// Outside the repository, or the backup would sit next to what it protects (and maybe in git).
const real = file => {
    let current = file;
    while (!fs.existsSync(current)) current = path.dirname(current);
    return path.join(fs.realpathSync(current), path.relative(current, file));
};
const relative = path.relative(fs.realpathSync(root), real(dest));
if (!relative.startsWith('..') && !path.isAbsolute(relative)) fail(`Choose a place outside the repository (got ${dest}).`);
if (fs.existsSync(dest)) fail(`${dest} already exists; choose another name.`);
fs.mkdirSync(path.dirname(dest), { recursive: true });

const zipped = spawnSync('zip', ['-r', '-q', '-X', dest, '.cutouts-cache'], { cwd: root, encoding: 'utf-8' });
if (zipped.error) fail(`Could not run "zip" (${zipped.error.message}). It ships with macOS and most Linux systems.`);
if (zipped.status !== 0) fail(`zip failed: ${(zipped.stderr || zipped.stdout).trim()}`);
const tested = spawnSync('unzip', ['-tq', dest], { encoding: 'utf-8' });
if (tested.status !== 0) fail(`The backup was written but does not verify: ${(tested.stdout || tested.stderr).trim()}`);

const count = (dir => {
    let total = 0;
    const walk = current => fs.readdirSync(current, { withFileTypes: true }).forEach(entry => (entry.isDirectory() ? walk(path.join(current, entry.name)) : (total += 1)));
    walk(dir);
    return total;
})(cache);
console.log(`Backed up ${count} files (${(fs.statSync(dest).size / 1e6).toFixed(1)} MB) to ${dest}`);
