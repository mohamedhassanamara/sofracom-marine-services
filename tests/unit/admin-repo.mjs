// A throwaway git repository (with a bare "origin") shaped like this project's catalog,
// for testing the admin tools' publish flow without touching the real repository.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function makeRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sofracom-admin-'));
    const work = path.join(root, 'work');
    const remote = path.join(root, 'remote.git');
    const git = (...args) => execFileSync('git', args, { cwd: work, encoding: 'utf-8' });
    const write = (file, content) => {
        fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
        fs.writeFileSync(path.join(work, file), content);
    };

    execFileSync('git', ['init', '--bare', '-b', 'main', remote]);
    fs.mkdirSync(work);
    git('init', '-b', 'main');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.test');
    git('config', 'commit.gpgsign', 'false');
    write('public/assets/data/products.json', '{"categories":[]}\n');
    write('public/assets/data/gallery.json', '{"entries":[]}\n');
    write('public/assets/products/old.png', 'old');
    write('public/assets/gallery/old.png', 'old');
    write('lib/code.js', 'module.exports = 1;\n');
    git('add', '-A');
    git('commit', '-m', 'initial');
    git('remote', 'add', 'origin', remote);
    git('push', '-q', 'origin', 'main');

    return {
        root,
        work,
        git,
        write,
        // Files changed by the last commit on the remote's main.
        remoteHead: () => execFileSync('git', ['log', '-1', '--name-only', '--format=%s', 'main'], { cwd: remote, encoding: 'utf-8' }),
        remoteCommits: () => Number(execFileSync('git', ['rev-list', '--count', 'main'], { cwd: remote, encoding: 'utf-8' }).trim()),
        status: () => git('status', '--porcelain', '--untracked-files=all'),
        cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
    };
}
