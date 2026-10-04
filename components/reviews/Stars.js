import { useLang } from '../../contexts/LangContext';

// Read-only star display; supports fractions (e.g. 4.3 fills 30% of the fifth star).
export function Stars({ value = 0, size = 'md', label }) {
    const { t } = useLang();
    const rating = Math.max(0, Math.min(5, Number(value) || 0));
    return (
        <span
            className={`stars stars--${size}`}
            role="img"
            aria-label={label || t('reviews.starsLabel', { rating: rating.toFixed(1) })}
        >
            {[0, 1, 2, 3, 4].map(index => {
                const fill = Math.max(0, Math.min(1, rating - index));
                return (
                    <span className="stars__star" key={index} aria-hidden="true">
                        ★
                        <span className="stars__fill" style={{ width: `${fill * 100}%` }}>
                            ★
                        </span>
                    </span>
                );
            })}
        </span>
    );
}

// Small "★★★★☆ (12)" line for product cards and search results; renders nothing without reviews.
export function CardRating({ stats }) {
    const { t } = useLang();
    if (!stats || !stats.count) return null;
    return (
        <span className="card-rating" title={t('reviews.averageOf', { avg: stats.avg.toFixed(1), count: stats.count })}>
            <Stars value={stats.avg} size="sm" />
            <span>
                {stats.avg.toFixed(1)} ({stats.count})
            </span>
        </span>
    );
}

// Accessible 1–5 picker (radio-group semantics, arrow keys supported).
export function StarInput({ value, onChange }) {
    const { t } = useLang();
    const handleKey = event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            onChange(Math.min(5, (value || 0) + 1));
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            onChange(Math.max(1, (value || 1) - 1));
        }
    };
    return (
        <div className="star-input" role="radiogroup" aria-label={t('reviews.yourRating')} onKeyDown={handleKey}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={value === star}
                    aria-label={t('reviews.nStars', { count: star })}
                    tabIndex={value === star || (!value && star === 1) ? 0 : -1}
                    className={star <= (value || 0) ? 'on' : ''}
                    onClick={() => onChange(star)}
                >
                    ★
                </button>
            ))}
        </div>
    );
}
