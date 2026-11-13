import { cx } from './cx';

const PADDING = { none: '', sm: 'p-4', md: 'p-5 sm:p-7', lg: 'p-6 sm:p-10' };

// White with a hairline border, no shadow at rest. `interactive` adds a soft lift on hover.
export default function Card({ as: Tag = 'div', padding = 'md', interactive = false, className, children, ...rest }) {
    return (
        <Tag
            className={cx(
                'rounded-2xl border border-line bg-white',
                interactive && 'transition-shadow duration-base hover:shadow-soft',
                PADDING[padding],
                className
            )}
            {...rest}
        >
            {children}
        </Tag>
    );
}
