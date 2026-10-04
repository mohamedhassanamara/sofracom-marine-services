// Firebase Admin SDK bootstrap shared by API routes and scripts (CommonJS so plain
// Node scripts can require it). When the emulator env vars are set, it connects to
// the local Emulator Suite and never needs production credentials.
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(process.cwd());
const DEFAULT_SERVICE_ACCOUNT = path.join(
    repoRoot,
    'sofracom-firebase-adminsdk-fbsvc-94ea761cbb.json'
);

const usingEmulators = () =>
    Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

function loadFromBase64() {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!b64) return null;
    try {
        return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch (err) {
        console.warn('[firebase-admin] unable to parse FIREBASE_SERVICE_ACCOUNT_BASE64', err.message);
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
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (!parsed.private_key || !parsed.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
            console.warn('[firebase-admin] service account JSON missing private_key');
            return null;
        }
        return parsed;
    } catch (err) {
        console.warn('[firebase-admin] failed to parse service account JSON', err.message);
        return null;
    }
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
    if (usingEmulators()) {
        // demo-* projects can never reach production, even if an emulator is missing.
        const projectId = process.env.GCLOUD_PROJECT || 'demo-sofracom';
        return admin.initializeApp({ projectId });
    }
    const credentials =
        loadFromEnv() ||
        loadFromBase64() ||
        loadFromCustomPath() ||
        loadServiceAccountFromPath(DEFAULT_SERVICE_ACCOUNT);
    if (credentials) {
        return admin.initializeApp({ credential: admin.credential.cert(credentials) });
    }
    throw new Error(
        'Missing Firebase credentials. Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or a valid service account JSON.'
    );
}

const getDb = () => getFirebaseApp().firestore();
const getAuth = () => getFirebaseApp().auth();

module.exports = { admin, getFirebaseApp, getDb, getAuth, usingEmulators };
