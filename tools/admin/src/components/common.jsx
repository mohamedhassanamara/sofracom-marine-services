import { useEffect, useState } from 'react';
import { Badge, Button, Dialog } from '../../../../components/ui';
import { cx } from '../../../../components/ui/cx';
import { AlertTriangle, Icon } from '../../../../components/ui/icons';

export function PageHeader({ title, subtitle, actions, children }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
                {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
                {children}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function Panel({ title, actions, children, className }) {
    return (
        <section className={cx('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
            {(title || actions) && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                    <h2 className="font-semibold text-navy-900">{title}</h2>
                    {actions}
                </div>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

export function ErrorBox({ error, onRetry }) {
    if (!error) return null;
    return (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">
            <Icon as={AlertTriangle} size={18} className="mt-0.5" />
            <div className="flex-1">
                <p className="font-semibold">{error.message || String(error)}</p>
                {Array.isArray(error.details) && error.details.length > 1 && (
                    <ul className="mt-1 list-disc ps-5">
                        {error.details.slice(0, 8).map(detail => (
                            <li key={detail.path}>{detail.message}</li>
                        ))}
                    </ul>
                )}
            </div>
            {onRetry && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

// "Are you sure?" for destructive or irreversible actions. `confirmText` makes the user
// type a word (e.g. PUBLISH) for the riskiest ones.
export function Confirm({ open, title, body, confirmLabel = 'Confirm', tone = 'danger', confirmText, busy, disabled = false, onConfirm, onClose }) {
    const [typed, setTyped] = useState('');
    useEffect(() => setTyped(''), [open]);
    const ready = !disabled && (!confirmText || typed.trim().toUpperCase() === confirmText);
    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={!ready} loading={busy} data-autofocus={!confirmText || undefined}>
                        {confirmLabel}
                    </Button>
                </div>
            }
        >
            <div className="space-y-3 text-slate-700">
                {body}
                {confirmText && (
                    <label className="block text-sm">
                        Type <b>{confirmText}</b> to confirm
                        <input data-autofocus value={typed} onChange={event => setTyped(event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-slate-300 px-3 font-mono uppercase" />
                    </label>
                )}
            </div>
        </Dialog>
    );
}

export const EnvPill = ({ target }) =>
    target?.mode === 'production' ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">● Production · {target.projectId}</span>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">● Emulator · test data</span>
    );

export const GitPill = ({ git }) =>
    !git ? null : git.changes ? (
        <a href="#/publish" className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-800 ring-1 ring-warning-200 hover:bg-warning-100">
            {git.changes} unpublished change{git.changes === 1 ? '' : 's'}
        </a>
    ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-navy-100 ring-1 ring-white/20">Site up to date · {git.branch || 'detached'}</span>
    );

export const Empty = ({ children }) => <p className="py-8 text-center text-slate-500">{children}</p>;

export { Badge };
