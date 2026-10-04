import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';

const SIZES = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };

// Read-only stars; fractions fill partially (4.3 fills 30% of the fifth star). The fill
// follows the reading direction.
export function Stars({ value = 0, size = 'md', label, className }) {
    const { t } = useLang();
    const rating = Math.max(0, Math.min(5, Number(value) || 0));
    return (
        <span
            className={cx('inline-flex leading-none', SIZES[size], className)}
            role="img"
            aria-label={label || t('reviews.starsLabel', { rating: rating.toFixed(1) })}
        >
            {[0, 1, 2, 3, 4].map(index => {
                const fill = Math.max(0, Math.min(1, rating - index));
                return (
                    <span className="relative inline-block text-slate-300" key={index} aria-hidden="true">
                        ★
                        <span className="absolute inset-y-0 start-0 overflow-hidden text-star" style={{ width: `${fill * 100}%` }}>
                            ★
                        </span>
                    </span>
                );
            })}
        </span>
    );
}

// "★★★★☆ 4.3 (12)" for cards; nothing without reviews.
export function RatingSummary({ stats, size = 'sm', className }) {
    const { t } = useLang();
    if (!stats || !stats.count) return null;
    return (
        <span className={cx('inline-flex items-center gap-1.5 text-sm text-slate-600', className)}>
            <Stars value={stats.avg} size={size} />
            <span>
                <span className="font-medium text-slate-800">{Number(stats.avg).toFixed(1)}</span>
                <span className="sr-only">, </span> ({t('ui.reviewsCount', { count: stats.count })})
            </span>
        </span>
    );
}

// Accessible 1–5 picker: radio-group semantics, arrow keys follow the reading direction.
export function StarInput({ value, onChange, label }) {
    const { t, lang } = useLang();
    const rtl = lang === 'ar';
    const handleKey = event => {
        const forward = event.key === 'ArrowUp' || event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
        const back = event.key === 'ArrowDown' || event.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
        if (forward) {
            event.preventDefault();
            onChange(Math.min(5, (value || 0) + 1));
        } else if (back) {
            event.preventDefault();
            onChange(Math.max(1, (value || 1) - 1));
        }
    };
    return (
        <div className="inline-flex gap-1" role="radiogroup" aria-label={label || t('reviews.yourRating')} onKeyDown={handleKey}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={value === star}
                    aria-label={t('reviews.nStars', { count: star })}
                    tabIndex={value === star || (!value && star === 1) ? 0 : -1}
                    className={cx(
                        'h-11 w-11 rounded-md text-3xl leading-none transition-colors duration-fast hover:bg-slate-100',
                        star <= (value || 0) ? 'text-star' : 'text-slate-300'
                    )}
                    onClick={() => onChange(star)}
                >
                    ★
                </button>
            ))}
        </div>
    );
}
