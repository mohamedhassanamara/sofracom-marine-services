import { useLang } from '../../contexts/LangContext';
import { statusTone } from '../../lib/design/tokens';
import { normalizeOrderStatus, normalizeQuoteStatus } from '../../lib/status';
import { cx } from './cx';

// A 100 tint with 700/800 text, no border. Literal class names (Tailwind only generates classes it can see) for each tone in
// lib/design/tokens.js `tones`: the same palette as the admin app and the staff app.
const TONES = {
    neutral: { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
    info: { badge: 'bg-accent-100 text-accent-800', dot: 'bg-accent-600' },
    primary: { badge: 'bg-navy-100 text-navy-800', dot: 'bg-navy-600' },
    warning: { badge: 'bg-warning-100 text-warning-800', dot: 'bg-warning-600' },
    success: { badge: 'bg-success-100 text-success-800', dot: 'bg-success-600' },
    danger: { badge: 'bg-danger-100 text-danger-700', dot: 'bg-danger-600' },
};

export function Badge({ tone = 'neutral', dot = false, size = 'md', className, children }) {
    const styles = TONES[tone] || TONES.neutral;
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[0.8125rem] leading-4',
                styles.badge,
                className
            )}
        >
            {dot && <span className={cx('h-1.5 w-1.5 rounded-full', styles.dot)} aria-hidden="true" />}
            {children}
        </span>
    );
}

const NORMALIZE = { order: normalizeOrderStatus, quote: normalizeQuoteStatus };

export function StatusBadge({ kind, status, size }) {
    const { t } = useLang();
    const normalized = NORMALIZE[kind](status);
    return (
        <Badge tone={statusTone[kind][normalized]} dot size={size}>
            {t(`status.${kind}.${normalized}`)}
        </Badge>
    );
}

export function StockBadge({ stock = 'in', size }) {
    const { t } = useLang();
    const value = statusTone.stock[stock] ? stock : 'in';
    return (
        <Badge tone={statusTone.stock[value]} dot size={size}>
            {t(`stock.${value}`)}
        </Badge>
    );
}

export default Badge;
