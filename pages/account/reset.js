import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthCard } from '../../components/account/AuthCard';
import { safeNext } from '../../lib/redirect';
import { SHOP_PHONE } from '../../lib/identity';
import { errorMessage } from '../../lib/apiClient';

// Email accounts get a reset link. Phone accounts have no mailbox, so they are asked
// to contact the shop; staff set a temporary password from /admin → Users.
export default function ResetPasswordPage() {
    const { t } = useLang();
    const { resetPassword } = useAuth();
    const router = useRouter();
    const next = safeNext(router.query.next);
    const [identifier, setIdentifier] = useState('');
    const [result, setResult] = useState(null); // 'sent' | 'phone'
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async event => {
        event.preventDefault();
        if (!identifier.trim()) {
            setError(t('auth.errorRequired'));
            return;
        }
        setBusy(true);
        setError('');
        try {
            await resetPassword(identifier);
            setResult('sent');
        } catch (err) {
            if (err?.code === 'identity/phone-reset') setResult('phone');
            // Don't reveal whether an account exists for this email.
            else if (err?.code === 'auth/user-not-found') setResult('sent');
            else setError(errorMessage(t, err));
        } finally {
            setBusy(false);
        }
    };

    const loginHref = next ? `/account/login?next=${encodeURIComponent(next)}` : '/account/login';

    return (
        <AuthCard title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
            {result ? (
                <div className="ui-form">
                    {result === 'sent' ? (
                        <p className="ui-alert ui-alert--success" role="status">
                            {t('auth.resetSent', { email: identifier.trim() })}
                        </p>
                    ) : (
                        <div className="ui-alert ui-alert--info" role="status">
                            <p className="font-semibold">{t('auth.resetPhoneTitle')}</p>
                            <p className="mt-1">{t('auth.resetPhoneBody')}</p>
                            <a href={`tel:${SHOP_PHONE.replace(/\s/g, '')}`} className="ui-btn ui-btn--primary ui-btn--small mt-3" dir="ltr">
                                {SHOP_PHONE}
                            </a>
                        </div>
                    )}
                    <Link href={loginHref} className="ui-btn ui-btn--secondary ui-btn--block">
                        {t('auth.backToLogin')}
                    </Link>
                </div>
            ) : (
                <form className="ui-form" onSubmit={handleSubmit} noValidate>
                    <label className="ui-field">
                        <span>{t('auth.identifier')}</span>
                        <input
                            autoComplete="username"
                            inputMode="email"
                            dir="ltr"
                            value={identifier}
                            onChange={event => setIdentifier(event.target.value)}
                            required
                        />
                    </label>
                    {error && <p className="ui-alert ui-alert--error" role="alert">{error}</p>}
                    <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={busy}>
                        {busy ? t('auth.sending') : t('auth.continue')}
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
