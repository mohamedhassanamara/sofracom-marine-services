import { useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { errorMessage } from '../../lib/apiClient';
import Seo from '../Seo';
import ResponsiveImage from '../ui/ResponsiveImage';

// Sign-in, sign-up, reset: a centred, minimal form; on desktop the marina photo fills the
// other half.
export function AuthCard({ title, subtitle, children }) {
    return (
        <div className="mx-auto grid max-w-wide gap-10 px-4 py-10 sm:px-6 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-2 lg:items-stretch lg:gap-16 lg:py-12">
            <Seo title={title} noindex />
            <div className="flex items-center justify-center">
                <div className="w-full max-w-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">SOFRACOM</p>
                    <h1 className="mt-3 text-[2rem] font-semibold leading-tight text-ink">{title}</h1>
                    {subtitle && <p className="mt-3 text-ink-muted">{subtitle}</p>}
                    <div className="mt-8">{children}</div>
                </div>
            </div>
            <div className="relative hidden overflow-hidden rounded-2xl bg-navy-50 lg:block">
                <ResponsiveImage src="/assets/site/home-hero-800.webp" alt="" sizes="50vw" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/50 to-transparent" />
            </div>
        </div>
    );
}

export function GoogleButton({ onSignedIn, onError }) {
    const { t } = useLang();
    const { signInWithGoogle } = useAuth();
    const [busy, setBusy] = useState(false);

    const handleClick = async () => {
        setBusy(true);
        try {
            const user = await signInWithGoogle();
            onSignedIn(user);
        } catch (error) {
            if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
                onError(errorMessage(t, error));
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--block google-btn" onClick={handleClick} disabled={busy}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {t('auth.google')}
        </button>
    );
}
