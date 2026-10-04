// The admin tools' Publish (tools/shared/publish.js) commits only the tool's own files and
// pushes only to main, against a throwaway repository.
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeRepo } from './admin-repo.mjs';

const require = createRequire(import.meta.url);
const publisher = require('../../tools/shared/publish.js');

const SCOPE = ['public/assets/data/products.json', 'public/assets/products'];
let repo;
const run = (extra = {}) => publisher.publish({ repoRoot: repo.work, scope: SCOPE, message: 'Publish test', ...extra });
const preview = () => publisher.preview({ repoRoot: repo.work, scope: SCOPE });

beforeEach(() => {
    repo = makeRepo();
});
afterEach(() => repo.cleanup());

test('commits and pushes only the scoped files, leaving other changes alone', () => {
    repo.write('public/assets/data/products.json', '{"categories":[{"name":"A"}]}\n');
    repo.write('public/assets/products/new.webp', 'new');
    repo.git('rm', '-q', 'public/assets/products/old.png');
    repo.write('lib/code.js', 'module.exports = 2;\n'); // unrelated, unstaged
    repo.write('public/assets/data/gallery.json', '{"entries":[1]}\n'); // other tool's file
    repo.write('notes.txt', 'scratch'); // unrelated, untracked

    const { files, blockers } = preview();
    assert.deepEqual(blockers, []);
    assert.deepEqual(files, [
        { path: 'public/assets/data/products.json', status: 'modified' },
        { path: 'public/assets/products/new.webp', status: 'added' },
        { path: 'public/assets/products/old.png', status: 'deleted' },
    ]);

    const result = run({ confirmed: files.map(file => file.path) });
    assert.equal(result.pushed, true);
    assert.deepEqual(
        repo.remoteHead().trim().split('\n').filter(Boolean),
        ['Publish test', 'public/assets/data/products.json', 'public/assets/products/new.webp', 'public/assets/products/old.png']
    );
    const left = repo.status();
    assert.match(left, / M lib\/code\.js/);
    assert.match(left, / M public\/assets\/data\/gallery\.json/);
    assert.match(left, /\?\? notes\.txt/);
});

test('refuses while unrelated files are staged', () => {
    repo.write('public/assets/data/products.json', '{"categories":[1]}\n');
    repo.write('lib/code.js', 'module.exports = 3;\n');
    repo.git('add', 'lib/code.js');

    assert.match(preview().blockers.join(' '), /staged.*lib\/code\.js/);
    assert.throws(() => run({ confirmed: ['public/assets/data/products.json'] }), err => err.statusCode === 409 && /lib\/code\.js/.test(err.message));
    assert.equal(repo.remoteCommits(), 1);
    assert.match(repo.status(), /^M  lib\/code\.js/m); // still staged, untouched
});

test('refuses on any branch other than main, so feature work is never pushed', () => {
    repo.git('switch', '-q', '-c', 'redesign');
    repo.write('lib/code.js', 'module.exports = 4;\n');
    repo.git('commit', '-qam', 'feature work');
    repo.write('public/assets/data/products.json', '{"categories":[2]}\n');

    assert.match(preview().blockers.join(' '), /main branch checked out \(currently redesign\)/);
    assert.throws(() => run({ confirmed: ['public/assets/data/products.json'] }), err => err.statusCode === 409);
    assert.equal(repo.remoteCommits(), 1);
});

test('refuses when the confirmed list no longer matches the changes', () => {
    repo.write('public/assets/data/products.json', '{"categories":[3]}\n');
    repo.write('public/assets/products/late.webp', 'late'); // appeared after the user confirmed
    assert.throws(() => run({ confirmed: ['public/assets/data/products.json'] }), err => err.statusCode === 409 && /no longer match/.test(err.message));
    assert.equal(repo.remoteCommits(), 1);
});

test('nothing to publish is a blocker, not an empty commit', () => {
    assert.match(preview().blockers.join(' '), /Nothing to publish/);
    assert.throws(() => run({ confirmed: [] }), err => err.statusCode === 409);
});

test('an https remote needs a token, and the token never appears in errors', () => {
    repo.git('remote', 'set-url', 'origin', 'https://github.invalid/acme/site.git');
    repo.write('public/assets/data/products.json', '{"categories":[4]}\n');
    assert.match(preview().blockers.join(' '), /Missing PRODUCT_ADMIN_GITHUB_TOKEN/);

    const credentials = { token: 'secret-token-123' };
    const { files } = publisher.preview({ repoRoot: repo.work, scope: SCOPE, credentials });
    assert.throws(
        () => run({ credentials, confirmed: files.map(file => file.path) }),
        err => err.statusCode === 502 && /Committed locally/.test(err.message) && !err.message.includes('secret-token-123')
    );
});
