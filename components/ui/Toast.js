import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';
import { AlertTriangle, CheckCircle2, Icon, Info, X, XCircle } from './icons';

const ToastContext = createContext({ show: () => {}, dismiss: () => {} });

const TONES = {
    success: { icon: CheckCircle2, accent: 'text-success-700' },
    danger: { icon: XCircle, accent: 'text-danger-600' },
    warning: { icon: AlertTriangle, accent: 'text-warning-700' },
    info: { icon: Info, accent: 'text-accent-700' },
};

// show({ title, description, tone, action: { label, href | onClick }, duration })
// Messages are announced politely (errors assertively) and stay while hovered or focused.
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);

    const dismiss = useCallback(id => setToasts(list => list.filter(toast => toast.id !== id)), []);
    const show = useCallback(toast => {
        counter.current += 1;
        const id = counter.current;
        setToasts(list => [...list.slice(-2), { tone: 'success', duration: 5000, ...toast, id }]);
        return id;
    }, []);
    const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastRegion toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);

function ToastRegion({ toasts, onDismiss }) {
    const { t } = useLang();
    return (
        <section
            aria-label={t('ui.notifications')}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 sm:items-end sm:pe-6"
        >
            <div aria-live="polite" aria-relevant="additions" className="flex w-full flex-col items-center gap-2 sm:items-end">
                {toasts
                    .filter(toast => toast.tone !== 'danger')
                    .map(toast => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
                    ))}
            </div>
            <div aria-live="assertive" className="flex w-full flex-col items-center gap-2 sm:items-end">
                {toasts
                    .filter(toast => toast.tone === 'danger')
                    .map(toast => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
                    ))}
            </div>
        </section>
    );
}

function ToastItem({ toast, onDismiss }) {
    const { t } = useLang();
    const [paused, setPaused] = useState(false);
    const tone = TONES[toast.tone] || TONES.info;

    useEffect(() => {
        if (paused || !toast.duration) return undefined;
        const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
        return () => clearTimeout(timer);
    }, [paused, toast.duration, toast.id, onDismiss]);

    const action = toast.action;
    return (
        <div
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            style={{ animation: 'ui-toast-in var(--dur-base) var(--ease-out)' }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <Icon as={tone.icon} size={20} className={cx('mt-0.5', tone.accent)} />
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-sm text-slate-600">{toast.description}</p>}
                {action &&
                    (action.href ? (
                        <Link href={action.href} className="mt-2 inline-block text-sm font-semibold text-accent-700 underline-offset-2 hover:underline" onClick={() => onDismiss(toast.id)}>
                            {action.label}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            className="mt-2 text-sm font-semibold text-accent-700 underline-offset-2 hover:underline"
                            onClick={() => {
                                action.onClick?.();
                                onDismiss(toast.id);
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
            </div>
            <button type="button" className="-me-1 -mt-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={() => onDismiss(toast.id)} aria-label={t('ui.dismiss')}>
                <Icon as={X} size={16} />
            </button>
        </div>
    );
}
