import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Icon, ImageIcon, Loader2 } from '../../../../components/ui/icons';
import { api } from '../api';

// Cutout status of some photos, refreshed every 1.5 s while one of them is being processed.
export function useCutoutStates(paths) {
    const [states, setStates] = useState({});
    const key = paths.filter(Boolean).join('|');
    const timer = useRef(null);
    useEffect(() => {
        let alive = true;
        const sources = key ? key.split('|') : [];
        const load = async () => {
            if (!sources.length) return setStates({});
            try {
                const result = await api('/api/cutouts/state', { method: 'POST', body: { sources } });
                if (!alive) return;
                setStates(result.states);
                const working = Object.values(result.states).some(state => ['queued', 'running'].includes(state.job?.state));
                if (working) timer.current = setTimeout(load, 1500);
            } catch {
                // the badges just stay as they were
            }
        };
        load();
        return () => {
            alive = false;
            clearTimeout(timer.current);
        };
    }, [key]);
    const refresh = () => setStates(current => ({ ...current }));
    return [states, refresh];
}

const withSlash = value => `/${String(value || '').replace(/^\//, '')}`;

// A small label on a photo: removing background… / cutout approved / needs review / original.
export function CutoutBadge({ state, keepOriginal }) {
    if (keepOriginal) return <Label tone="neutral" icon={ImageIcon} text="Original kept" />;
    const job = state?.job?.state;
    if (job === 'queued' || job === 'running') return <Label tone="info" icon={Loader2} spin text={job === 'queued' ? 'Cutout queued…' : 'Removing background…'} />;
    if (job === 'failed') return <Label tone="danger" icon={AlertTriangle} text="Cutout failed" title={state.job.error} />;
    if (job === 'unavailable') return <Label tone="neutral" icon={ImageIcon} text="Cutout later" title="Background removal isn't set up on this computer yet." />;
    if (state?.status === 'approved') return <Label tone="success" icon={Check} text={state.autoApproved ? 'Cutout auto-approved' : 'Cutout approved'} />;
    if (state?.status === 'pending') return <Label tone="warning" icon={AlertTriangle} text="Needs review" title={(state.reasons || []).join(' ')} href="#/photos" />;
    if (state?.status === 'original') return <Label tone="neutral" icon={ImageIcon} text="Original kept" />;
    return null;
}

const TONES = {
    info: 'bg-navy-100 text-navy-900',
    success: 'bg-success-100 text-success-800',
    warning: 'bg-warning-100 text-warning-800',
    danger: 'bg-danger-100 text-danger-700',
    neutral: 'bg-slate-100 text-slate-700',
};

function Label({ tone, icon, spin = false, text, title, href }) {
    const Tag = href ? 'a' : 'span';
    return (
        <Tag href={href} title={title} data-cutout-state={text} className={`inline-flex max-w-full items-start gap-1 rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-4 ${TONES[tone]} ${href ? 'hover:underline' : ''}`}>
            <Icon as={icon} size={12} className={`mt-0.5 shrink-0 ${spin ? 'animate-spin' : ''}`} />
            <span>{text}</span>
        </Tag>
    );
}

export { withSlash };
