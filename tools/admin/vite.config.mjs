// The admin SPA. Runs inside tools/admin/server.mjs (Vite middleware mode), so there is one
// process and one port. It reuses the website's UI kit, tokens, i18n and lib/* directly:
// next/link and next/router are swapped for tiny shims.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { transformWithOxc } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

// lib/i18n/locales.js and lib/design/tokens.js are CommonJS (Node and Tailwind load them);
// wrap them as ES modules for the browser. Named exports come from `module.exports = { … }`.
const CJS_SOURCES = /lib[\\/](i18n[\\/]locales|design[\\/]tokens)\.js$/;
const cjsShim = {
    name: 'sofracom-cjs-shim',
    enforce: 'pre',
    transform(code, id) {
        if (!CJS_SOURCES.test(id)) return null;
        const names = [...code.matchAll(/module\.exports\s*=\s*\{([^}]*)\}/g)].flatMap(match => match[1].split(',').map(name => name.trim()).filter(Boolean));
        return {
            code: `const __cjs = { exports: {} };\n(function (module, exports) {\n${code}\n})(__cjs, __cjs.exports);\nexport default __cjs.exports;\n${names.map(name => `export const ${name} = __cjs.exports.${name};`).join('\n')}\n`,
            map: null,
        };
    },
};

// The site's components, contexts and hooks are JSX in .js files (Next.js allows it; Vite
// picks the parser from the extension). Compile them as JSX before Vite's own transform.
const SITE_JSX = /[\\/](components|contexts|hooks|pages)[\\/].*\.js$/;
const siteJsx = {
    name: 'sofracom-site-jsx',
    enforce: 'pre',
    async transform(code, id) {
        if (!SITE_JSX.test(id) || id.includes('node_modules') || !id.startsWith(root) || !/<[A-Za-z>]/.test(code)) return null;
        const result = await transformWithOxc(code, `${id}x`, { lang: 'jsx', jsx: { runtime: 'automatic' }, sourcemap: true });
        return { code: result.code, map: result.map };
    },
};

export default {
    root: here,
    plugins: [cjsShim, siteJsx, react()],
    resolve: {
        alias: {
            'next/link': path.join(here, 'src/shims/Link.jsx'),
            'next/router': path.join(here, 'src/shims/router.js'),
        },
    },
    css: { postcss: path.join(here, 'postcss.config.cjs') },
    optimizeDeps: {
        entries: [path.join(here, 'index.html')],
        // The dependency scan reads source files too: let it parse JSX in .js.
        rolldownOptions: { moduleTypes: { '.js': 'jsx' } },
    },
    server: { fs: { allow: [root] } },
};
