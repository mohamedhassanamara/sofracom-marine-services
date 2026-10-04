import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthCard, GoogleButton } from '../../components/account/AuthCard';
import { afterAuthPath } from '../../lib/redirect';
import { errorMessage } from '../../lib/apiClient';

export default function LoginPage() {
    const { t } = useLang();
    const { user, loading, signIn } = useAuth();
    const router = useRouter();
    const next = afterAuthPath(router.query.next);
    const [form, setForm] = useState({ identifier: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);

    // Already signed in: go where they were heading (or /account).
    useEffect(() => {
        if (router.isReady && !loading && user && !submitting.current) router.replace(next);
    }, [router, loading, user, next]);

    const handleSubmit = async event => {
        event.preventDefault();
        if (!form.identifier.trim() || !form.password) {
            setError(t('auth.errorRequired'));
            return;
        }
        setBusy(true);
        setError('');
        submitting.current = true;
        try {
            await signIn(form.identifier, form.password);
            router.replace(next);
        } catch (err) {
            submitting.current = false;
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
                        <span>{t('auth.identifier')}</span>
                        <input
                            autoComplete="username"
                            inputMode="email"
                            dir="ltr"
                            value={form.identifier}
                            onChange={event => setForm({ ...form, identifier: event.target.value })}
                            required
                        />
                        <span className="ui-field-hint">{t('auth.identifierHint')}</span>
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
