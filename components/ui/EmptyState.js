import { cx } from './cx';
import { Icon, Package } from './icons';

export function EmptyState({ icon = Package, title, description, action, className }) {
    return (
        <div className={cx('flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center', className)}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                <Icon as={icon} size={24} />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-1 max-w-md text-slate-600">{description}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

// Placeholder while content loads (pulse stops with reduced motion).
export function Skeleton({ className }) {
    return <span aria-hidden="true" className={cx('block animate-pulse rounded-md bg-slate-200', className)} />;
}
