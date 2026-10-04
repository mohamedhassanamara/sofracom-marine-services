import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthCard, GoogleButton } from '../../components/account/AuthCard';
import { safeNext } from '../../hooks/useRequireAuth';
import { errorMessage } from '../../lib/apiClient';

const MIN_PASSWORD = 8;

export default function SignupPage() {
    const { t } = useLang();
    const { user, loading, signUp } = useAuth();
    const router = useRouter();
    const next = safeNext(router.query.next) || '/account';
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const signingUp = useRef(false);

    // Already signed in (e.g. via Google): go straight on.
    useEffect(() => {
        if (!loading && user && !signingUp.current) router.replace(next);
    }, [loading, user, next, router]);

    const update = field => event => setForm({ ...form, [field]: event.target.value });

    const handleSubmit = async event => {
        event.preventDefault();
        if (form.name.trim().length < 2 || !form.email.trim() || !form.password) {
            setError(t('auth.errorRequired'));
            return;
        }
        if (form.password.length < MIN_PASSWORD) {
            setError(t('auth.passwordTooShort', { min: MIN_PASSWORD }));
            return;
        }
        setBusy(true);
        setError('');
        signingUp.current = true;
        try {
            await signUp(form);
            router.replace(`/account/verify?next=${encodeURIComponent(next)}`);
        } catch (err) {
            signingUp.current = false;
            setError(errorMessage(t, err));
            setBusy(false);
        }
    };

    const nextQuery = router.query.next ? `?next=${encodeURIComponent(next)}` : '';

    return (
        <AuthCard title={t('auth.signupTitle')} subtitle={t('auth.signupSubtitle')}>
            <div className="ui-form">
                <GoogleButton onSignedIn={() => router.replace(next)} onError={setError} />
                <div className="ui-divider">{t('auth.or')}</div>
                <form className="ui-form" onSubmit={handleSubmit} noValidate>
                    <label className="ui-field">
                        <span>{t('auth.name')}</span>
                        <input autoComplete="name" value={form.name} onChange={update('name')} maxLength={120} required />
                    </label>
                    <label className="ui-field">
                        <span>{t('auth.email')}</span>
                        <input type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
                    </label>
                    <label className="ui-field">
                        <span>{t('auth.password')}</span>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={update('password')}
                            minLength={MIN_PASSWORD}
                            required
                        />
                        <span className="ui-field-hint">{t('auth.passwordHint', { min: MIN_PASSWORD })}</span>
                    </label>
                    {error && <p className="ui-alert ui-alert--error" role="alert">{error}</p>}
                    <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={busy}>
                        {busy ? t('auth.creating') : t('auth.createAccount')}
                    </button>
                </form>
                <p className="ui-muted text-center">
                    {t('auth.haveAccount')}{' '}
                    <Link href={`/account/login${nextQuery}`} className="ui-link">
                        {t('auth.signIn')}
                    </Link>
                </p>
            </div>
        </AuthCard>
    );
}
