import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthCard } from '../../components/account/AuthCard';
import { safeNext } from '../../hooks/useRequireAuth';
import { errorMessage } from '../../lib/apiClient';

export default function ResetPasswordPage() {
    const { t } = useLang();
    const { resetPassword } = useAuth();
    const router = useRouter();
    const next = safeNext(router.query.next);
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async event => {
        event.preventDefault();
        if (!email.trim()) {
            setError(t('auth.errorRequired'));
            return;
        }
        setBusy(true);
        setError('');
        try {
            await resetPassword(email);
            setSent(true);
        } catch (err) {
            // Don't reveal whether an account exists for this email.
            if (err?.code === 'auth/user-not-found') {
                setSent(true);
            } else {
                setError(errorMessage(t, err));
            }
        } finally {
            setBusy(false);
        }
    };

    const loginHref = next ? `/account/login?next=${encodeURIComponent(next)}` : '/account/login';

    return (
        <AuthCard title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
            {sent ? (
                <div className="ui-form">
                    <p className="ui-alert ui-alert--success" role="status">
                        {t('auth.resetSent', { email: email.trim() })}
                    </p>
                    <Link href={loginHref} className="ui-btn ui-btn--primary ui-btn--block">
                        {t('auth.backToLogin')}
                    </Link>
                </div>
            ) : (
                <form className="ui-form" onSubmit={handleSubmit} noValidate>
                    <label className="ui-field">
                        <span>{t('auth.email')}</span>
                        <input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            required
                        />
                    </label>
                    {error && <p className="ui-alert ui-alert--error" role="alert">{error}</p>}
                    <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={busy}>
                        {busy ? t('auth.sending') : t('auth.sendResetLink')}
                    </button>
                    <p className="ui-muted text-center">
                        <Link href={loginHref} className="ui-link">
                            {t('auth.backToLogin')}
                        </Link>
                    </p>
                </form>
            )}
        </AuthCard>
    );
}
