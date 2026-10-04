import { useEffect, useId, useRef } from 'react';
import { useLang } from '../../contexts/LangContext';
import Button from './Button';
import { cx } from './cx';
import { X } from './icons';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

// Modal dialog and side drawer on the native <dialog>: the rest of the page is inert
// (focus can't leave it), Escape and the backdrop close it, focus returns to whatever
// opened it, the title labels it, and only the body scrolls (header and footer stay put).
//   variant="drawer" side="end" slides from the inline end (right in English, left in Arabic).
// Put data-autofocus on the element that should get focus first (default: the first control).
export default function Dialog({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    variant = 'dialog',
    side = 'end',
    hideTitle = false,
    className,
    bodyClassName,
}) {
    const { t } = useLang();
    const ref = useRef(null);
    const returnFocus = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const id = useId().replace(/:/g, '');
    const titleId = `dlg-${id}-title`;
    const descId = description ? `dlg-${id}-desc` : undefined;

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return undefined;
        if (open && !dialog.open) {
            returnFocus.current = document.activeElement;
            dialog.showModal();
            const preferred = dialog.querySelector('[data-autofocus]');
            if (preferred) preferred.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
        return undefined;
    }, [open]);

    // Whatever closed it (Escape, backdrop, a button, unmount), give focus back.
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return undefined;
        const handleClose = () => {
            const target = returnFocus.current;
            returnFocus.current = null;
            if (target && typeof target.focus === 'function' && document.contains(target)) target.focus();
        };
        dialog.addEventListener('close', handleClose);
        return () => dialog.removeEventListener('close', handleClose);
    }, []);

    const handleCancel = event => {
        event.preventDefault(); // let React state decide
        onCloseRef.current?.();
    };
    // A click whose target is the <dialog> itself landed on the backdrop.
    const handleMouseDown = event => {
        if (event.target === ref.current) onCloseRef.current?.();
    };

    const drawer = variant === 'drawer';
    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            aria-describedby={descId}
            onCancel={handleCancel}
            onMouseDown={handleMouseDown}
            className={cx(
                'ui-dialog bg-white p-0 text-slate-900 shadow-lg backdrop:bg-navy-950/60 open:flex open:flex-col',
                drawer
                    ? cx('ui-drawer h-dvh max-h-dvh w-full max-w-md', side === 'start' ? 'ui-drawer--start me-auto ms-0' : 'ui-drawer--end me-0 ms-auto')
                    : cx('max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] rounded-xl', SIZES[size]),
                className
            )}
        >
            {open && (
                <>
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                        <div className="min-w-0">
                            <h2 id={titleId} className={cx('text-lg font-semibold text-slate-900', hideTitle && 'sr-only')}>
                                {title}
                            </h2>
                            {description && (
                                <p id={descId} className="mt-1 text-sm text-slate-600">
                                    {description}
                                </p>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" icon={X} label={t('ui.close')} onClick={() => onCloseRef.current?.()} className="-me-2 -mt-1" />
                    </div>
                    <div className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4', bodyClassName)}>{children}</div>
                    {footer && <div className="border-t border-slate-200 bg-white px-5 py-4">{footer}</div>}
                </>
            )}
        </dialog>
    );
}

export const Drawer = props => <Dialog variant="drawer" {...props} />;
