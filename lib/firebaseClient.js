import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseClientConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};

const hasClientConfig = () =>
    Boolean(firebaseClientConfig.apiKey && firebaseClientConfig.authDomain && firebaseClientConfig.projectId);

export function getFirebaseClientApp() {
    if (typeof window === 'undefined' || !hasClientConfig()) return null;
    if (getApps().length) {
        return getApp();
    }
    return initializeApp(firebaseClientConfig);
}

export function getFirebaseClientAuth() {
    const app = getFirebaseClientApp();
    if (!app) return null;
    return getAuth(app);
}

export function getFirebaseClientConfig() {
    return firebaseClientConfig;
}
