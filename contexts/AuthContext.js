import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from './LangContext';
import { ApiError, apiRequest } from '../lib/apiClient';
import { parseIdentifier, publicEmail } from '../lib/identity';
import { localePath } from '../lib/i18n/locales';

// Optional customer accounts (Firebase Auth). Firebase is loaded lazily in the
// browser so pages render without it; guests never need to sign in.
const AuthContext = createContext(null);

const loadFirebase = async () => {
    const [{ getClientAuth }, authModule] = await Promise.all([
        import('../lib/firebase/client'),
        import('firebase/auth'),
    ]);
    return { auth: getClientAuth(), fb: authModule };
};

const LINKED_KEY = 'sofracom.linked.v1';
// Set while someone is signed in on this browser: only then is Firebase loaded on page load.
const SIGNED_IN_HINT = 'sofracom.signedIn.v1';
const AUTH_PAGES = /^\/(account|checkout)(\/|$)/;

const readHint = () => {
    try {
        return window.localStorage.getItem(SIGNED_IN_HINT) === '1';
    } catch {
        return false;
    }
};
const writeHint = signedIn => {
    try {
        if (signedIn) window.localStorage.setItem(SIGNED_IN_HINT, '1');
        else window.localStorage.removeItem(SIGNED_IN_HINT);
    } catch {
        // storage unavailable
    }
};
// Firebase keeps sessions in this IndexedDB database (also covers sessions from before the hint).
const hasFirebaseSession = async () => {
    try {
        if (!window.indexedDB?.databases) return false;
        return (await window.indexedDB.databases()).some(db => db.name === 'firebaseLocalStorageDb');
    } catch {
        return false;
    }
};

export function AuthProvider({ children }) {
    const { lang } = useLang();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const firebaseRef = useRef(null);
    const loadingRef = useRef(null);
    const unsubscribeRef = useRef(() => {});
    const onAuthChange = useRef(null);

    const loadProfile = useCallback(async currentUser => {
        if (!currentUser) {
            setProfile(null);
            return null;
        }
        try {
            const result = await apiRequest('/api/account/profile', { user: currentUser });
            // The page language comes from the URL; profile.lang is only the account's
            // preferred language (Firebase emails, staff contact) and never switches the page.
            setProfile(result.profile);
            return result.profile;
        } catch (error) {
            console.warn('[auth] profile load failed', error);
            return null;
        }
    }, []);

    // Attach earlier guest orders/quotes to this account once the email is verified.
    const linkGuestHistory = useCallback(async currentUser => {
        if (!currentUser?.emailVerified || typeof window === 'undefined') return;
        try {
            const key = `${LINKED_KEY}:${currentUser.uid}`;
            if (window.sessionStorage.getItem(key)) return;
            await apiRequest('/api/account/link', { method: 'POST', body: {}, user: currentUser });
            window.sessionStorage.setItem(key, '1');
        } catch (error) {
            console.warn('[auth] linking guest history failed', error);
        }
    }, []);

    onAuthChange.current = currentUser => {
        setUser(currentUser);
        writeHint(Boolean(currentUser));
        if (!currentUser) {
            setProfile(null);
            setLoading(false);
            return;
        }
        // Pages can render as soon as we know who is signed in; linking guest
        // history and loading the profile continue in the background.
        setLoading(false);
        linkGuestHistory(currentUser).finally(() => loadProfile(currentUser));
    };

    // Loads the Firebase Auth SDK once (about 170 KB) and starts listening to the session.
    const getFirebase = useCallback(() => {
        if (!loadingRef.current) {
            loadingRef.current = loadFirebase().then(firebase => {
                firebaseRef.current = firebase;
                unsubscribeRef.current = firebase.fb.onIdTokenChanged(firebase.auth, currentUser => onAuthChange.current(currentUser));
                return firebase;
            });
            loadingRef.current.catch(() => {
                loadingRef.current = null;
            });
        }
        return loadingRef.current;
    }, []);

    // Guests never download Firebase: it starts on page load only when this browser has a
    // session (or on account/checkout pages); otherwise on first use (e.g. the sign-in page).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const needed = readHint() || AUTH_PAGES.test(window.location.pathname.replace(/^\/(fr|ar)(?=\/|$)/, '')) || (await hasFirebaseSession());
            if (cancelled) return;
            if (!needed) {
                setLoading(false);
                return;
            }
            getFirebase().catch(error => {
                console.error('[auth] failed to initialise Firebase', error);
                setLoading(false);
            });
        })();
        return () => {
            cancelled = true;
            unsubscribeRef.current();
        };
    }, [getFirebase]);

    // Firebase emails (verification, password reset) follow the site language.
    useEffect(() => {
        if (firebaseRef.current) firebaseRef.current.auth.languageCode = lang;
    }, [lang, user]);

    const actionSettings = () =>
        typeof window === 'undefined'
            ? undefined
            : { url: `${window.location.origin}${localePath('/account', lang)}`, handleCodeInApp: false };

    // `identifier` is an email address or a phone number (phone accounts sign in with
    // their synthetic auth email, which is derived here and never displayed).
    const signIn = useCallback(
        async (identifier, password) => {
            const parsed = parseIdentifier(identifier);
            if (parsed.type === 'invalid') throw new ApiError('Invalid identifier', { code: `identity/invalid-${parsed.reason}` });
            const { auth, fb } = await getFirebase();
            const credential = await fb.signInWithEmailAndPassword(auth, parsed.authEmail, password);
            return credential.user;
        },
        [getFirebase]
    );

    // Accounts are created by the server, which enforces one account per phone/email.
    // No verification email: it is optional, from the profile page.
    const signUp = useCallback(
        async ({ name, identifier, password }) => {
            const parsed = parseIdentifier(identifier);
            if (parsed.type === 'invalid') throw new ApiError('Invalid identifier', { code: `identity/invalid-${parsed.reason}` });
            await apiRequest('/api/account/register', {
                method: 'POST',
                body: { name: name.trim(), identifier, password, lang },
            });
            const { auth, fb } = await getFirebase();
            const credential = await fb.signInWithEmailAndPassword(auth, parsed.authEmail, password);
            await loadProfile(credential.user);
            return credential.user;
        },
        [getFirebase, lang, loadProfile]
    );

    const signInWithGoogle = useCallback(async () => {
        const { auth, fb } = await getFirebase();
        const provider = new fb.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const credential = await fb.signInWithPopup(auth, provider, fb.browserPopupRedirectResolver);
        return credential.user;
    }, [getFirebase]);

    const signOut = useCallback(async () => {
        const { auth, fb } = await getFirebase();
        await fb.signOut(auth);
    }, [getFirebase]);

    // Email accounts get Firebase's reset link. Phone accounts have no mailbox: the
    // reset page tells them to contact the shop, and staff set a temporary password.
    const resetPassword = useCallback(
        async identifier => {
            const parsed = parseIdentifier(identifier);
            if (parsed.type === 'phone') throw new ApiError('Phone account', { code: 'identity/phone-reset' });
            if (parsed.type === 'invalid') throw new ApiError('Invalid identifier', { code: `identity/invalid-${parsed.reason}` });
            const { auth, fb } = await getFirebase();
            auth.languageCode = lang;
            await fb.sendPasswordResetEmail(auth, parsed.email, actionSettings());
        },
        [getFirebase, lang]
    );

    const resendVerification = useCallback(async () => {
        const { auth, fb } = await getFirebase();
        if (!auth.currentUser || !publicEmail(auth.currentUser.email)) return;
        auth.languageCode = lang;
        await fb.sendEmailVerification(auth.currentUser, actionSettings());
    }, [getFirebase, lang]);

    // Replaces a temporary password set by staff (the user has just signed in with it).
    const changePassword = useCallback(
        async newPassword => {
            const { auth, fb } = await getFirebase();
            if (!auth.currentUser) throw new ApiError('Not signed in', { code: 'auth/required' });
            await fb.updatePassword(auth.currentUser, newPassword);
            // Changing the password revokes earlier ID tokens; use a fresh one.
            await auth.currentUser.getIdToken(true);
            await apiRequest('/api/account/password-changed', { method: 'POST', body: {}, user: auth.currentUser });
            await loadProfile(auth.currentUser);
        },
        [getFirebase, loadProfile]
    );

    // After the user clicks the verification link elsewhere, refresh the token so the
    // server sees email_verified=true, then link guest history.
    const refreshUser = useCallback(async () => {
        const { auth } = await getFirebase();
        if (!auth.currentUser) return null;
        await auth.currentUser.reload();
        await auth.currentUser.getIdToken(true);
        const refreshed = auth.currentUser;
        setUser(refreshed);
        await linkGuestHistory(refreshed);
        return refreshed;
    }, [getFirebase, linkGuestHistory]);

    const value = useMemo(
        () => ({
            user,
            // The real email of the account ('' for phone accounts); never user.email directly.
            email: publicEmail(user?.email),
            profile,
            loading,
            changePassword,
            signIn,
            signUp,
            signInWithGoogle,
            signOut,
            resetPassword,
            resendVerification,
            refreshUser,
            reloadProfile: () => loadProfile(user),
            setProfile,
        }),
        [user, profile, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword, resendVerification, refreshUser, loadProfile, changePassword]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
