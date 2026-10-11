// SOFRACOM design tokens: the single source for colours, type, radii, elevation and
// motion. Used by tailwind.config.js (site), the local admin app and, for the status
// palette, the staff phone app. CommonJS so plain Node and the Tailwind config can load it.
//
// One blue only: the navy scale (no bright or sky blue anywhere).
// Contrast (WCAG AA, 4.5:1 for text) on white: navy 500+ / slate 500+ /
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
// `info` is only an alias of navy (kept for code that names the tone).
const info = { 50: navy[50], 100: navy[100], 200: navy[200], 500: navy[500], 600: navy[600], 700: navy[700], 800: navy[800], 900: navy[900] };

// v2 "clean premium": white base, a warm neutral surface for image wells and alternating
// sections, near-black ink with one grey for secondary text, and a single hairline colour.
// ink.muted is 6.9:1 on white and 6.1:1 on surface. line is for hairlines and card edges;
// line.input (3.3:1 on white) outlines controls: inputs, selects, steppers, outline buttons.
const ink = { DEFAULT: '#111111', muted: '#5b5b5b' };
const surface = { DEFAULT: '#f0f0ec', strong: '#e6e6e1' };
const line = { DEFAULT: '#e3e3df', strong: '#d6d6d3', input: '#8e8e8a' };

const colors = {
    transparent: 'transparent',
    current: 'currentColor',
    white: '#ffffff',
    black: '#000000',
    navy,
    slate,
    success,
    warning,
    danger,
    info,
    ink,
    surface,
    line,
    // Filled stars and rating bars (3.2:1 against white, as a graphic); empty stars.
    star: { DEFAULT: warning[600], empty: '#c9c9c4' },
};

// One status palette for the website, the admin app and the staff app.
// tone → { fg, bg, border, solid } ; badges are a 100 tint with 700/800 text (no border);
// solid is for dots/chips on white (≥3:1).
const tones = {
    neutral: { fg: slate[700], bg: slate[100], border: slate[300], solid: slate[500] },
    info: { fg: navy[900], bg: navy[100], border: navy[200], solid: navy[700] },
    primary: { fg: navy[800], bg: navy[100], border: navy[200], solid: navy[600] },
    warning: { fg: warning[800], bg: warning[100], border: warning[200], solid: warning[600] },
    success: { fg: success[800], bg: success[100], border: success[200], solid: success[600] },
    danger: { fg: danger[700], bg: danger[100], border: danger[200], solid: danger[600] },
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
    // v2 headings: big, tight. title-* for section titles, display-* for heroes.
    'title-2': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }], // 32
    'title-1': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }], // 40
    'display-2': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }], // 56
    'display-1': ['4.5rem', { lineHeight: '1.02', letterSpacing: '-0.03em' }], // 72
    'body-lg': ['1.0625rem', '1.6'], // 17
};

const borderRadius = {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.5rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    full: '9999px',
};

// Three elevations: resting cards, raised (hover, menus), overlays (dialogs, drawers).
const boxShadow = {
    none: 'none',
    sm: '0 1px 2px rgb(11 32 80 / 0.06), 0 1px 3px rgb(11 32 80 / 0.08)',
    md: '0 4px 8px -2px rgb(11 32 80 / 0.10), 0 2px 4px -2px rgb(11 32 80 / 0.06)',
    lg: '0 20px 40px -12px rgb(11 32 80 / 0.28)',
    // v2: nearly no shadows; one soft lift for hover and popovers.
    soft: '0 1px 2px rgb(17 17 17 / 0.04), 0 8px 24px -8px rgb(17 17 17 / 0.12)',
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
