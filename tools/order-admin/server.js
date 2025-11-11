const http = require('http');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 5174);
const repoRoot = path.resolve(__dirname, '../..');
const DEFAULT_SERVICE_ACCOUNT = path.join(
  repoRoot,
  'sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json'
);

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
};

const staticFiles = new Map([
  ['/', path.join(__dirname, 'index.html')],
  ['/app.js', path.join(__dirname, 'app.js')],
  ['/styles.css', path.join(__dirname, 'styles.css')],
]);

const siteFileTargets = new Set([
  '/index.html',
  '/script.js',
  '/styles.css',
  '/favicon.ico',
  '/product.html',
  '/products.html',
]);

const VALID_STATUSES = ['new', 'waiting', 'in_progress', 'treated', 'declined'];

function loadServiceAccountJsonFromFile() {
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidate = envPath
    ? path.isAbsolute(envPath)
      ? envPath
      : path.join(repoRoot, envPath)
    : DEFAULT_SERVICE_ACCOUNT;
  if (!fs.existsSync(candidate)) {
    return null;
  }
  const raw = fs.readFileSync(candidate, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.private_key || !parsed.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
      console.warn('[order-admin] service account JSON missing a valid private_key');
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[order-admin] failed to parse service account JSON', err.message);
    return null;
  }
}

function buildServiceAccountFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.warn('[order-admin] FIREBASE_PRIVATE_KEY looks malformed');
    return null;
  }
  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

function getFirebaseApp() {
  if (admin.apps.length) return admin.app();
  const envAccount = buildServiceAccountFromEnv();
  if (envAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(envAccount),
    });
  }
  const fileAccount = loadServiceAccountJsonFromFile();
  if (fileAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(fileAccount),
    });
  }
  throw new Error(
    'Missing valid Firebase credentials; make sure the service account JSON includes a private key'
  );
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Unable to load asset');
      return;
    }
    const ext = path.extname(filePath);
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res, pathname) {
  const filePath = staticFiles.get(pathname);
  if (filePath) {
    sendFile(res, filePath);
    return true;
  }

  if (pathname.startsWith('/assets/')) {
    const assetRoot = path.join(repoRoot, 'public', 'assets');
    const normalized = path.normalize(path.join(repoRoot, pathname));
    if (!normalized.startsWith(assetRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return true;
    }
    sendFile(res, normalized);
    return true;
  }

  if (siteFileTargets.has(pathname)) {
    const target = path.join(repoRoot, pathname);
    sendFile(res, target);
    return true;
  }

  return false;
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
      if (data.length > 4 * 1024 * 1024) {
        const err = new Error('Payload too large');
        err.statusCode = 413;
        reject(err);
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        const parseErr = new Error('Invalid JSON payload');
        parseErr.statusCode = 400;
        reject(parseErr);
      }
    });
    req.on('error', reject);
  });
}

async function handleOrdersGet(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limitParam = Number.parseInt(url.searchParams.get('limit'), 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 200;
    const firestore = getFirebaseApp().firestore();
    const snapshot = await firestore
      .collection('orders')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    sendJson(res, 200, { ok: true, orders });
  } catch (err) {
    console.error('[order-admin] fetch failed', err);
    sendJson(res, 500, { ok: false, error: err.message || 'Unable to fetch orders' });
  }
}

async function handleQuotesGet(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limitParam = Number.parseInt(url.searchParams.get('limit'), 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 200;
    const firestore = getFirebaseApp().firestore();
    const snapshot = await firestore
      .collection('quotes')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sendJson(res, 200, { ok: true, quotes });
  } catch (err) {
    console.error('[order-admin] fetch quotes failed', err);
    sendJson(res, 500, { ok: false, error: err.message || 'Unable to fetch quotes' });
  }
}

async function handleQuotesPost(req, res) {
  try {
    const payload = await parseBody(req);
    const quoteId = String(payload.quoteId || '').trim();
    const status = String(payload.status || 'treated').trim().toLowerCase();

    if (!quoteId) {
      sendJson(res, 400, { ok: false, error: 'quoteId is required' });
      return;
    }

    if (!VALID_STATUSES.includes(status)) {
      sendJson(res, 400, { ok: false, error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const firestore = getFirebaseApp().firestore();
    const docRef = firestore.collection('quotes').doc(quoteId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      sendJson(res, 404, { ok: false, error: 'Quote not found' });
      return;
    }

    await docRef.update({
      status,
      status_updated_at: new Date().toISOString(),
    });

    sendJson(res, 200, { ok: true, status });
  } catch (err) {
    console.error('[order-admin] update quote failed', err);
    const statusCode = err.statusCode || 500;
    sendJson(res, statusCode, { ok: false, error: err.message || 'Unable to update quote' });
  }
}

async function handleOrdersPost(req, res) {
  try {
    const payload = await parseBody(req);
    const orderId = String(payload.orderId || '').trim();
    const status = String(payload.status || '').trim().toLowerCase();

    if (!orderId) {
      sendJson(res, 400, { ok: false, error: 'orderId is required' });
      return;
    }

    if (!VALID_STATUSES.includes(status)) {
      sendJson(res, 400, { ok: false, error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      return;
    }

    const firestore = getFirebaseApp().firestore();
    const docRef = firestore.collection('orders').doc(orderId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      sendJson(res, 404, { ok: false, error: 'Order not found' });
      return;
    }

    await docRef.update({
      status,
      status_updated_at: new Date().toISOString(),
    });

    sendJson(res, 200, { ok: true, status });
  } catch (err) {
    console.error('[order-admin] update failed', err);
    const statusCode = err.statusCode || 500;
    sendJson(res, statusCode, { ok: false, error: err.message || 'Unable to update order' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (serveStatic(req, res, pathname)) return;

  if (pathname === '/api/orders' && req.method === 'GET') {
    await handleOrdersGet(req, res);
    return;
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    await handleOrdersPost(req, res);
    return;
  }

  if (pathname === '/api/quotes' && req.method === 'GET') {
    await handleQuotesGet(req, res);
    return;
  }

  if (pathname === '/api/quotes' && req.method === 'POST') {
    await handleQuotesPost(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Order admin running on http://${HOST}:${PORT}`);
});
