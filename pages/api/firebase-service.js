const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(process.cwd());
const DEFAULT_SERVICE_ACCOUNT = path.join(
  repoRoot,
  'sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json'
);

function loadFromBase64() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) return null;
  try {
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    console.warn('[firebase-service] unable to parse FIREBASE_SERVICE_ACCOUNT_BASE64', err.message);
    return null;
  }
}

function loadFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  privateKey = privateKey.replace(/\\n/g, '\n');
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) return null;
  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

function loadServiceAccountFromPath(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.private_key || !parsed.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
      console.warn('[firebase-service] service account JSON missing private_key');
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[firebase-service] failed to parse service account JSON', err.message);
    return null;
  }
}

function loadFromJsonFile() {
  return loadServiceAccountFromPath(DEFAULT_SERVICE_ACCOUNT);
}

function loadFromCustomPath() {
  const relativePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!relativePath) return null;
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(repoRoot, relativePath);
  return loadServiceAccountFromPath(absolutePath);
}

function getFirebaseApp() {
  if (admin.apps.length) return admin.app();
  const fromEnv = loadFromEnv();
  if (fromEnv) {
    return admin.initializeApp({ credential: admin.credential.cert(fromEnv) });
  }
  const fromBase64 = loadFromBase64();
  if (fromBase64) {
    return admin.initializeApp({ credential: admin.credential.cert(fromBase64) });
  }
  const fromCustomPath = loadFromCustomPath();
  if (fromCustomPath) {
    return admin.initializeApp({ credential: admin.credential.cert(fromCustomPath) });
  }
  const fromFile = loadFromJsonFile();
  if (fromFile) {
    return admin.initializeApp({ credential: admin.credential.cert(fromFile) });
  }
  throw new Error(
    'Missing Firebase credentials. Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or a valid service account JSON.'
  );
}

module.exports = { getFirebaseApp };
