// Tailwind v3 with the SOFRACOM tokens only (lib/design/tokens.js): colour, type, radius
// and shadow scales replace Tailwind's defaults, so off-palette classes simply don't exist.
const tokens = require('./lib/design/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}', './contexts/**/*.{js,jsx}', './lib/**/*.{js,jsx}', './hooks/**/*.{js,jsx}'],
    theme: {
        screens: tokens.screens,
        colors: tokens.colors,
        fontSize: tokens.fontSize,
        borderRadius: tokens.borderRadius,
        boxShadow: tokens.boxShadow,
        fontFamily: {
            sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
            mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        },
        extend: {
            transitionTimingFunction: {
                DEFAULT: tokens.motion.easing.standard,
                standard: tokens.motion.easing.standard,
                out: tokens.motion.easing.out,
                in: tokens.motion.easing.in,
            },
            transitionDuration: {
                DEFAULT: tokens.motion.duration.base,
                fast: tokens.motion.duration.fast,
                base: tokens.motion.duration.base,
                slow: tokens.motion.duration.slow,
            },
            maxWidth: { container: '80rem' },
            ringColor: { DEFAULT: tokens.colors.accent[600] },
        },
    },
    plugins: [],
};
