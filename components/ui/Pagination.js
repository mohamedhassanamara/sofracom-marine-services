import { useLang } from '../../contexts/LangContext';
import Button from './Button';
import { cx } from './cx';
import { ChevronLeft, ChevronRight } from './icons';

// "Showing 24 of 60" + Show more. Long lists grow in place (keeps scroll position).
export function LoadMore({ shown, total, onMore, className }) {
    const { t } = useLang();
    if (total <= 0) return null;
    return (
        <div className={cx('flex flex-col items-center gap-3', className)}>
            <p className="text-sm text-slate-600" aria-live="polite">
                {t('ui.showing', { shown: Math.min(shown, total), total })}
            </p>
            {shown < total && (
                <Button variant="secondary" onClick={onMore}>
                    {t('ui.showMore')}
                </Button>
            )}
        </div>
    );
}

// Numbered pages (admin tables, order history). Shows first, last and the pages around the current one.
export function Pagination({ page, pageCount, onChange, className }) {
    const { t } = useLang();
    if (pageCount <= 1) return null;
    const pages = [...new Set([1, page - 1, page, page + 1, pageCount])].filter(n => n >= 1 && n <= pageCount).sort((a, b) => a - b);
    return (
        <nav aria-label={t('ui.pagination')} className={cx('flex items-center justify-center gap-1', className)}>
            <Button variant="ghost" size="sm" icon={ChevronLeft} iconFlip label={t('ui.previous')} disabled={page <= 1} onClick={() => onChange(page - 1)} />
            {pages.map((n, i) => (
                <span key={n} className="flex items-center gap-1">
                    {i > 0 && n - pages[i - 1] > 1 && <span className="px-1 text-slate-500">…</span>}
                    <button
                        type="button"
                        onClick={() => onChange(n)}
                        aria-current={n === page ? 'page' : undefined}
                        aria-label={t('ui.page', { page: n })}
                        className={cx(
                            'h-9 min-w-[2.25rem] rounded-md px-2 text-sm font-semibold transition-colors duration-fast',
                            n === page ? 'bg-navy-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        )}
                    >
                        {n}
                    </button>
                </span>
            ))}
            <Button variant="ghost" size="sm" icon={ChevronRight} iconFlip label={t('ui.next')} disabled={page >= pageCount} onClick={() => onChange(page + 1)} />
        </nav>
    );
}
