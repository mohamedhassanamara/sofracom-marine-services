import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from './LangContext';
import { apiRequest } from '../lib/apiClient';

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
    const [claims, setClaims] = useState({});
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
                        setClaims({});
                        setProfile(null);
                        setLoading(false);
                        return;
                    }
                    const token = await currentUser.getIdTokenResult();
                    setClaims(token.claims || {});
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

    const signIn = useCallback(
        async (email, password) => {
            const { auth, fb } = await getFirebase();
            const credential = await fb.signInWithEmailAndPassword(auth, email.trim(), password);
            return credential.user;
        },
        [getFirebase]
    );

    const signUp = useCallback(
        async ({ name, email, password }) => {
            const { auth, fb } = await getFirebase();
            auth.languageCode = lang;
            const credential = await fb.createUserWithEmailAndPassword(auth, email.trim(), password);
            await fb.updateProfile(credential.user, { displayName: name.trim() });
            await apiRequest('/api/account/profile', {
                method: 'PUT',
                body: { name: name.trim(), lang },
                user: credential.user,
            });
            try {
                await fb.sendEmailVerification(credential.user, actionSettings());
            } catch (error) {
                console.warn('[auth] verification email failed', error);
            }
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

    const resetPassword = useCallback(
        async email => {
            const { auth, fb } = await getFirebase();
            auth.languageCode = lang;
            await fb.sendPasswordResetEmail(auth, email.trim(), actionSettings());
        },
        [getFirebase, lang]
    );

    const resendVerification = useCallback(async () => {
        const { auth, fb } = await getFirebase();
        if (!auth.currentUser) return;
        auth.languageCode = lang;
        await fb.sendEmailVerification(auth.currentUser, actionSettings());
    }, [getFirebase, lang]);

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
            profile,
            loading,
            isAdmin: claims.admin === true,
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
        [user, profile, loading, claims, signIn, signUp, signInWithGoogle, signOut, resetPassword, resendVerification, refreshUser, loadProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
