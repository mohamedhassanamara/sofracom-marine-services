import Link from 'next/link';
import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';
import { ChevronRight, Icon } from './icons';

// items: [{ label, href }]; the last one is the current page.
export default function Breadcrumb({ items, className }) {
    const { t } = useLang();
    return (
        <nav aria-label={t('ui.breadcrumb')} className={cx('text-sm', className)}>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ink-muted">
                {items.map((item, index) => {
                    const last = index === items.length - 1;
                    return (
                        <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                            {last ? (
                                <span aria-current="page" className="truncate text-ink">
                                    {item.label}
                                </span>
                            ) : (
                                <>
                                    <Link href={item.href} className="truncate underline-offset-4 hover:text-ink hover:underline">
                                        {item.label}
                                    </Link>
                                    <Icon as={ChevronRight} size={14} flip className="shrink-0 text-line-strong" />
                                </>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
