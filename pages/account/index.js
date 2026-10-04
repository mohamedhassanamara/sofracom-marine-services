import { useEffect, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import AccountLayout from '../../components/account/AccountLayout';
import { apiRequest, errorMessage } from '../../lib/apiClient';
import { formatPhone } from '../../lib/identity';

const LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
];

export default function ProfilePage() {
    const { t, setLang } = useLang();
    const { user, profile, setProfile, resendVerification, refreshUser } = useAuth();
    const [form, setForm] = useState({ name: '', phone: '', email: '', lang: 'en' });
    const [status, setStatus] = useState(null);
    const [verifyState, setVerifyState] = useState(null); // null | 'sent' | 'checking'
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setForm({
                name: profile.name || '',
                phone: profile.phone || '',
                email: profile.email || '',
                lang: profile.lang || 'en',
            });
        }
    }, [profile]);

    const update = field => event => setForm({ ...form, [field]: event.target.value });
    const phoneAccount = profile?.accountType === 'phone';

    const handleSubmit = async event => {
        event.preventDefault();
        if (form.name.trim().length < 2) {
            setStatus({ type: 'error', key: 'account.profile.nameRequired' });
            return;
        }
        setSaving(true);
        setStatus(null);
        try {
            // Only the contact detail the account does not sign in with is editable.
            const body = { name: form.name, lang: form.lang };
            if (phoneAccount) body.email = form.email;
            else body.phone = form.phone;
            const result = await apiRequest('/api/account/profile', { method: 'PUT', body, user });
            setProfile(result.profile);
            setLang(result.profile.lang);
            setStatus({ type: 'success', key: 'account.profile.saved' });
        } catch (err) {
            setStatus({ type: 'error', text: errorMessage(t, err) });
        } finally {
            setSaving(false);
        }
    };

    const sendVerification = async () => {
        try {
            await resendVerification();
            setVerifyState('sent');
        } catch (err) {
            setStatus({ type: 'error', text: errorMessage(t, err) });
        }
    };

    const checkVerification = async () => {
        setVerifyState('checking');
        const refreshed = await refreshUser();
        if (refreshed?.emailVerified) {
            setVerifyState(null);
            setProfile({ ...profile, emailVerified: true });
            setStatus({ type: 'success', key: 'account.profile.verifiedNow' });
        } else {
            setVerifyState('sent');
            setStatus({ type: 'info', key: 'auth.verifyNotYet' });
        }
    };

    const showVerify = profile && !phoneAccount && profile.email && !profile.emailVerified;

    return (
        <AccountLayout title={t('account.profile.title')} eyebrow={t('account.eyebrow')}>
            {showVerify && (
                <div className="ui-alert ui-alert--info mb-5 flex flex-wrap items-center justify-between gap-3">
                    <span>{t('account.profile.verifyForGuestOrders')}</span>
                    {verifyState ? (
                        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={checkVerification} disabled={verifyState === 'checking'}>
                            {t('auth.verifyDone')}
                        </button>
                    ) : (
                        <button type="button" className="ui-btn ui-btn--primary ui-btn--small" onClick={sendVerification}>
                            {t('account.profile.verifyEmail')}
                        </button>
                    )}
                </div>
            )}
            {verifyState === 'sent' && <p className="ui-alert ui-alert--success mb-5">{t('auth.verifyResent')}</p>}
            <form className="ui-card ui-form" onSubmit={handleSubmit} noValidate>
                <label className="ui-field">
                    <span>{t('account.profile.name')}</span>
                    <input autoComplete="name" value={form.name} onChange={update('name')} maxLength={120} />
                </label>
                <div className="ui-form-row ui-form-row--2">
                    {phoneAccount ? (
                        <>
                            <label className="ui-field">
                                <span>{t('account.profile.loginPhone')}</span>
                                <input value={formatPhone(profile?.phone)} readOnly dir="ltr" />
                                <span className="ui-field-hint">{t('account.profile.loginHint')}</span>
                            </label>
                            <label className="ui-field">
                                <span>{t('account.profile.emailOptional')}</span>
                                <input type="email" autoComplete="email" value={form.email} onChange={update('email')} dir="ltr" maxLength={254} />
                                <span className="ui-field-hint">{t('account.profile.emailContactHint')}</span>
                            </label>
                        </>
                    ) : (
                        <>
                            <label className="ui-field">
                                <span>{t('account.profile.loginEmail')}</span>
                                <input type="email" value={profile?.email || ''} readOnly dir="ltr" />
                                <span className="ui-field-hint">
                                    {profile?.emailVerified ? t('account.profile.emailVerified') : t('account.profile.emailUnverified')}
                                </span>
                            </label>
                            <label className="ui-field">
                                <span>{t('account.profile.phoneOptional')}</span>
                                <input type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} dir="ltr" maxLength={40} />
                                <span className="ui-field-hint">{t('account.profile.phoneHint')}</span>
                            </label>
                        </>
                    )}
                </div>
                <label className="ui-field" style={{ maxWidth: '20rem' }}>
                    <span>{t('account.profile.lang')}</span>
                    <select value={form.lang} onChange={update('lang')}>
                        {LANG_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                {status && (
                    <p className={`ui-alert ui-alert--${status.type}`} role="status">
                        {status.key ? t(status.key) : status.text}
                    </p>
                )}
                <div>
                    <button type="submit" className="ui-btn ui-btn--primary" disabled={saving || !profile}>
                        {saving ? t('account.saving') : t('account.save')}
                    </button>
                </div>
            </form>
        </AccountLayout>
    );
}
