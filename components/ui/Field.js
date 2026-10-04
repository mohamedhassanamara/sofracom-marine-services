import { cloneElement, forwardRef, isValidElement, useId } from 'react';
import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';
import { AlertTriangle, ChevronDown, Icon } from './icons';

// 16 px text (no iOS zoom), 44 px tall, visible focus, error state from aria-invalid.
const CONTROL =
    'block w-full rounded-md border border-slate-300 bg-white text-base text-slate-900 shadow-sm transition-colors duration-fast ' +
    'placeholder:text-slate-500 hover:border-slate-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-200 ' +
    'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ' +
    'aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:ring-danger-200';

// Label + control + hint + error, wired with ids. `children` is one control element (it gets
// id, aria-describedby, aria-invalid and required) or a function receiving those props.
export function Field({ label, hint, error, required = false, optional = false, id: givenId, className, labelHidden = false, children }) {
    const { t } = useLang();
    const autoId = useId();
    const id = givenId || `f${autoId.replace(/:/g, '')}`;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const controlProps = {
        id,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
        required: required || undefined,
    };
    const control = typeof children === 'function' ? children(controlProps) : isValidElement(children) ? cloneElement(children, controlProps) : children;

    return (
        <div className={cx('flex flex-col gap-1.5', className)}>
            {label && (
                <label htmlFor={id} className={cx('text-sm font-medium text-slate-800', labelHidden && 'sr-only')}>
                    {label}
                    {required && (
                        <span className="text-danger-600" aria-hidden="true">
                            {' '}*
                        </span>
                    )}
                    {optional && <span className="font-normal text-slate-500"> ({t('ui.optional')})</span>}
                </label>
            )}
            {control}
            {hint && (
                <p id={hintId} className="text-sm text-slate-600">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger-700" role="alert">
                    <Icon as={AlertTriangle} size={16} className="mt-0.5" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
}

export const Input = forwardRef(function Input({ className, size = 'md', ...rest }, ref) {
    return <input ref={ref} className={cx(CONTROL, size === 'sm' ? 'h-9 px-3' : 'h-11 px-3', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cx(CONTROL, 'min-h-[6rem] px-3 py-2.5 leading-relaxed', className)} {...rest} />;
});

// Native select (best on phones) with a chevron that sits at the end in both directions.
export const Select = forwardRef(function Select({ className, size = 'md', children, ...rest }, ref) {
    return (
        <div className="relative">
            <select ref={ref} className={cx(CONTROL, 'appearance-none pe-10 ps-3', size === 'sm' ? 'h-9' : 'h-11', className)} {...rest}>
                {children}
            </select>
            <Icon as={ChevronDown} size={18} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
    );
});

const CHOICE = 'h-5 w-5 shrink-0 cursor-pointer accent-navy-900 disabled:cursor-not-allowed';

function Choice({ type, label, description, className, id: givenId, ...rest }) {
    const autoId = useId();
    const id = givenId || `c${autoId.replace(/:/g, '')}`;
    return (
        <div className={cx('flex items-start gap-3', className)}>
            <input id={id} type={type} className={cx(CHOICE, 'mt-0.5')} aria-describedby={description ? `${id}-d` : undefined} {...rest} />
            <label htmlFor={id} className="cursor-pointer text-base text-slate-800">
                {label}
                {description && (
                    <span id={`${id}-d`} className="block text-sm text-slate-600">
                        {description}
                    </span>
                )}
            </label>
        </div>
    );
}

export const Checkbox = props => <Choice type="checkbox" {...props} />;
export const Radio = props => <Choice type="radio" {...props} />;

// A labelled group of radios / checkboxes.
export function ChoiceGroup({ legend, hint, error, children, className }) {
    return (
        <fieldset className={cx('flex flex-col gap-3', className)}>
            <legend className="mb-1 text-sm font-medium text-slate-800">{legend}</legend>
            {hint && <p className="-mt-1 text-sm text-slate-600">{hint}</p>}
            {children}
            {error && (
                <p className="text-sm font-medium text-danger-700" role="alert">
                    {error}
                </p>
            )}
        </fieldset>
    );
}
