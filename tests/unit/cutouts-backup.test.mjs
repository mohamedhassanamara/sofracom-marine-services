// npm run cutouts:backup: zips .cutouts-cache to a place outside the repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = new URL('../../scripts/cutouts-backup.mjs', import.meta.url).pathname;
const backup = (repo, target) => spawnSync('node', [SCRIPT, ...(target ? [target] : [])], { encoding: 'utf-8', env: { ...process.env, CUTOUTS_REPO_ROOT: repo } });

function fixture() {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cutouts-backup-'));
    const repo = path.join(base, 'repo');
    fs.mkdirSync(path.join(repo, '.cutouts-cache', 'files'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.cutouts-cache', 'manifest.json'), '{"version":1,"images":{}}');
    fs.writeFileSync(path.join(repo, '.cutouts-cache', 'files', 'a-cut-800.webp'), 'webp');
    return { base, repo };
}

test('zips the cache into a folder outside the repository, and the zip verifies', () => {
    const { base, repo } = fixture();
    const out = path.join(base, 'backups');
    const result = backup(repo, out);
    assert.equal(result.status, 0, result.stderr);
    const [file] = fs.readdirSync(out);
    assert.match(file, /^sofracom-cutouts-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/);
    const listing = spawnSync('unzip', ['-l', path.join(out, file)], { encoding: 'utf-8' }).stdout;
    assert.match(listing, /\.cutouts-cache\/manifest\.json/);
    assert.match(listing, /\.cutouts-cache\/files\/a-cut-800\.webp/);
    assert.match(result.stdout, /Backed up 2 files/);
    // An exact .zip name works; an existing file is never overwritten.
    assert.equal(backup(repo, path.join(base, 'copy.zip')).status, 0);
    assert.match(backup(repo, path.join(base, 'copy.zip')).stderr, /already exists/);
});

test('refuses without a path, inside the repository, or with nothing to back up', () => {
    const { base, repo } = fixture();
    assert.match(backup(repo).stderr, /Where should the backup go/);
    assert.match(backup(repo, path.join(repo, 'backups')).stderr, /outside the repository/);
    assert.match(backup(repo, repo).stderr, /outside the repository/);
    fs.rmSync(path.join(repo, '.cutouts-cache'), { recursive: true });
    assert.match(backup(repo, path.join(base, 'out')).stderr, /Nothing to back up/);
});
