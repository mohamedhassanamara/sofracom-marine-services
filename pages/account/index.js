import { useEffect, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import AccountLayout from '../../components/account/AccountLayout';
import { apiRequest, errorMessage } from '../../lib/apiClient';

const LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
];

export default function ProfilePage() {
    const { t, setLang } = useLang();
    const { user, profile, setProfile } = useAuth();
    const [form, setForm] = useState({ name: '', phone: '', lang: 'en' });
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setForm({ name: profile.name || '', phone: profile.phone || '', lang: profile.lang || 'en' });
        }
    }, [profile]);

    const update = field => event => setForm({ ...form, [field]: event.target.value });

    const handleSubmit = async event => {
        event.preventDefault();
        if (form.name.trim().length < 2) {
            setStatus({ type: 'error', text: t('account.profile.nameRequired') });
            return;
        }
        setSaving(true);
        setStatus(null);
        try {
            const result = await apiRequest('/api/account/profile', { method: 'PUT', body: form, user });
            setProfile(result.profile);
            setLang(result.profile.lang);
            setStatus({ type: 'success', text: t('account.profile.saved') });
        } catch (err) {
            setStatus({ type: 'error', text: errorMessage(t, err) });
        } finally {
            setSaving(false);
        }
    };

    return (
        <AccountLayout title={t('account.profile.title')} eyebrow={t('account.eyebrow')}>
            <form className="ui-card ui-form" onSubmit={handleSubmit} noValidate>
                <div className="ui-form-row ui-form-row--2">
                    <label className="ui-field">
                        <span>{t('account.profile.name')}</span>
                        <input autoComplete="name" value={form.name} onChange={update('name')} maxLength={120} />
                    </label>
                    <label className="ui-field">
                        <span>{t('account.profile.phone')}</span>
                        <input type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} maxLength={40} />
                    </label>
                </div>
                <div className="ui-form-row ui-form-row--2">
                    <label className="ui-field">
                        <span>{t('account.profile.email')}</span>
                        <input type="email" value={user?.email || ''} readOnly dir="ltr" />
                        <span className="ui-field-hint">
                            {user?.emailVerified ? t('account.profile.emailVerified') : t('account.profile.emailUnverified')}
                        </span>
                    </label>
                    <label className="ui-field">
                        <span>{t('account.profile.lang')}</span>
                        <select value={form.lang} onChange={update('lang')}>
                            {LANG_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                {status && (
                    <p className={`ui-alert ui-alert--${status.type}`} role="status">
                        {status.text}
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
