import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, useToast } from '../../../../components/ui';
import { AlertTriangle, Icon } from '../../../../components/ui/icons';
import useFormat from '../../../../hooks/useFormat';
import { api } from '../api';
import { Confirm, Empty, ErrorBox, PageHeader, Panel } from '../components/common';

function DiffList({ title, diff, label }) {
    const rows = [
        ...diff.added.map(item => ({ tone: 'success', text: 'added', item })),
        ...diff.changed.map(item => ({ tone: 'info', text: 'changed', item })),
        ...diff.removed.map(item => ({ tone: 'danger', text: 'removed', item })),
    ];
    if (!rows.length) return null;
    return (
        <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {rows.map(({ tone, text, item }) => (
                    <li key={`${text}-${item.id || item.slug}`} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                        <Badge tone={tone} size="sm">
                            {text}
                        </Badge>
                        <span className="font-medium">{label(item)}</span>
                        {item.fields && <span className="text-slate-500">({item.fields.join(', ')})</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function Publish({ onChange }) {
    const format = useFormat();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [confirm, setConfirm] = useState(null); // 'publish' | 'rollback'
    const [busy, setBusy] = useState(false);
    const [deployment, setDeployment] = useState(null);

    const load = useCallback(() => api('/api/publish').then(setData, setError), []);
    const loadDeployment = useCallback(() => api('/api/publish/deployment').then(setDeployment, () => {}), []);
    useEffect(() => {
        load();
        loadDeployment();
    }, [load, loadDeployment]);
    useEffect(() => {
        if (!deployment?.configured) return undefined;
        const state = deployment.deployment?.state;
        const timer = setInterval(loadDeployment, ['BUILDING', 'QUEUED', 'INITIALIZING'].includes(state) ? 5000 : 30000);
        return () => clearInterval(timer);
    }, [deployment, loadDeployment]);

    const run = async () => {
        setBusy(true);
        try {
            const result = confirm === 'publish' ? await api('/api/publish', { method: 'POST', body: { files: data.files.map(file => file.path) } }) : await api('/api/publish/rollback', { method: 'POST', body: { commit: data.lastPublish.sha } });
            toast.show({ title: confirm === 'publish' ? 'Published' : 'Rolled back', description: result.message, duration: 8000 });
            setConfirm(null);
            await load();
            onChange?.();
            setTimeout(loadDeployment, 4000);
        } catch (err) {
            toast.show({ tone: 'danger', title: confirm === 'publish' ? 'Not published' : 'Not rolled back', description: err.message, duration: 10000 });
        } finally {
            setBusy(false);
        }
    };

    const diff = data?.diff;
    const hasDiff = diff && [diff.catalog.products, diff.catalog.categories, diff.gallery].some(group => group.added.length || group.changed.length || group.removed.length);
    const blockers = (data?.blockers || []).filter(text => !/^Nothing to publish/.test(text));
    const stateTone = { READY: 'success', ERROR: 'danger', CANCELED: 'neutral', BUILDING: 'warning', QUEUED: 'warning', INITIALIZING: 'warning' };

    return (
        <>
            <PageHeader title="Publish" subtitle="Puts the saved catalog and gallery on the website: commits only those files, pushes to main, and Vercel redeploys." actions={<Button variant="secondary" onClick={load}>Refresh</Button>} />
            <ErrorBox error={error} onRetry={load} />
            {blockers.length > 0 && (
                <div role="alert" className="mb-4 rounded-md border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
                    <p className="flex items-center gap-2 font-semibold">
                        <Icon as={AlertTriangle} size={18} /> Publishing is blocked
                    </p>
                    <ul className="mt-1 list-disc ps-6">
                        {blockers.map(text => (
                            <li key={text}>{text}</li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
                <Panel
                    title="Changes waiting to be published"
                    actions={
                        <Button onClick={() => setConfirm('publish')} disabled={!data?.files?.length || blockers.length > 0}>
                            Publish {data?.files?.length ? `${data.files.length} file${data.files.length > 1 ? 's' : ''}` : ''}
                        </Button>
                    }
                >
                    {!data ? (
                        <Empty>Loading…</Empty>
                    ) : !data.files.length ? (
                        <Empty>Nothing to publish: the website has the latest saved catalog and gallery.</Empty>
                    ) : (
                        <div className="space-y-5">
                            {hasDiff && (
                                <>
                                    <DiffList title="Products" diff={diff.catalog.products} label={item => item.title || item.id} />
                                    <DiffList title="Categories" diff={diff.catalog.categories} label={item => item.name || item.slug} />
                                    <DiffList title="Gallery" diff={diff.gallery} label={item => item.title || item.id} />
                                </>
                            )}
                            <details>
                                <summary className="cursor-pointer text-sm font-semibold text-slate-700">{data.files.length} files</summary>
                                <ul className="mt-2 space-y-0.5 font-mono text-xs">
                                    {data.files.map(file => (
                                        <li key={file.path}>
                                            <span className={file.status === 'added' ? 'text-success-700' : file.status === 'deleted' ? 'text-danger-700' : 'text-accent-700'}>{file.status.padEnd(8)}</span> {file.path}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </div>
                    )}
                </Panel>
                <div className="space-y-6">
                    <Panel title="Website build">
                        {!deployment ? (
                            <Empty>Loading…</Empty>
                        ) : !deployment.configured ? (
                            <p className="text-sm text-slate-600">
                                Add <code>VERCEL_TOKEN</code> and <code>VERCEL_PROJECT_ID</code> (and <code>VERCEL_TEAM_ID</code> for a team) to <code>.env</code> to see the build status here.
                            </p>
                        ) : deployment.deployment ? (
                            <div className="space-y-2 text-sm">
                                <Badge tone={stateTone[deployment.deployment.state] || 'neutral'}>{deployment.deployment.state}</Badge>
                                <p className="text-slate-700">{deployment.deployment.message}</p>
                                <p className="text-slate-500">
                                    {deployment.deployment.commit} · {format.date(deployment.deployment.createdAt, true)}
                                </p>
                                {deployment.deployment.url && (
                                    <a href={deployment.deployment.url} target="_blank" rel="noreferrer" className="font-semibold text-accent-700 hover:underline">
                                        Open the deployment
                                    </a>
                                )}
                            </div>
                        ) : (
                            <Empty>No deployment yet.</Empty>
                        )}
                    </Panel>
                    <Panel title="Last publish">
                        {data?.lastPublish ? (
                            <div className="space-y-3 text-sm">
                                <p>
                                    <span className="font-mono font-semibold">{data.lastPublish.short}</span> · {format.date(data.lastPublish.date, true)}
                                </p>
                                <p className="text-slate-600">{data.lastPublish.subject}</p>
                                <Button variant="danger" size="sm" onClick={() => setConfirm('rollback')} disabled={!data.lastPublish.inScope || blockers.length > 0 || data.files.length > 0}>
                                    Roll back this publish…
                                </Button>
                                {data.files.length > 0 && <p className="text-slate-500">Publish or discard the waiting changes first.</p>}
                            </div>
                        ) : (
                            <Empty>No publish yet.</Empty>
                        )}
                    </Panel>
                </div>
            </div>
            <Confirm
                open={confirm === 'publish'}
                title={`Publish ${data?.files?.length || 0} files to the website?`}
                body={
                    <>
                        <p>These files are committed and pushed to main; the site redeploys in a few minutes. Nothing else in the repository is included.</p>
                        <ul className="max-h-48 overflow-auto rounded-md bg-slate-50 p-2 font-mono text-xs">
                            {(data?.files || []).map(file => (
                                <li key={file.path}>
                                    {file.status} {file.path}
                                </li>
                            ))}
                        </ul>
                    </>
                }
                confirmLabel="Publish"
                tone="primary"
                busy={busy}
                onConfirm={run}
                onClose={() => setConfirm(null)}
            />
            <Confirm
                open={confirm === 'rollback'}
                title={`Roll back ${data?.lastPublish?.short}?`}
                body={<p>This creates a new commit that undoes the last publish and pushes it to main. The site goes back to the catalog before it.</p>}
                confirmLabel="Roll back"
                confirmText="ROLLBACK"
                busy={busy}
                onConfirm={run}
                onClose={() => setConfirm(null)}
            />
        </>
    );
}
