import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export { safeNext } from '../lib/redirect';

// Sends signed-out visitors to the login page, remembering where they were going.
export default function useRequireAuth() {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (auth.loading || auth.user || !router.isReady) return;
        router.replace(`/account/login?next=${encodeURIComponent(router.asPath)}`);
    }, [auth.loading, auth.user, router]);

    return auth;
}
