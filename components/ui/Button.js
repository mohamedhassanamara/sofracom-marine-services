import Link from 'next/link';
import { forwardRef } from 'react';
import { cx } from './cx';
import { Icon, Loader2 } from './icons';

// v2: pills, no shadows, one blue (navy). Primary = navy fill; every "Get a quote" = the navy
// outline (`quote`, white outline `quoteOnDark` over photos and navy); line-input outlines for
// the rest (3.3:1, visible on white).
export const QUOTE = 'border-[1.5px] border-navy-900 bg-white text-navy-900 hover:bg-navy-900 hover:text-white active:bg-navy-950 active:text-white';
export const QUOTE_ON_DARK = 'border-[1.5px] border-white bg-transparent text-white hover:bg-white hover:text-navy-900 active:bg-white active:text-navy-900';
const VARIANTS = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950',
    quote: QUOTE,
    quoteOnDark: QUOTE_ON_DARK,
    secondary: 'border border-line-input bg-white text-ink hover:border-navy-900',
    ghost: 'bg-transparent text-ink hover:bg-surface',
    danger: 'bg-danger-600 text-white hover:bg-danger-700',
    inverse: 'border border-white/50 bg-transparent text-white hover:bg-white/10',
};

const SIZES = {
    sm: 'h-9 gap-1.5 px-4 text-sm',
    md: 'h-11 gap-2 px-5 text-[0.9375rem]',
    lg: 'h-12 gap-2 px-7 text-[0.9375rem]',
};
const ICON_ONLY = { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-12 w-12' };
const ICON_SIZE = { sm: 16, md: 18, lg: 20 };

export const buttonClasses = ({ variant = 'primary', size = 'md', fullWidth = false, iconOnly = false, className } = {}) =>
    cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition-colors duration-fast',
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
