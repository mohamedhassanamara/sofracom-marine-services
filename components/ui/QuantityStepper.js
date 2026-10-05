import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';
import { Icon, Minus, Plus } from './icons';

const BOX = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-14 w-12' };

// − [ n ] + as one pill, with 44 px+ targets; typing a number works too. Clamped to [min, max].
export default function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md', label, className }) {
    const { t } = useLang();
    const clamp = n => Math.max(min, Math.min(max, Math.round(Number(n) || min)));
    const button = cx(BOX[size] || BOX.md, 'flex items-center justify-center rounded-full text-ink hover:bg-surface disabled:text-ink-muted disabled:hover:bg-transparent');
    return (
        <div className={cx('inline-flex items-center rounded-full border border-line-input bg-white px-0.5', className)} role="group" aria-label={label || t('ui.quantity')}>
            <button type="button" className={button} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={t('ui.decrease')}>
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
                className="w-10 bg-transparent text-center text-base font-semibold tabular-nums text-ink [appearance:textfield] focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent-600 [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button type="button" className={button} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={t('ui.increase')}>
                <Icon as={Plus} size={16} />
            </button>
        </div>
    );
}
