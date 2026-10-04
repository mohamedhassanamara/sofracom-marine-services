const http = require('http');
const fs = require('fs');
const path = require('path');
const { HOST, createGuard } = require('../shared/guard');
const publisher = require('../shared/publish');
const images = require('../shared/images');

const RESIZABLE = /^image\/(jpeg|png|webp|avif|tiff|heic|heif)$/;

const PORT = Number(process.env.PORT || 5174);
const guard = createGuard({ port: PORT });

// ADMIN_REPO_ROOT points the gallery file and git at another checkout (used by tests).
const repoRoot = process.env.ADMIN_REPO_ROOT
  ? path.resolve(process.env.ADMIN_REPO_ROOT)
  : path.resolve(__dirname, '../..');
const dataPath = path.join(repoRoot, 'public', 'assets', 'data', 'gallery.json');
const envPath = path.join(repoRoot, '.env');
let envLoaded = false;

const staticFiles = new Map([
  ['/', path.join(__dirname, 'index.html')],
  ['/app.js', path.join(__dirname, 'app.js')],
  ['/styles.css', path.join(__dirname, 'styles.css')],
  ['/shared/admin-client.js', path.join(__dirname, '..', 'shared', 'admin-client.js')],
]);

// What "Publish" may commit: the gallery and its images, nothing else.
const PUBLISH_SCOPE = ['public/assets/data/gallery.json', 'public/assets/gallery'];

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
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(ext === '.html' ? guard.injectToken(data.toString('utf-8')) : data);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function handleStatic(req, res, pathname) {
  const filePath = staticFiles.get(pathname);
  if (filePath) {
    sendFile(res, filePath);
    return true;
  }
  if (pathname.startsWith('/assets/') || pathname.startsWith('/public/assets/')) {
    const assetRoot = path.resolve(repoRoot, 'public', 'assets');
    const normalizedPath = pathname
      .replace(/^\/+/, '')
      .replace(/^public\//, '');
    const requested = path.resolve(repoRoot, 'public', normalizedPath);
    const relativeToRoot = path.relative(assetRoot, requested);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return true;
    }
    sendFile(res, requested);
    return true;
  }
  return false;
}

function getCredentials() {
  loadEnvFile();
  return {
    token:
      process.env.GALLERY_ADMIN_GITHUB_TOKEN ||
      process.env.PRODUCT_ADMIN_GITHUB_TOKEN ||
      process.env.GITHUB_TOKEN ||
      '',
    username:
      process.env.GALLERY_ADMIN_GITHUB_USERNAME ||
      process.env.PRODUCT_ADMIN_GITHUB_USERNAME ||
      process.env.GITHUB_USERNAME ||
      'x-access-token',
  };
}

const BUCKET_CONFIG = {
  gallery: {
    maxSize: 10 * 1024 * 1024,
    type: 'image',
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

    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length) {
      throw new Error('Decoded payload is empty');
    }
    if (buffer.length > config.maxSize) {
      const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
      throw new Error(
        `File exceeds ${config.maxSize / (1024 * 1024)}MB limit (received ${sizeMb}MB)`
      );
    }

    const baseDir = ensureAssetsSubdir(bucket);
    const baseName = sanitizeBasename(path.basename(filename, path.extname(filename)));
    const publicRoot = path.join(repoRoot, 'public');

    // Photos are stored only as resized WebP (400/800/1600, ≤200 KB); the -800 path goes in the JSON.
    if (config.type === 'image' && RESIZABLE.test(mime)) {
      const stem = images.uniqueStem(baseDir, baseName || bucket);
      const { main } = await images.writeResponsive(buffer, baseDir, stem);
      const publicPath = path.relative(publicRoot, main).split(path.sep).join('/');
      sendJson(res, 200, { ok: true, path: publicPath });
      return;
    }

    const extension = inferExtension(filename, mime);
    const uniqueSuffix = Date.now().toString(36);
    const finalName = `${baseName || bucket}-${uniqueSuffix}${extension}`;
    const absolutePath = path.join(baseDir, finalName);
    fs.writeFileSync(absolutePath, buffer);

    // Not staged: the file is committed only if it is still there when the user publishes.
    const publicRelativePath = path
      .relative(publicRoot, absolutePath)
      .split(path.sep)
      .join('/');

    sendJson(res, 200, { ok: true, path: publicRelativePath });
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
  if (!Array.isArray(payload.entries)) {
    const err = new Error('Payload must include an entries array');
    err.statusCode = 400;
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  const denied = guard.check(req);
  if (denied) {
    sendJson(res, denied.status, { ok: false, error: denied.error });
    return;
  }

  if (handleStatic(req, res, pathname)) {
    return;
  }

  if (pathname === '/api/gallery' && req.method === 'GET') {
    try {
      const content = fs.readFileSync(dataPath, 'utf-8');
      sendJson(res, 200, JSON.parse(content));
    } catch (err) {
      sendJson(res, 500, { ok: false, error: 'Failed to read gallery.json' });
    }
    return;
  }

  if (pathname === '/api/gallery' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      validatePayload(payload);
      const formatted = JSON.stringify(payload, null, 2);
      fs.writeFileSync(dataPath, `${formatted}\n`, 'utf-8');
      sendJson(res, 200, { ok: true });
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

  if (pathname === '/api/publish/preview' && req.method === 'GET') {
    try {
      const result = publisher.preview({ repoRoot, scope: PUBLISH_SCOPE, credentials: getCredentials() });
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/publish' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      const result = publisher.publish({
        repoRoot,
        scope: PUBLISH_SCOPE,
        credentials: getCredentials(),
        confirmed: payload.files,
        message: `Update gallery via admin tool (${new Date().toISOString()})`,
      });
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { ok: false, error: err.message });
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Gallery admin running on http://${HOST}:${PORT}`);
  console.log(`Session token (already in the page it serves): ${guard.token}`);
});
