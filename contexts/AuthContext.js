import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from './LangContext';
import { ApiError, apiRequest } from '../lib/apiClient';
import { parseIdentifier, publicEmail } from '../lib/identity';

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

export function AuthProvider({ children }) {
    const { lang, setLang } = useLang();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const firebaseRef = useRef(null);

    const getFirebase = useCallback(async () => {
        if (!firebaseRef.current) firebaseRef.current = await loadFirebase();
        return firebaseRef.current;
    }, []);

    const loadProfile = useCallback(async currentUser => {
        if (!currentUser) {
            setProfile(null);
            return null;
        }
        try {
            const result = await apiRequest('/api/account/profile', { user: currentUser });
            setProfile(result.profile);
            // Apply the saved language once per session; the header picker still wins after that.
            const langKey = `sofracom.profileLang.v1:${currentUser.uid}`;
            if (result.profile?.exists && typeof window !== 'undefined' && !window.sessionStorage.getItem(langKey)) {
                window.sessionStorage.setItem(langKey, '1');
                setLang(result.profile.lang);
            }
            return result.profile;
        } catch (error) {
            console.warn('[auth] profile load failed', error);
            return null;
        }
    }, [setLang]);

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

    useEffect(() => {
        let unsubscribe = () => {};
        let cancelled = false;
        getFirebase()
            .then(({ auth, fb }) => {
                if (cancelled) return;
                unsubscribe = fb.onIdTokenChanged(auth, async currentUser => {
                    setUser(currentUser);
                    if (!currentUser) {
                        setProfile(null);
                        setLoading(false);
                        return;
                    }
                    // Pages can render as soon as we know who is signed in; linking guest
                    // history and loading the profile continue in the background.
                    setLoading(false);
                    linkGuestHistory(currentUser).finally(() => loadProfile(currentUser));
                });
            })
            .catch(error => {
                console.error('[auth] failed to initialise Firebase', error);
                setLoading(false);
            });
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [getFirebase, linkGuestHistory, loadProfile]);

    // Firebase emails (verification, password reset) follow the site language.
    useEffect(() => {
        if (firebaseRef.current) firebaseRef.current.auth.languageCode = lang;
    }, [lang, user]);

    const actionSettings = () =>
        typeof window === 'undefined'
            ? undefined
            : { url: `${window.location.origin}/account`, handleCodeInApp: false };

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
        const credential = await fb.signInWithPopup(auth, provider);
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
