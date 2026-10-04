import { useState } from 'react';
import { useRouter } from 'next/router';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import AccountLayout from '../../components/account/AccountLayout';
import { afterAuthPath } from '../../lib/redirect';
import { errorMessage } from '../../lib/apiClient';

const MIN_PASSWORD = 8;

// Shown after signing in with a temporary password from staff (and available any time).
export default function ChangePasswordPage() {
    const { t } = useLang();
    const { profile, changePassword } = useAuth();
    const router = useRouter();
    const next = afterAuthPath(router.query.next);
    const [form, setForm] = useState({ password: '', confirm: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async event => {
        event.preventDefault();
        if (form.password.length < MIN_PASSWORD) {
            setError(t('auth.passwordTooShort', { min: MIN_PASSWORD }));
            return;
        }
        if (form.password !== form.confirm) {
            setError(t('account.password.mismatch'));
            return;
        }
        setBusy(true);
        setError('');
        try {
            await changePassword(form.password);
            router.replace(next === '/account/change-password' ? '/account' : next);
        } catch (err) {
            setError(errorMessage(t, err));
            setBusy(false);
        }
    };

    return (
        <AccountLayout title={t('account.password.title')} eyebrow={t('account.eyebrow')}>
            {profile?.mustChangePassword && (
                <p className="ui-alert ui-alert--warning mb-5">{t('account.password.temporary')}</p>
            )}
            <form className="ui-card ui-form" onSubmit={handleSubmit} noValidate style={{ maxWidth: '28rem' }}>
                <label className="ui-field">
                    <span>{t('account.password.new')}</span>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={event => setForm({ ...form, password: event.target.value })}
                    />
                    <span className="ui-field-hint">{t('auth.passwordHint', { min: MIN_PASSWORD })}</span>
                </label>
                <label className="ui-field">
                    <span>{t('account.password.confirm')}</span>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={form.confirm}
                        onChange={event => setForm({ ...form, confirm: event.target.value })}
                    />
                </label>
                {error && <p className="ui-alert ui-alert--error" role="alert">{error}</p>}
                <div>
                    <button type="submit" className="ui-btn ui-btn--primary" disabled={busy}>
                        {busy ? t('account.saving') : t('account.password.save')}
                    </button>
                </div>
            </form>
        </AccountLayout>
    );
}
