// Firebase Admin SDK bootstrap shared by API routes and scripts (CommonJS so plain
// Node scripts can require it). When the emulator env vars are set, it connects to
// the local Emulator Suite and never needs production credentials.
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Environment UIs mangle PEM keys in many ways: literal "\n" (sometimes double-escaped
// "\\n"), Windows line endings, line breaks turned into spaces, or the value pasted as a
// JSON fragment ("private_key": "…",). Extract the base64 body between the PEM markers,
// whatever surrounds it, and rebuild a clean PEM with 64-character lines.
const PEM_BEGIN = '-----BEGIN PRIVATE KEY-----';
const PEM_END = '-----END PRIVATE KEY-----';

function normalizePrivateKey(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const text = value.replace(/\\+[nr]/g, '\n').replace(/\r/g, '');
    const start = text.indexOf(PEM_BEGIN);
    const end = text.indexOf(PEM_END);
    if (start === -1 || end === -1 || end < start) return text.trim();
    const body = text.slice(start + PEM_BEGIN.length, end).replace(/[^A-Za-z0-9+/=]/g, '');
    const lines = body.match(/.{1,64}/g) || [];
    return `${PEM_BEGIN}\n${lines.join('\n')}\n${PEM_END}\n`;
}

// Returns null when the key is usable, otherwise a short reason (never key material).
function privateKeyProblem(pem) {
    if (!pem.includes(PEM_BEGIN) || !pem.includes(PEM_END)) return 'missing BEGIN/END PRIVATE KEY markers';
    try {
        crypto.createPrivateKey(pem);
        return null;
    } catch (err) {
        const bodyLength = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '').length;
        return `${err.code || err.message} (base64 body length ${bodyLength}; a valid 2048-bit key is about 1620)`;
    }
}

const cleanEnv = value => (typeof value === 'string' ? value.trim().replace(/^["']|["']$/g, '') : '');

function loadFromEnv() {
    const projectId = cleanEnv(process.env.FIREBASE_PROJECT_ID);
    const clientEmail = cleanEnv(process.env.FIREBASE_CLIENT_EMAIL);
    const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    if (!projectId && !clientEmail && !process.env.FIREBASE_PRIVATE_KEY) return null;
    const keyProblem = privateKeyProblem(privateKey);
    const missing = [
        !projectId && 'FIREBASE_PROJECT_ID',
        !clientEmail && 'FIREBASE_CLIENT_EMAIL',
        keyProblem && `FIREBASE_PRIVATE_KEY is not a usable key: ${keyProblem}`,
    ].filter(Boolean);
    if (missing.length) {
        // Partially configured env vars are a deployment mistake; say which one.
        console.error(`[firebase-admin] incomplete credentials in env: ${missing.join(', ')}`);
        return null;
    }
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
    const sources = [
        ['env', loadFromEnv],
        ['base64', loadFromBase64],
        ['path', loadFromCustomPath],
        ['file', () => loadServiceAccountFromPath(DEFAULT_SERVICE_ACCOUNT)],
    ];
    for (const [source, load] of sources) {
        const credentials = load();
        if (!credentials) continue;
        if (credentials.private_key) credentials.private_key = normalizePrivateKey(credentials.private_key);
        const problem = privateKeyProblem(credentials.private_key || '');
        if (problem) {
            console.error(`[firebase-admin] ${source} credentials skipped: private key is not usable: ${problem}`);
            continue;
        }
        // No secrets logged: which source and which service account are enough to debug.
        console.info(
            `[firebase-admin] using ${source} credentials for ${credentials.client_email} (project ${credentials.project_id})`
        );
        return admin.initializeApp({ credential: admin.credential.cert(credentials) });
    }
    throw new Error(
        'Missing Firebase credentials. Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or a valid service account JSON.'
    );
}

const getDb = () => getFirebaseApp().firestore();
const getAuth = () => getFirebaseApp().auth();

module.exports = { admin, getFirebaseApp, getDb, getAuth, usingEmulators, normalizePrivateKey, privateKeyProblem };
