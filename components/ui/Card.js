import { cx } from './cx';

const PADDING = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

// Surface at rest: white, hairline border, low shadow. `interactive` adds the hover lift.
export default function Card({ as: Tag = 'div', padding = 'md', interactive = false, className, children, ...rest }) {
    return (
        <Tag
            className={cx(
                'rounded-lg border border-slate-200 bg-white shadow-sm',
                interactive && 'transition-shadow duration-base hover:shadow-md',
                PADDING[padding],
                className
            )}
            {...rest}
        >
            {children}
        </Tag>
    );
}
