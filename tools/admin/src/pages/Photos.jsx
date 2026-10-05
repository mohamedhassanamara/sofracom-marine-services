import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Input, Segmented, useToast } from '../../../../components/ui';
import { Check, ImageIcon, RotateCcw, Search, Sparkles, X } from '../../../../components/ui/icons';
import { api, siteUrl } from '../api';
import { Empty, ErrorBox, PageHeader } from '../components/common';

// Photo cutouts: each original next to its cutout. Approve (the site shows the cutout),
// Keep original (the site keeps the photo), Retry (generate again with the other model).
// Nothing is deleted, so every choice can be changed later; publish to put it online.
const PAGE = 40;
const STATUS = {
    pending: { label: 'To review', tone: 'warning' },
    approved: { label: 'Approved', tone: 'success' },
    original: { label: 'Kept original', tone: 'neutral' },
    missing: { label: 'No cutout yet', tone: 'neutral' },
};
const small = src => String(src).replace(/-(800|1600)\.webp$/, '-400.webp');
const thumb = src => siteUrl(small(src));
// Approved cutouts are in public/assets; pending ones in the cache (served by the admin).
const preview = (path, version) => `${path.startsWith('/cutouts-cache/') ? small(path) : thumb(path)}${version ? `?v=${encodeURIComponent(version)}` : ''}`;

export default function Photos({ onSaved }) {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [q, setQ] = useState('');
    const [shown, setShown] = useState(PAGE);
    const [selected, setSelected] = useState(() => new Set());
    const [working, setWorking] = useState('');
    const [progress, setProgress] = useState(null);
    const stopRef = useRef(false);

    const load = () =>
        api('/api/cutouts').then(result => {
            setData(result);
            setError(null);
        }, setError);
    useEffect(() => {
        load();
    }, []);
    useEffect(() => {
        setShown(PAGE);
        setSelected(new Set());
    }, [filter, q]);

    const images = useMemo(() => {
        const words = q.trim().toLowerCase();
        return (data?.images || []).filter(image => (filter === 'all' || image.status === filter) && (!words || `${image.title} ${image.productId}`.toLowerCase().includes(words)));
    }, [data, filter, q]);
    const visible = images.slice(0, shown);
    const counts = data?.counts || {};

    const setStatus = async (sources, status) => {
        setWorking(status);
        try {
            await api('/api/cutouts/status', { method: 'POST', body: { sources, status } });
            toast.show({ title: status === 'approved' ? `${sources.length} cutout${sources.length > 1 ? 's' : ''} approved` : status === 'original' ? `Keeping ${sources.length} original photo${sources.length > 1 ? 's' : ''}` : 'Back to review', description: 'Publish to put it on the site.' });
            setSelected(new Set());
            await load();
            onSaved?.();
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Not changed', description: err.message });
        } finally {
            setWorking('');
        }
    };

    const retry = async image => {
        setWorking(`retry:${image.src}`);
        try {
            const { item } = await api('/api/cutouts/retry', { method: 'POST', body: { src: image.src } });
            toast.show({ title: 'New cutout ready', description: `Made with the ${item.model} model. Review it again.` });
            await load();
            onSaved?.();
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Retry failed', description: err.message });
        } finally {
            setWorking('');
        }
    };

    // Small batches until none are left (or Stop), so the page stays responsive.
    const generate = async () => {
        setProgress({ done: 0, remaining: counts.missing || 0, stop: false });
        let done = 0;
        try {
            for (;;) {
                const result = await api('/api/cutouts/generate', { method: 'POST', body: { limit: 5 } });
                done += result.done.length;
                setProgress(current => ({ ...current, done, remaining: result.remaining }));
                if (!result.remaining || !result.done.length || stopRef.current) break;
            }
            toast.show({ title: `${done} cutouts generated`, description: 'They are waiting for your review.' });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Generation stopped', description: err.message });
        } finally {
            stopRef.current = false;
            setProgress(null);
            load();
            onSaved?.();
        }
    };

    const toggle = src =>
        setSelected(current => {
            const next = new Set(current);
            if (next.has(src)) next.delete(src);
            else next.add(src);
            return next;
        });
    const selectable = visible.filter(image => image.status !== 'missing');
    const allSelected = selectable.length > 0 && selectable.every(image => selected.has(image.src));

    return (
        <div>
            <PageHeader
                title="Photos"
                subtitle="Product photos with the background removed. Approve a cutout and the site shows it instead of the photo; keep the original otherwise. Nothing is deleted, and nothing goes online until you publish."
                actions={
                    data?.available === false ? null : progress ? (
                        <Button variant="secondary" icon={X} onClick={() => (stopRef.current = true)}>
                            Stop after this batch ({progress.done} done, {progress.remaining} left)
                        </Button>
                    ) : (
                        <Button icon={Sparkles} onClick={generate} disabled={!counts.missing || Boolean(working)}>
                            Generate missing cutouts ({counts.missing || 0})
                        </Button>
                    )
                }
            />
            <ErrorBox error={error} onRetry={load} />
            {data?.available === false && (
                <p className="mb-4 rounded-md border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
                    Background removal is not installed on this computer, so new cutouts can't be generated or retried here (reviewing still works). {data.reason}
                </p>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Segmented
                    label="Show"
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'pending', label: `To review (${counts.pending || 0})` },
                        { value: 'approved', label: `Approved (${counts.approved || 0})` },
                        { value: 'original', label: `Kept original (${counts.original || 0})` },
                        { value: 'missing', label: `No cutout (${counts.missing || 0})` },
                        { value: 'all', label: 'All' },
                    ]}
                />
                <label className="relative min-w-[14rem] flex-1">
                    <span className="sr-only">Search products</span>
                    <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <Input value={q} onChange={event => setQ(event.target.value)} placeholder="Search products" className="ps-9" />
                </label>
            </div>

            {selectable.length > 0 && (
                <div className="sticky top-14 z-20 -mx-2 mb-4 flex flex-wrap items-center gap-2 rounded-md bg-white/95 px-2 py-2 shadow-sm">
                    <label className="me-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map(image => image.src)))} />
                        Select all shown ({selectable.length})
                    </label>
                    <Button size="sm" icon={Check} disabled={!selected.size || Boolean(working)} loading={working === 'approved'} onClick={() => setStatus([...selected], 'approved')}>
                        Approve selected ({selected.size})
                    </Button>
                    <Button size="sm" variant="secondary" icon={ImageIcon} disabled={!selected.size || Boolean(working)} loading={working === 'original'} onClick={() => setStatus([...selected], 'original')}>
                        Keep originals ({selected.size})
                    </Button>
                </div>
            )}

            {!data ? (
                <Empty>Loading…</Empty>
            ) : !images.length ? (
                <Empty>{filter === 'pending' ? 'Nothing to review.' : 'No photos here.'}</Empty>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map(image => {
                        const status = STATUS[image.status] || STATUS.missing;
                        return (
                            <li key={image.src} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="mb-2 flex items-start gap-2">
                                    {image.status !== 'missing' && <input type="checkbox" aria-label={`Select ${image.title}`} className="mt-1 h-5 w-5 shrink-0 accent-navy-900" checked={selected.has(image.src)} onChange={() => toggle(image.src)} />}
                                    <div className="min-w-0 flex-1">
                                        <a href={`#/catalog/product/${image.productId}`} className="line-clamp-2 text-sm font-semibold text-navy-900 hover:underline">
                                            {image.title}
                                        </a>
                                        <p className="text-xs text-slate-500">
                                            Photo {image.position + 1}
                                            {image.model ? ` · ${image.model} model` : ''}
                                        </p>
                                    </div>
                                    <Badge tone={status.tone} size="sm">
                                        {status.label}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <figure>
                                        <img src={thumb(image.src)} alt="" loading="lazy" className="aspect-square w-full rounded-md border border-slate-200 bg-white object-contain" />
                                        <figcaption className="mt-1 text-xs text-slate-500">Original</figcaption>
                                    </figure>
                                    <figure>
                                        {image.preview ? <img src={preview(image.preview, image.updatedAt)} alt="" loading="lazy" className="aspect-square w-full rounded-md bg-surface object-contain" /> : <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-500">Not generated</div>}
                                        <figcaption className="mt-1 text-xs text-slate-500">Cutout (as on the site)</figcaption>
                                    </figure>
                                </div>
                                {image.status !== 'missing' && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button size="sm" icon={Check} variant={image.status === 'approved' ? 'secondary' : 'primary'} disabled={image.status === 'approved' || Boolean(working)} onClick={() => setStatus([image.src], 'approved')}>
                                            Approve
                                        </Button>
                                        <Button size="sm" variant="secondary" disabled={image.status === 'original' || Boolean(working)} onClick={() => setStatus([image.src], 'original')}>
                                            Keep original
                                        </Button>
                                        <Button size="sm" variant="ghost" icon={RotateCcw} disabled={data.available === false || Boolean(working) || Boolean(progress)} loading={working === `retry:${image.src}`} onClick={() => retry(image)}>
                                            Retry
                                        </Button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {images.length > shown && (
                <div className="mt-6 text-center">
                    <Button variant="secondary" onClick={() => setShown(count => count + PAGE)}>
                        Show more ({images.length - shown} left)
                    </Button>
                </div>
            )}
        </div>
    );
}
