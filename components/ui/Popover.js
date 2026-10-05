import { useEffect, useId, useRef, useState } from 'react';
import { cx } from './cx';
import { ChevronDown, Icon } from './icons';

// A pill button that opens a small panel under it (filters, sort).
// Escape and a click outside close it and focus goes back to the button; the panel is a
// labelled group, so screen readers hear "Brand, group" with its checkboxes.
// `defaultOpen` opens it on first render.
export default function Popover({ label, count = 0, children, align = 'start', defaultOpen = false, panelClassName, buttonClassName }) {
    const [open, setOpen] = useState(defaultOpen);
    const root = useRef(null);
    const button = useRef(null);
    const id = useId().replace(/:/g, '');

    useEffect(() => {
        if (!open) return undefined;
        const onDown = event => {
            if (root.current && !root.current.contains(event.target)) setOpen(false);
        };
        const onKey = event => {
            if (event.key === 'Escape') {
                setOpen(false);
                button.current?.focus();
            }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div ref={root} className="relative">
            <button
                ref={button}
                type="button"
                aria-expanded={open}
                aria-controls={`pop-${id}`}
                onClick={() => setOpen(value => !value)}
                className={cx(
                    'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-fast',
                    count > 0 || open ? 'border-navy-900 text-ink' : 'border-line-strong text-ink hover:border-navy-900',
                    buttonClassName
                )}
            >
                {label}
                {count > 0 && <span className="rounded-full bg-navy-900 px-1.5 text-xs font-semibold leading-5 text-white">{count}</span>}
                <Icon as={ChevronDown} size={16} className={cx('transition-transform duration-fast', open && 'rotate-180')} />
            </button>
            {open && (
                <div
                    id={`pop-${id}`}
                    role="group"
                    aria-label={label}
                    className={cx(
                        'absolute top-full z-30 mt-2 min-w-[16rem] rounded-xl border border-line bg-white p-4 shadow-soft',
                        align === 'end' ? 'end-0' : 'start-0',
                        panelClassName
                    )}
                >
                    {children}
                </div>
            )}
        </div>
    );
}
