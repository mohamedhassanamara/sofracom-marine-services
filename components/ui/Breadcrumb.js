import Link from 'next/link';
import { useLang } from '../../contexts/LangContext';
import { cx } from './cx';
import { ChevronRight, Icon } from './icons';

// items: [{ label, href }]; the last one is the current page.
export default function Breadcrumb({ items, className }) {
    const { t } = useLang();
    return (
        <nav aria-label={t('ui.breadcrumb')} className={cx('text-sm', className)}>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-slate-600">
                {items.map((item, index) => {
                    const last = index === items.length - 1;
                    return (
                        <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                            {last ? (
                                <span aria-current="page" className="truncate font-medium text-slate-900">
                                    {item.label}
                                </span>
                            ) : (
                                <>
                                    <Link href={item.href} className="truncate underline-offset-2 hover:text-navy-900 hover:underline">
                                        {item.label}
                                    </Link>
                                    <Icon as={ChevronRight} size={14} flip className="text-slate-400" />
                                </>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
