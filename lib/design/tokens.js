// SOFRACOM design tokens: the single source for colours, type, radii, elevation and
// motion. Used by tailwind.config.js (site), the local admin app and, for the status
// palette, the staff phone app. CommonJS so plain Node and the Tailwind config can load it.
//
// Contrast (WCAG AA, 4.5:1 for text) on white: navy 500+ / accent 600+ / slate 500+ /
// success 700+ / warning 700+ / danger 600+. Badge text uses the 800 shade on the 50 tint.

const navy = {
    50: '#eef3fb',
    100: '#d9e3f4',
    200: '#b6c8e8',
    300: '#8aa6d6',
    400: '#5b7fc0',
    500: '#3a5fa6',
    600: '#2a4a8c',
    700: '#1d3a73',
    800: '#142d5f',
    900: '#0b2050', // brand
    950: '#061336',
};

// From the brand sky blue #24b4ff (400). Use 600+ for text and links on white.
const accent = {
    50: '#ecf8ff',
    100: '#d4efff',
    200: '#a9e0ff',
    300: '#6ccbff',
    400: '#24b4ff', // brand
    500: '#0a98e6',
    600: '#0072b2',
    700: '#00629a',
    800: '#054f7a',
    900: '#0a4166',
};

const slate = {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8', // borders/icons only: fails AA as text
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
};

const success = { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46' };
const warning = { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e' };
const danger = { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' };
// Info is the accent: one blue family besides navy.
const info = { 50: accent[50], 100: accent[100], 200: accent[200], 500: accent[500], 600: accent[600], 700: accent[700], 800: accent[800] };

const colors = {
    transparent: 'transparent',
    current: 'currentColor',
    white: '#ffffff',
    black: '#000000',
    navy,
    accent,
    slate,
    success,
    warning,
    danger,
    info,
    star: warning[600], // 3:1 against white, as a graphic
};

// One status palette for the website, the admin app and the staff app.
// tone → { fg, bg, border, solid } ; solid is for dots/chips on white (≥3:1).
const tones = {
    neutral: { fg: slate[700], bg: slate[100], border: slate[300], solid: slate[500] },
    info: { fg: accent[800], bg: accent[50], border: accent[200], solid: accent[600] },
    primary: { fg: navy[800], bg: navy[50], border: navy[200], solid: navy[600] },
    warning: { fg: warning[800], bg: warning[50], border: warning[200], solid: warning[600] },
    success: { fg: success[800], bg: success[50], border: success[200], solid: success[600] },
    danger: { fg: danger[800], bg: danger[50], border: danger[200], solid: danger[600] },
};

const statusTone = {
    order: {
        pending: 'warning',
        confirmed: 'info',
        preparing: 'info',
        out_for_delivery: 'primary',
        delivered: 'success',
        cancelled: 'danger',
    },
    quote: {
        received: 'warning',
        in_review: 'info',
        quoted: 'primary',
        accepted: 'success',
        declined: 'danger',
        completed: 'neutral',
    },
    stock: {
        in: 'success',
        'on-order': 'warning',
        out: 'danger',
    },
};

// Eight sizes: [font-size, line-height].
const fontSize = {
    xs: ['0.75rem', '1rem'], // 12
    sm: ['0.875rem', '1.25rem'], // 14
    base: ['1rem', '1.5rem'], // 16
    lg: ['1.125rem', '1.75rem'], // 18
    xl: ['1.375rem', '1.875rem'], // 22
    '2xl': ['1.75rem', '2.25rem'], // 28
    '3xl': ['2.25rem', '2.625rem'], // 36
    '4xl': ['3rem', '3.375rem'], // 48
};

const borderRadius = {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.5rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
};

// Three elevations: resting cards, raised (hover, menus), overlays (dialogs, drawers).
const boxShadow = {
    none: 'none',
    sm: '0 1px 2px rgb(11 32 80 / 0.06), 0 1px 3px rgb(11 32 80 / 0.08)',
    md: '0 4px 8px -2px rgb(11 32 80 / 0.10), 0 2px 4px -2px rgb(11 32 80 / 0.06)',
    lg: '0 20px 40px -12px rgb(11 32 80 / 0.28)',
};

const motion = {
    easing: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
    },
    duration: { fast: '150ms', base: '250ms', slow: '400ms' },
};

const screens = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };

module.exports = { colors, tones, statusTone, fontSize, borderRadius, boxShadow, motion, screens };
