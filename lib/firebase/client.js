// Firebase client SDK (browser only). Auth is used for sign-in; Firestore only for
// reading the signed-in user's own data, which the security rules allow.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (useEmulators ? 'demo-key' : undefined),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: useEmulators ? 'demo-sofracom' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let auth = null;
let db = null;

const getClientApp = () => (getApps().length ? getApp() : initializeApp(config));

export function getClientAuth() {
    if (auth) return auth;
    auth = getAuth(getClientApp());
    if (useEmulators) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
    return auth;
}

export function getClientDb() {
    if (db) return db;
    db = getFirestore(getClientApp());
    if (useEmulators) {
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    return db;
}
