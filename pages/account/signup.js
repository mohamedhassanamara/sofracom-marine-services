import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthCard, GoogleButton } from '../../components/account/AuthCard';
import { afterAuthPath } from '../../lib/redirect';
import { parseIdentifier } from '../../lib/identity';
import { errorMessage } from '../../lib/apiClient';

const MIN_PASSWORD = 8;

export default function SignupPage() {
    const { t } = useLang();
    const { user, loading, signUp } = useAuth();
    const router = useRouter();
    const next = afterAuthPath(router.query.next);
    const [form, setForm] = useState({ name: '', identifier: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);

    // Already signed in: go where they were heading (or /account).
    useEffect(() => {
        if (router.isReady && !loading && user && !submitting.current) router.replace(next);
    }, [router, loading, user, next]);

    const update = field => event => setForm({ ...form, [field]: event.target.value });
    const parsedIdentifier = parseIdentifier(form.identifier);
    const detected = parsedIdentifier.type;

    const handleSubmit = async event => {
        event.preventDefault();
        if (form.name.trim().length < 2 || !form.identifier.trim() || !form.password) {
            setError(t('auth.errorRequired'));
            return;
        }
        if (detected === 'invalid') {
            setError(t(`errors.identity/invalid-${parsedIdentifier.reason}`));
            return;
        }
        if (form.password.length < MIN_PASSWORD) {
            setError(t('auth.passwordTooShort', { min: MIN_PASSWORD }));
            return;
        }
        setBusy(true);
        setError('');
        submitting.current = true;
        try {
            await signUp(form);
            router.replace(next);
        } catch (err) {
            submitting.current = false;
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
                        <span>{t('auth.identifier')}</span>
                        <input
                            autoComplete="username"
                            inputMode="email"
                            dir="ltr"
                            value={form.identifier}
                            onChange={update('identifier')}
                            required
                        />
                        <span className="ui-field-hint">
                            {detected === 'phone'
                                ? t('auth.detectedPhone')
                                : detected === 'email'
                                  ? t('auth.detectedEmail')
                                  : t('auth.identifierHint')}
                        </span>
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
