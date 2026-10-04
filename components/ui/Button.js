import Link from 'next/link';
import { forwardRef } from 'react';
import { cx } from './cx';
import { Icon, Loader2 } from './icons';

const VARIANTS = {
    primary: 'bg-navy-900 text-white shadow-sm hover:bg-navy-800 active:bg-navy-950',
    accent: 'bg-accent-400 text-navy-950 shadow-sm hover:bg-accent-300 active:bg-accent-500',
    secondary: 'border border-slate-300 bg-white text-navy-900 hover:border-slate-400 hover:bg-slate-50',
    ghost: 'bg-transparent text-navy-800 hover:bg-navy-50',
    danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700',
    inverse: 'border border-white/40 bg-transparent text-white hover:bg-white/10',
};

const SIZES = {
    sm: 'h-9 gap-1.5 px-3 text-sm',
    md: 'h-11 gap-2 px-4 text-base',
    lg: 'h-12 gap-2 px-6 text-base',
};
const ICON_ONLY = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-12 w-12' };
const ICON_SIZE = { sm: 16, md: 18, lg: 20 };

export const buttonClasses = ({ variant = 'primary', size = 'md', fullWidth = false, iconOnly = false, className } = {}) =>
    cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-semibold transition-colors duration-fast',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        VARIANTS[variant],
        iconOnly ? ICON_ONLY[size] : SIZES[size],
        fullWidth && 'w-full',
        className
    );

// Buttons and button-looking links. `href` renders a Next.js link; `icon` / `iconEnd` take
// a lucide component; `loading` keeps the width, shows a spinner and blocks clicks.
// Icon-only buttons need `label` (their accessible name).
const Button = forwardRef(function Button(
    { variant = 'primary', size = 'md', href, icon, iconEnd, iconFlip = false, loading = false, fullWidth = false, label, className, children, type = 'button', disabled, ...rest },
    ref
) {
    const iconOnly = !children && Boolean(icon || label);
    const classes = buttonClasses({ variant, size, fullWidth, iconOnly, className });
    const content = (
        <>
            {loading ? (
                <Icon as={Loader2} size={ICON_SIZE[size]} className="animate-spin" />
            ) : (
                icon && <Icon as={icon} size={ICON_SIZE[size]} flip={iconFlip} />
            )}
            {children}
            {iconEnd && <Icon as={iconEnd} size={ICON_SIZE[size]} flip={iconFlip} />}
        </>
    );

    if (href) {
        return (
            <Link ref={ref} href={href} className={classes} aria-label={iconOnly ? label : undefined} {...rest}>
                {content}
            </Link>
        );
    }
    return (
        <button
            ref={ref}
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            aria-label={iconOnly ? label : undefined}
            {...rest}
        >
            {content}
        </button>
    );
});

export default Button;
