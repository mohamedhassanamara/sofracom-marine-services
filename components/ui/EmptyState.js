import { cx } from './cx';
import { Icon, Package } from './icons';

export function EmptyState({ icon = Package, title, description, action, className, headingLevel = 2 }) {
    const Heading = `h${headingLevel}`;
    return (
        <div className={cx('flex flex-col items-center rounded-2xl bg-surface px-6 py-16 text-center', className)}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-navy-900">
                <Icon as={icon} size={24} />
            </span>
            <Heading className="mt-5 text-xl font-semibold text-ink">{title}</Heading>
            {description && <p className="mt-2 max-w-md text-ink-muted">{description}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}

// Placeholder while content loads (pulse stops with reduced motion).
export function Skeleton({ className }) {
    return <span aria-hidden="true" className={cx('block animate-pulse rounded-xl bg-surface-strong', className)} />;
}
