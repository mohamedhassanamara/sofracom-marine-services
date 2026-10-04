import { useEffect, useState } from 'react';
import { Badge, Button, useToast } from '../../../../components/ui';
import useFormat from '../../../../hooks/useFormat';
import { api } from '../api';
import { Confirm, Empty, ErrorBox, PageHeader, Panel } from '../components/common';

export default function Devices() {
    const format = useFormat();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [code, setCode] = useState(null);
    const [revoking, setRevoking] = useState(null);
    const [busy, setBusy] = useState(false);
    const load = () => api('/api/devices').then(setData, setError);
    useEffect(() => {
        load();
    }, []);

    const newCode = async () => {
        try {
            setCode(await api('/api/devices/code', { method: 'POST', body: {} }));
            load();
        } catch (err) {
            toast.show({ tone: 'danger', title: 'No code', description: err.message });
        }
    };
    const revoke = async () => {
        setBusy(true);
        try {
            await api(`/api/devices/${encodeURIComponent(revoking.id)}/revoke`, { method: 'POST', body: {} });
            toast.show({ title: `${revoking.name} can no longer sign in` });
            setRevoking(null);
            load();
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Not revoked', description: err.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader title="Staff phones" subtitle="Phones running the SOFRACOM staff app. Only enrolled, active phones can see orders and change statuses." />
            <ErrorBox error={error} onRetry={load} />
            <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
                <Panel title="Add a phone">
                    <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-700">
                        <li>Open the staff app on the phone and choose “Enrol this phone”.</li>
                        <li>Create a code here and type it in the app within 15 minutes.</li>
                        <li>Each code works once; 5 wrong attempts cancel it.</li>
                    </ol>
                    {code && (
                        <div className="mt-4 rounded-lg bg-navy-50 p-4 text-center">
                            <p className="font-mono text-4xl font-bold tracking-[0.3em] text-navy-900">{code.code}</p>
                            <p className="mt-1 text-sm text-slate-600">Valid until {format.date(code.expiresAt, true)}</p>
                        </div>
                    )}
                    {data?.code && !code && <p className="mt-4 text-sm text-slate-600">Last code: {data.code.status} ({format.date(data.code.createdAt, true)})</p>}
                    <Button className="mt-4" fullWidth onClick={newCode}>
                        {code ? 'New code' : 'Create a code'}
                    </Button>
                </Panel>
                <Panel title="Enrolled phones">
                    {data?.devices?.length ? (
                        <ul className="divide-y divide-slate-200">
                            {data.devices.map(device => (
                                <li key={device.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                    <span>
                                        <span className="font-semibold">{device.name}</span>
                                        <span className="block text-sm text-slate-500">
                                            Added {format.date(device.createdAt)} · last seen {device.lastSeenAt ? format.date(device.lastSeenAt, true) : 'never'}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Badge tone={device.active ? 'success' : 'neutral'} size="sm">
                                            {device.active ? 'active' : 'revoked'}
                                        </Badge>
                                        {device.active && (
                                            <Button size="sm" variant="danger" onClick={() => setRevoking(device)}>
                                                Revoke
                                            </Button>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty>{data ? 'No phones enrolled yet.' : 'Loading…'}</Empty>
                    )}
                </Panel>
            </div>
            <Confirm
                open={Boolean(revoking)}
                title={`Revoke “${revoking?.name}”?`}
                body={<p>The phone is signed out at once and can't see orders any more. To use it again, enrol it with a new code.</p>}
                confirmLabel="Revoke phone"
                busy={busy}
                onConfirm={revoke}
                onClose={() => setRevoking(null)}
            />
        </>
    );
}
