import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';
import { Icon, Minus, Plus } from './icons';

// − [ n ] + with 44 px targets; typing a number works too. Clamped to [min, max].
export default function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md', label, className }) {
    const { t } = useLang();
    const clamp = n => Math.max(min, Math.min(max, Math.round(Number(n) || min)));
    const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
    return (
        <div className={cx('inline-flex items-stretch rounded-md border border-slate-300 bg-white', className)} role="group" aria-label={label || t('ui.quantity')}>
            <button type="button" className={cx(box, 'flex items-center justify-center rounded-s-md text-slate-700 hover:bg-slate-100 disabled:opacity-40')} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={t('ui.decrease')}>
                <Icon as={Minus} size={16} />
            </button>
            <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={value}
                onChange={event => onChange(clamp(event.target.value))}
                aria-label={label || t('ui.quantity')}
                className={cx('w-12 border-x border-slate-300 bg-transparent text-center text-base font-semibold tabular-nums text-slate-900 [appearance:textfield] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-200 [&::-webkit-inner-spin-button]:appearance-none')}
            />
            <button type="button" className={cx(box, 'flex items-center justify-center rounded-e-md text-slate-700 hover:bg-slate-100 disabled:opacity-40')} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={t('ui.increase')}>
                <Icon as={Plus} size={16} />
            </button>
        </div>
    );
}
