import { forwardRef } from 'react';

// next/link for the admin: a plain anchor (routes are hash links like "#/orders").
const Link = forwardRef(function Link({ href, children, prefetch, scroll, shallow, replace, locale, ...rest }, ref) {
    return (
        <a ref={ref} href={typeof href === 'string' ? href : href?.pathname || '#'} {...rest}>
            {children}
        </a>
    );
});
export default Link;
