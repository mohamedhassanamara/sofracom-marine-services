import { useLang } from '../../contexts/LangContext';
import { statusTone } from '../../lib/design/tokens';
import { normalizeOrderStatus, normalizeQuoteStatus } from '../../lib/status';
import { cx } from './cx';

// Literal class names (Tailwind only generates classes it can see) for each tone in
// lib/design/tokens.js `tones`: the same palette as the admin app and the staff app.
const TONES = {
    neutral: { badge: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
    info: { badge: 'border-accent-200 bg-accent-50 text-accent-800', dot: 'bg-accent-600' },
    primary: { badge: 'border-navy-200 bg-navy-50 text-navy-800', dot: 'bg-navy-600' },
    warning: { badge: 'border-warning-200 bg-warning-50 text-warning-800', dot: 'bg-warning-600' },
    success: { badge: 'border-success-200 bg-success-50 text-success-800', dot: 'bg-success-600' },
    danger: { badge: 'border-danger-200 bg-danger-50 text-danger-800', dot: 'bg-danger-600' },
};

export function Badge({ tone = 'neutral', dot = false, size = 'md', className, children }) {
    const styles = TONES[tone] || TONES.neutral;
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium',
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm',
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
