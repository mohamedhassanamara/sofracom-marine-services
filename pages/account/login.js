import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthCard, GoogleButton } from '../../components/account/AuthCard';
import { safeNext } from '../../hooks/useRequireAuth';
import { errorMessage } from '../../lib/apiClient';

export default function LoginPage() {
    const { t } = useLang();
    const { user, loading, signIn } = useAuth();
    const router = useRouter();
    const next = safeNext(router.query.next) || '/account';
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!loading && user) router.replace(next);
    }, [loading, user, next, router]);

    const handleSubmit = async event => {
        event.preventDefault();
        if (!form.email.trim() || !form.password) {
            setError(t('auth.errorRequired'));
            return;
        }
        setBusy(true);
        setError('');
        try {
            await signIn(form.email, form.password);
            router.replace(next);
        } catch (err) {
            setError(errorMessage(t, err));
            setBusy(false);
        }
    };

    const nextQuery = router.query.next ? `?next=${encodeURIComponent(next)}` : '';

    return (
        <AuthCard title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
            <div className="ui-form">
                <GoogleButton onSignedIn={() => router.replace(next)} onError={setError} />
                <div className="ui-divider">{t('auth.or')}</div>
                <form className="ui-form" onSubmit={handleSubmit} noValidate>
                    <label className="ui-field">
                        <span>{t('auth.email')}</span>
                        <input
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={event => setForm({ ...form, email: event.target.value })}
                            required
                        />
                    </label>
                    <label className="ui-field">
                        <span>{t('auth.password')}</span>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={event => setForm({ ...form, password: event.target.value })}
                            required
                        />
                    </label>
                    <div className="text-sm" style={{ textAlign: 'end' }}>
                        <Link href={`/account/reset${nextQuery}`} className="ui-link">
                            {t('auth.forgot')}
                        </Link>
                    </div>
                    {error && <p className="ui-alert ui-alert--error" role="alert">{error}</p>}
                    <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={busy}>
                        {busy ? t('auth.signingIn') : t('auth.signIn')}
                    </button>
                </form>
                <p className="ui-muted text-center">
                    {t('auth.noAccount')}{' '}
                    <Link href={`/account/signup${nextQuery}`} className="ui-link">
                        {t('auth.createAccount')}
                    </Link>
                </p>
            </div>
        </AuthCard>
    );
}
