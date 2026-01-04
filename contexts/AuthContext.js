import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseClientAuth } from '../lib/firebaseClient';

const AuthContext = createContext({
    user: null,
    token: null,
    profile: null,
    loading: true,
    profileLoading: false,
    profileError: '',
    authError: '',
    isAuthenticated: false,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
    updateProfile: async () => {},
    refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => (typeof window !== 'undefined' ? getFirebaseClientAuth() : null));
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [authError, setAuthError] = useState('');
    const [ready, setReady] = useState(false);

    const fetchProfileData = useCallback(async idToken => {
        if (!idToken) {
            setProfile(null);
            setProfileError('');
            return null;
        }
        setProfileLoading(true);
        try {
            const response = await fetch('/api/profile', {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            });
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || 'Unable to load profile');
            }
            setProfile(payload.profile || null);
            setProfileError('');
            return payload.profile || null;
        } catch (err) {
            setProfileError(err.message || 'Unable to load profile');
            setProfile(null);
            return null;
        } finally {
            setProfileLoading(false);
        }
    }, []);

    const refreshProfile = useCallback(() => {
        if (!token) return Promise.resolve(null);
        return fetchProfileData(token);
    }, [token, fetchProfileData]);

    const ensureAuth = useCallback(() => {
        if (auth) return auth;
        if (typeof window === 'undefined') return null;
        const next = getFirebaseClientAuth();
        if (next) {
            setAuth(next);
        }
        return next;
    }, [auth]);

    const updateProfile = useCallback(
        async (payload, overrideToken) => {
            const activeToken = overrideToken || token;
            if (!activeToken) {
                throw new Error('Not authenticated');
            }
            setProfileLoading(true);
            try {
                const response = await fetch('/api/profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${activeToken}`,
                    },
                    body: JSON.stringify(payload),
                });
                const result = await response.json();
                if (!response.ok || !result.ok) {
                    throw new Error(result.error || 'Unable to update profile');
                }
                setProfile(result.profile || null);
                setProfileError('');
                return result.profile || null;
            } catch (err) {
                setProfileError(err.message || 'Unable to update profile');
                throw err;
            } finally {
                setProfileLoading(false);
            }
        },
        [token]
    );

    const signIn = useCallback(
        async (email, password) => {
            const currentAuth = ensureAuth();
            if (!currentAuth) {
                throw new Error('Authentication is initializing');
            }
            try {
                const credential = await signInWithEmailAndPassword(currentAuth, email, password);
                setAuthError('');
                return credential.user;
            } catch (err) {
                setAuthError(err.message || 'Unable to sign in');
                throw err;
            }
        },
        [ensureAuth]
    );

    const signUp = useCallback(
        async ({ email, password, name, phone }) => {
            const currentAuth = ensureAuth();
            if (!currentAuth) {
                throw new Error('Authentication is initializing');
            }
            try {
                const credential = await createUserWithEmailAndPassword(currentAuth, email, password);
                const idToken = await credential.user.getIdToken();
                if (name || phone) {
                    await updateProfile({ name, phone }, idToken);
                } else {
                    await fetchProfileData(idToken);
                }
                setAuthError('');
                return credential.user;
            } catch (err) {
                setAuthError(err.message || 'Unable to create account');
                throw err;
            }
        },
        [auth, updateProfile, fetchProfileData]
    );

    const signOut = useCallback(async () => {
        const currentAuth = ensureAuth();
        if (!currentAuth) {
            return;
        }
        await firebaseSignOut(currentAuth);
        setProfile(null);
        setProfileError('');
        setToken(null);
        setUser(null);
    }, [ensureAuth]);

    useEffect(() => {
        if (!auth && typeof window !== 'undefined') {
            setAuth(getFirebaseClientAuth());
        }
    }, [auth]);

    useEffect(() => {
        if (!auth) {
            setReady(true);
            return undefined;
        }

        const unsubscribe = onIdTokenChanged(auth, async nextUser => {
            if (!nextUser) {
                setUser(null);
                setToken(null);
                setProfile(null);
                setReady(true);
                return;
            }
            setUser(nextUser);
            try {
                const idToken = await nextUser.getIdToken();
                setToken(idToken);
                await fetchProfileData(idToken);
            } catch (err) {
                setProfileError(err.message || 'Unable to refresh profile');
            } finally {
                setReady(true);
            }
        });
        return () => unsubscribe();
    }, [auth, fetchProfileData]);

    const value = useMemo(
        () => ({
            user,
            token,
            profile,
            loading: !ready,
            profileLoading,
            profileError,
            authError,
            isAuthenticated: Boolean(user),
            signIn,
            signUp,
            signOut,
            updateProfile,
            refreshProfile,
        }),
        [
            user,
            token,
            profile,
            ready,
            profileLoading,
            profileError,
            authError,
            signIn,
            signUp,
            signOut,
            updateProfile,
            refreshProfile,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
