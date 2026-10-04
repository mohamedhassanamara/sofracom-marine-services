// "Publish" for the local admin tools: commit ONLY the tool's own data file and asset
// folders, then push to main. Nothing else in the repository is ever committed or pushed:
// - the checked-out branch must be main (pushing HEAD from another branch would ship it)
// - it refuses while anything outside the scope is staged
// - it commits exactly the files the user confirmed (`git commit --only -- <files>`)
const { spawnSync } = require('child_process');

const PUBLISH_BRANCH = 'main';

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

function git(repoRoot, args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (result.status !== 0) {
    throw fail(500, (result.stderr || result.stdout || `git ${args[0]} failed`).trim());
  }
  return result.stdout;
}

const inScope = (scope, file) => scope.some(entry => file === entry || file.startsWith(`${entry}/`));

// Changed, added and deleted files inside the scope (repo-relative, tracked or not).
function changedFiles(repoRoot, scope) {
  const out = git(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames', '--', ...scope]);
  return out
    .split('\0')
    .filter(Boolean)
    .map(entry => {
      const code = entry.slice(0, 2);
      const status = code === '??' || code.includes('A') ? 'added' : code.includes('D') ? 'deleted' : 'modified';
      return { path: entry.slice(3), status };
    })
    .filter(file => inScope(scope, file.path))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function unrelatedStaged(repoRoot, scope) {
  return git(repoRoot, ['diff', '--cached', '--name-only', '-z'])
    .split('\0')
    .filter(file => file && !inScope(scope, file));
}

const currentBranch = repoRoot => {
  const result = spawnSync('git', ['symbolic-ref', '--short', '-q', 'HEAD'], { cwd: repoRoot, encoding: 'utf-8' });
  return result.status === 0 ? result.stdout.trim() : '';
};

// The origin push URL with the GitHub token in it. Local remotes (paths, file://) need no token.
function resolveRemote(repoRoot, { token, username = 'x-access-token' } = {}) {
  const url = git(repoRoot, ['remote', 'get-url', '--push', 'origin']).trim();
  if (!url) throw fail(500, 'Unable to determine the git remote URL');
  if (url.startsWith('/') || url.startsWith('file://')) return { url, secret: '' };

  let https = url;
  const ssh = url.match(/^git@([^:]+):(.+)$/);
  if (ssh) https = `https://${ssh[1]}/${ssh[2]}`;
  if (!https.startsWith('https://')) throw fail(500, `Unsupported remote URL format: ${url}`);
  if (!token) throw fail(500, 'Missing PRODUCT_ADMIN_GITHUB_TOKEN in .env (needed to push)');
  const auth = `${encodeURIComponent(username)}:${encodeURIComponent(token)}@`;
  return { url: https.replace(/^https:\/\//, `https://${auth}`), secret: encodeURIComponent(token) };
}

// What a publish would commit right now, and anything that prevents it.
function preview({ repoRoot, scope, credentials }) {
  const branch = currentBranch(repoRoot);
  const files = changedFiles(repoRoot, scope);
  const blockers = [];
  if (branch !== PUBLISH_BRANCH) {
    blockers.push(
      `Publishing only works with the ${PUBLISH_BRANCH} branch checked out (currently ${branch || 'a detached HEAD'}). ` +
        `Run "git switch ${PUBLISH_BRANCH} && git pull", then reload this page.`
    );
  }
  const unrelated = unrelatedStaged(repoRoot, scope);
  if (unrelated.length) {
    blockers.push(`Other files are staged in git; unstage them first: ${unrelated.join(', ')}`);
  }
  try {
    resolveRemote(repoRoot, credentials);
  } catch (err) {
    blockers.push(err.message);
  }
  if (!files.length) blockers.push('Nothing to publish: no saved changes.');
  return { branch, files, blockers };
}

function publish({ repoRoot, scope, credentials, confirmed, message }) {
  const current = preview({ repoRoot, scope, credentials });
  if (current.blockers.length) throw fail(409, current.blockers.join(' '));

  const paths = current.files.map(file => file.path);
  const confirmedPaths = [...new Set(Array.isArray(confirmed) ? confirmed : [])].sort((a, b) => a.localeCompare(b));
  if (confirmedPaths.join('\0') !== paths.join('\0')) {
    throw fail(409, 'The changes no longer match the list you confirmed. Review them again.');
  }

  const removed = current.files.filter(file => file.status === 'deleted').map(file => file.path);
  const present = paths.filter(file => !removed.includes(file));
  if (present.length) git(repoRoot, ['add', '-A', '--', ...present]);
  if (removed.length) git(repoRoot, ['rm', '-q', '--cached', '--ignore-unmatch', '--', ...removed]);
  git(repoRoot, ['commit', '-m', message, '--only', '--', ...paths]);
  const commit = git(repoRoot, ['rev-parse', '--short', 'HEAD']).trim();

  const remote = resolveRemote(repoRoot, credentials);
  try {
    git(repoRoot, ['push', remote.url, `HEAD:refs/heads/${PUBLISH_BRANCH}`]);
  } catch (err) {
    const detail = remote.secret ? err.message.split(remote.secret).join('***') : err.message;
    const hint = /rejected|non-fast-forward|fetch first/.test(detail)
      ? ` ${PUBLISH_BRANCH} on GitHub has newer commits: run "git pull", then publish again.`
      : '';
    throw fail(502, `Committed locally as ${commit}, but the push failed.${hint} ${detail}`);
  }
  return { committed: true, pushed: true, commit, files: paths, message: `Published ${paths.length} file(s) to ${PUBLISH_BRANCH} (${commit})` };
}

module.exports = { PUBLISH_BRANCH, changedFiles, unrelatedStaged, preview, publish, resolveRemote };
