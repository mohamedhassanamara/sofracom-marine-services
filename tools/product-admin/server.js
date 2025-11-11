const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 5173);

const repoRoot = path.resolve(__dirname, '../..');
const dataPath = path.join(repoRoot, 'public', 'assets', 'data', 'products.json');
const envPath = path.join(repoRoot, '.env');
let envLoaded = false;

function loadEnvFile() {
  if (envLoaded) return;
  envLoaded = true;

  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, 'utf-8');
  contents.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) return;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key]) return;
    process.env[key] = value;
  });
}
const staticFiles = new Map([
  ['/', path.join(__dirname, 'index.html')],
  ['/app.js', path.join(__dirname, 'app.js')],
  ['/styles.css', path.join(__dirname, 'styles.css')],
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Failed to load asset');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

function handleStatic(req, res, pathname) {
  const filePath = staticFiles.get(pathname);
  if (filePath) {
    sendFile(res, filePath);
    return true;
  }

    if (pathname.startsWith('/assets/')) {
        const assetRoot = path.join(repoRoot, 'public', 'assets');
    const requested = path.normalize(path.join(repoRoot, pathname));
    if (!requested.startsWith(assetRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return true;
    }

    sendFile(res, requested);
    return true;
  }

  const siteFileTargets = new Set([
    '/index.html',
    '/products.html',
    '/script.js',
    '/styles.css',
    '/favicon.ico',
    '/hero.jpeg',
    '/logo.jpeg',
    '/modern_logo.svg',
    '/monastir1.jpeg',
    '/monastir2.jpeg',
  ]);

  if (siteFileTargets.has(pathname)) {
    const requested = path.join(repoRoot, pathname);
    sendFile(res, requested);
    return true;
  }

  return false;
}

function getCredentials() {
  loadEnvFile();
  const token =
    process.env.PRODUCT_ADMIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  if (!token) return { token: '', username: '' };

  const username =
    process.env.PRODUCT_ADMIN_GITHUB_USERNAME ||
    process.env.GITHUB_USERNAME ||
    'x-access-token';

  return { token, username };
}

function normalizeRemoteUrl(remoteUrl) {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    throw new Error('Unable to determine git remote URL');
  }

  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('git@')) {
    const match = trimmed.match(/^git@([^:]+):(.+)$/);
    if (!match) {
      throw new Error(`Unsupported SSH remote format: ${trimmed}`);
    }
    return `https://${match[1]}/${match[2]}`;
  }

  throw new Error(`Unsupported remote URL format: ${trimmed}`);
}

function injectToken(remoteUrl, username, token) {
  const encodedUser = encodeURIComponent(username);
  const encodedToken = encodeURIComponent(token);
  return remoteUrl.replace(
    /^https:\/\//,
    `https://${encodedUser}:${encodedToken}@`
  );
}

function runGitCommands() {
  const gitEnv = {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    },
  };

  const add = spawnSync('git', ['add', path.relative(repoRoot, dataPath)], gitEnv);
  if (add.status !== 0) {
    throw new Error(add.stderr || 'git add failed');
  }

  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], gitEnv);
  if (diff.status === 0) {
    return {
      committed: false,
      pushed: false,
      message: 'products.json updated but no staged diff detected',
    };
  }
  if (diff.status !== 1) {
    throw new Error(diff.stderr || 'git diff check failed');
  }

  const message = `Update products via admin tool (${new Date().toISOString()})`;
  const commit = spawnSync('git', ['commit', '-m', message], gitEnv);
  if (commit.status !== 0) {
    throw new Error(commit.stderr || 'git commit failed');
  }

  const { token, username } = getCredentials();
  if (!token) {
    throw new Error(
      'Missing PRODUCT_ADMIN_GITHUB_TOKEN environment variable required for push'
    );
  }

  const remoteResult = spawnSync(
    'git',
    ['remote', 'get-url', '--push', 'origin'],
    gitEnv
  );
  if (remoteResult.status !== 0) {
    throw new Error(
      remoteResult.stderr || 'Failed to read git remote push URL'
    );
  }
  const remoteUrl = normalizeRemoteUrl(remoteResult.stdout);
  const authedRemote = injectToken(remoteUrl, username, token);

  const branchResult = spawnSync(
    'git',
    ['rev-parse', '--abbrev-ref', 'HEAD'],
    gitEnv
  );
  if (branchResult.status !== 0) {
    throw new Error(branchResult.stderr || 'Failed to determine current branch');
  }
  const branch = branchResult.stdout.trim();

  const push = spawnSync('git', ['push', authedRemote, branch], gitEnv);
  if (push.status !== 0) {
    throw new Error(push.stderr || 'git push failed');
  }

  return {
    committed: true,
    pushed: true,
    message: 'Changes committed and pushed successfully',
  };
}

const BUCKET_CONFIG = {
  products: {
    maxSize: 8 * 1024 * 1024,
    type: 'image',
  },
  categories: {
    maxSize: 8 * 1024 * 1024,
    type: 'image',
  },
  datasheets: {
    maxSize: 12 * 1024 * 1024,
    type: 'pdf',
  },
};

function normalizeBucket(rawBucket) {
  const bucket = typeof rawBucket === 'string' ? rawBucket.toLowerCase() : '';
  if (!bucket || !Object.prototype.hasOwnProperty.call(BUCKET_CONFIG, bucket)) {
    throw new Error('Invalid bucket provided for upload');
  }
  return bucket;
}

function inferExtension(filename, mime) {
  const known = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/avif': '.avif',
    'application/pdf': '.pdf',
  };
  if (mime && known[mime]) return known[mime];

  const ext = path.extname(filename || '').toLowerCase();
  if (ext) return ext;

  if (mime && mime.startsWith('image/')) {
    return `.${mime.split('/')[1]}`;
  }
  return '.png';
}

function sanitizeBasename(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureAssetsSubdir(bucket) {
  const target = path.join(repoRoot, 'public', 'assets', bucket);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}

async function handleUpload(req, res) {
  try {
    const payload = await parseBody(req);
    const { dataUrl, filename, bucket: rawBucket } = payload || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Upload requires a base64 dataUrl string');
    }
    if (!filename || typeof filename !== 'string') {
      throw new Error('Upload requires an original filename');
    }

    const bucket = normalizeBucket(rawBucket);
    const config = BUCKET_CONFIG[bucket];
    if (!config) {
      throw new Error('Missing bucket configuration');
    }
    const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!match) {
      throw new Error('dataUrl must be base64 encoded data');
    }
    const [, mime, base64Data] = match;
    if (config.type === 'image' && !mime.startsWith('image/')) {
      throw new Error('Only image uploads are allowed for this bucket');
    }
    if (config.type === 'pdf' && mime !== 'application/pdf') {
      throw new Error('Only PDF uploads are allowed for this bucket');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length) {
      throw new Error('Decoded image payload is empty');
    }
    if (buffer.length > config.maxSize) {
      const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
      throw new Error(
        `File exceeds ${config.maxSize / (1024 * 1024)}MB limit (received ${sizeMb}MB)`
      );
    }

    const baseDir = ensureAssetsSubdir(bucket);
    const extension = inferExtension(filename, mime);
    const baseName = sanitizeBasename(path.basename(filename, path.extname(filename)));
    const uniqueSuffix = Date.now().toString(36);
    const finalName = `${baseName || bucket}-${uniqueSuffix}${extension}`;
    const absolutePath = path.join(baseDir, finalName);
    fs.writeFileSync(absolutePath, buffer);

    const relativePath = path.relative(repoRoot, absolutePath).split(path.sep).join('/');
    const gitEnv = { cwd: repoRoot, encoding: 'utf-8' };
    const addResult = spawnSync('git', ['add', relativePath], gitEnv);
    if (addResult.status !== 0) {
      fs.unlinkSync(absolutePath);
      throw new Error(addResult.stderr || 'Failed to stage uploaded image');
    }

    sendJson(res, 200, { ok: true, path: relativePath });
  } catch (err) {
    sendJson(res, err.statusCode || 400, { ok: false, error: err.message });
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
      if (data.length > 12 * 1024 * 1024) {
        const err = new Error('Payload too large');
        err.statusCode = 413;
        reject(err);
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (err) {
        const parseErr = new Error('Invalid JSON payload');
        parseErr.statusCode = 400;
        reject(parseErr);
      }
    });
    req.on('error', reject);
  });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    const err = new Error('Payload must be a JSON object');
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(payload.categories)) {
    const err = new Error('Payload must include a categories array');
    err.statusCode = 400;
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  if (handleStatic(req, res, pathname)) return;

  if (pathname === '/api/products' && req.method === 'GET') {
    try {
      const content = fs.readFileSync(dataPath, 'utf-8');
      sendJson(res, 200, JSON.parse(content));
    } catch (err) {
      sendJson(res, 500, { ok: false, error: 'Failed to read products.json' });
    }
    return;
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      validatePayload(payload);
      const formatted = JSON.stringify(payload, null, 2);
      fs.writeFileSync(dataPath, `${formatted}\n`, 'utf-8');
      const gitResult = runGitCommands();
      sendJson(res, 200, { ok: true, git: gitResult });
    } catch (err) {
      const status = err.statusCode || 500;
      sendJson(res, status, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    handleUpload(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Product admin running on http://${HOST}:${PORT}`);
});
