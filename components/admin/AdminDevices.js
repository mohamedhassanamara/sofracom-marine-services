import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFormatDate } from '../account/Status';
import { apiRequest, errorMessage } from '../../lib/apiClient';

const POLL_MS = 5000;

const remaining = expiresAt => Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
const mmss = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// Staff-app devices: generate a one-time enrolment code, see enrolled devices, revoke them.
export default function AdminDevices() {
    const { t } = useLang();
    const { user } = useAuth();
    const formatDate = useFormatDate();
    const [devices, setDevices] = useState(null);
    const [codeStatus, setCodeStatus] = useState(null);
    const [issued, setIssued] = useState(null); // { code, expiresAt } shown to the admin once
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [confirmId, setConfirmId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const result = await apiRequest('/api/admin/devices', { user });
            setDevices(result.devices);
            setCodeStatus(result.code);
        } catch (err) {
            setError(errorMessage(t, err));
            setDevices(current => current || []);
        }
    }, [user, t]);

    useEffect(() => {
        load();
    }, [load]);

    // While a code is on screen, poll so the admin sees it used, expired or burned.
    const waiting = issued && codeStatus?.status === 'active';
    useEffect(() => {
        if (!waiting) return undefined;
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [waiting, load]);

    useEffect(() => {
        if (!issued) return undefined;
        setSecondsLeft(remaining(issued.expiresAt));
        const timer = setInterval(() => setSecondsLeft(remaining(issued.expiresAt)), 1000);
        return () => clearInterval(timer);
    }, [issued]);

    const generate = async () => {
        setBusy(true);
        setError('');
        try {
            const result = await apiRequest('/api/admin/devices', { method: 'POST', body: {}, user });
            setIssued({ code: result.code, expiresAt: result.expiresAt });
            await load();
        } catch (err) {
            setError(errorMessage(t, err));
        } finally {
            setBusy(false);
        }
    };

    const revoke = async id => {
        setBusy(true);
        setError('');
        try {
            await apiRequest(`/api/admin/devices?id=${encodeURIComponent(id)}`, { method: 'DELETE', user });
            setConfirmId(null);
            await load();
        } catch (err) {
            setError(errorMessage(t, err));
        } finally {
            setBusy(false);
        }
    };

    const status = codeStatus?.status;
    const codeIsLive = issued && status === 'active' && secondsLeft > 0;
    const codeClosed = issued && !codeIsLive;

    return (
        <div className="grid gap-5">
            <section className="ui-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div style={{ maxWidth: '36rem' }}>
                        <h2 className="font-bold text-lg text-gray-900">{t('devices.enrollTitle')}</h2>
                        <p className="ui-muted mt-1">{t('devices.enrollHelp')}</p>
                    </div>
                    <button type="button" className="ui-btn ui-btn--primary" onClick={generate} disabled={busy}>
                        {issued ? t('devices.generateAnother') : t('devices.generate')}
                    </button>
                </div>
                {codeIsLive && (
                    <div className="mt-5 text-center">
                        <p
                            className="font-extrabold text-gray-900"
                            style={{ fontSize: '2.75rem', letterSpacing: '0.35em', direction: 'ltr' }}
                            aria-live="polite"
                        >
                            {issued.code}
                        </p>
                        <p className="ui-muted">{t('devices.expiresIn', { time: mmss(secondsLeft) })}</p>
                    </div>
                )}
                {codeClosed && status === 'used' && (
                    <p className="ui-alert ui-alert--success mt-4" role="status">{t('devices.codeUsed')}</p>
                )}
                {codeClosed && status !== 'used' && (
                    <p className="ui-alert ui-alert--warning mt-4" role="status">
                        {status === 'burned' ? t('devices.codeBurned') : t('devices.codeExpired')}
                    </p>
                )}
                {!issued && status === 'burned' && (
                    <p className="ui-alert ui-alert--warning mt-4" role="status">{t('devices.codeBurned')}</p>
                )}
            </section>

            <section className="ui-card">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="font-bold text-lg text-gray-900">{t('devices.listTitle')}</h2>
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={load}>
                        {t('admin.refresh')}
                    </button>
                </div>
                {error && <p className="ui-alert ui-alert--error mb-3">{error}</p>}
                {devices === null ? (
                    <p className="ui-muted">{t('account.loading')}</p>
                ) : devices.length === 0 ? (
                    <p className="ui-empty">{t('devices.none')}</p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>{t('devices.name')}</th>
                                    <th>{t('devices.enrolled')}</th>
                                    <th>{t('devices.lastSeen')}</th>
                                    <th>{t('admin.status')}</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map(device => (
                                    <tr key={device.id}>
                                        <td>
                                            <bdi>{device.name}</bdi>
                                        </td>
                                        <td className="ui-muted">{formatDate(device.createdAt, true)}</td>
                                        <td className="ui-muted">{formatDate(device.lastSeenAt, true)}</td>
                                        <td>
                                            <span className={`status-badge ${device.active ? 'status-badge--done' : 'status-badge--stopped'}`}>
                                                {device.active ? t('devices.active') : t('devices.revoked')}
                                            </span>
                                        </td>
                                        <td>
                                            {device.active &&
                                                (confirmId === device.id ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="ui-btn ui-btn--danger ui-btn--small"
                                                            onClick={() => revoke(device.id)}
                                                            disabled={busy}
                                                        >
                                                            {t('devices.confirmRevoke')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="ui-btn ui-btn--secondary ui-btn--small"
                                                            onClick={() => setConfirmId(null)}
                                                        >
                                                            {t('address.cancel')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--danger ui-btn--small"
                                                        onClick={() => setConfirmId(device.id)}
                                                    >
                                                        {t('devices.revoke')}
                                                    </button>
                                                ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
