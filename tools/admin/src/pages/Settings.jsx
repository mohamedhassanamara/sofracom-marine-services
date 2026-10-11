import { useEffect, useState } from 'react';
import { Checkbox, useToast } from '../../../../components/ui';
import { api } from '../api';
import { ErrorBox, PageHeader, Panel } from '../components/common';

// This computer's admin settings (kept in the git-ignored .cutouts-cache/settings.json, never
// published).
export default function Settings() {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const load = () => api('/api/settings').then(setData, setError);
    useEffect(() => {
        load();
    }, []);
    const save = async changes => {
        try {
            const result = await api('/api/settings', { method: 'PUT', body: changes });
            setData(current => ({ ...current, ...result }));
            toast.show({ title: 'Setting saved' });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Not saved', description: err.message });
        }
    };
    return (
        <div>
            <PageHeader title="Settings" subtitle="Choices for this computer's admin." />
            <ErrorBox error={error} onRetry={load} />
            <Panel title="Photo cutouts">
                <Checkbox
                    label="Approve cutouts automatically when they pass the checks"
                    description="The subject covers 8–92 % of the photo, it isn't near-white or half-transparent, there is one main object, and it doesn't touch 3 or more edges. Cutouts that fail wait in Photos with the reason. Off: every cutout waits for you."
                    checked={data?.settings?.autoApprove ?? true}
                    disabled={!data}
                    onChange={event => save({ autoApprove: event.target.checked })}
                />
                <p className="mt-4 text-sm text-slate-600">
                    Background removal: {data ? (data.available ? 'set up on this computer.' : `not set up (${data.reason})`) : '…'}
                </p>
            </Panel>
        </div>
    );
}
