import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import AccountLayout from '../../components/account/AccountLayout';
import AddressFields, { EMPTY_ADDRESS, addressError } from '../../components/account/AddressForm';
import { apiRequest, errorMessage } from '../../lib/apiClient';

export default function AddressesPage() {
    const { t } = useLang();
    const { user } = useAuth();
    const [addresses, setAddresses] = useState(null);
    const [defaultId, setDefaultId] = useState(null);
    const [editing, setEditing] = useState(null); // { id|null, value, makeDefault }
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);

    const apply = result => {
        setAddresses(result.addresses);
        setDefaultId(result.defaultAddressId);
    };

    const load = useCallback(async () => {
        if (!user) return;
        try {
            const result = await apiRequest('/api/account/profile', { user });
            setAddresses(result.addresses);
            setDefaultId(result.profile.defaultAddressId);
        } catch (err) {
            setStatus({ type: 'error', text: errorMessage(t, err) });
        }
    }, [user, t]);

    useEffect(() => {
        load();
    }, [load]);

    const run = async (request, successKey) => {
        setBusy(true);
        setStatus(null);
        try {
            const result = await request();
            apply(result);
            setStatus({ type: 'success', text: t(successKey) });
            return true;
        } catch (err) {
            setStatus({ type: 'error', text: errorMessage(t, err) });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const handleSave = async event => {
        event.preventDefault();
        const problem = addressError(editing.value);
        if (problem) {
            setStatus({ type: 'error', text: t(problem) });
            return;
        }
        const saved = await run(
            () =>
                apiRequest('/api/account/addresses', {
                    method: editing.id ? 'PUT' : 'POST',
                    body: { id: editing.id || undefined, address: editing.value, makeDefault: editing.makeDefault },
                    user,
                }),
            'address.saved'
        );
        if (saved) setEditing(null);
    };

    const handleDelete = id =>
        run(
            () => apiRequest(`/api/account/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE', user }),
            'address.deleted'
        ).then(() => setConfirmDelete(null));

    const handleMakeDefault = id =>
        run(
            () => apiRequest('/api/account/addresses', { method: 'PUT', body: { id, makeDefault: true }, user }),
            'address.defaultSet'
        );

    const startEdit = address =>
        setEditing({
            id: address?.id || null,
            value: address
                ? {
                      label: address.label || '',
                      fullName: address.fullName || '',
                      phone: address.phone || '',
                      line: address.line || '',
                      city: address.city || '',
                      notes: address.notes || '',
                  }
                : { ...EMPTY_ADDRESS },
            makeDefault: false,
        });

    return (
        <AccountLayout
            title={t('address.title')}
            eyebrow={t('account.eyebrow')}
            actions={
                !editing && (
                    <button type="button" className="ui-btn ui-btn--primary" onClick={() => startEdit(null)}>
                        {t('address.add')}
                    </button>
                )
            }
        >
            {status && (
                <p className={`ui-alert ui-alert--${status.type} mb-4`} role="status">
                    {status.text}
                </p>
            )}
            {editing && (
                <form className="ui-card ui-form mb-6" onSubmit={handleSave} noValidate>
                    <h2 className="font-bold text-lg text-gray-900">
                        {editing.id ? t('address.editTitle') : t('address.newTitle')}
                    </h2>
                    <AddressFields value={editing.value} onChange={value => setEditing({ ...editing, value })} />
                    {editing.id !== defaultId && (
                        <label className="ui-check">
                            <input
                                type="checkbox"
                                checked={editing.makeDefault}
                                onChange={event => setEditing({ ...editing, makeDefault: event.target.checked })}
                            />
                            {t('address.makeDefault')}
                        </label>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" className="ui-btn ui-btn--primary" disabled={busy}>
                            {busy ? t('account.saving') : t('address.save')}
                        </button>
                        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setEditing(null)}>
                            {t('address.cancel')}
                        </button>
                    </div>
                </form>
            )}
            {addresses === null ? (
                <p className="ui-muted">{t('account.loading')}</p>
            ) : addresses.length === 0 ? (
                !editing && (
                    <div className="ui-card ui-empty">
                        <p>{t('address.empty')}</p>
                    </div>
                )
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {addresses.map(address => {
                        const isDefault = address.id === defaultId;
                        return (
                            <article key={address.id} className={`address-card ${isDefault ? 'address-card--default' : ''}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="record-card__title">{address.label || address.fullName}</p>
                                    {isDefault && <span className="ui-pill">{t('address.default')}</span>}
                                </div>
                                <p className="text-sm text-gray-700">{address.fullName}</p>
                                <p className="text-sm text-gray-700">{address.line}</p>
                                <p className="text-sm text-gray-700">{address.city}</p>
                                <p className="text-sm text-gray-500" dir="ltr" style={{ textAlign: 'start' }}>
                                    {address.phone}
                                </p>
                                {address.notes && <p className="ui-muted">{address.notes}</p>}
                                <div className="address-card__actions">
                                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => startEdit(address)} disabled={busy}>
                                        {t('address.edit')}
                                    </button>
                                    {!isDefault && (
                                        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => handleMakeDefault(address.id)} disabled={busy}>
                                            {t('address.setDefault')}
                                        </button>
                                    )}
                                    {confirmDelete === address.id ? (
                                        <>
                                            <button type="button" className="ui-btn ui-btn--danger ui-btn--small" onClick={() => handleDelete(address.id)} disabled={busy}>
                                                {t('address.confirmDelete')}
                                            </button>
                                            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setConfirmDelete(null)}>
                                                {t('address.cancel')}
                                            </button>
                                        </>
                                    ) : (
                                        <button type="button" className="ui-btn ui-btn--danger ui-btn--small" onClick={() => setConfirmDelete(address.id)} disabled={busy}>
                                            {t('address.delete')}
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </AccountLayout>
    );
}
