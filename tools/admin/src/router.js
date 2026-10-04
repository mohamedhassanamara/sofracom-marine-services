import { useEffect, useState } from 'react';

// Hash routes (#/orders/abc). Leaving a page with unsaved changes asks first.
const guards = new Set();
let lastHash = window.location.hash;

export const registerGuard = guard => {
    guards.add(guard);
    return () => guards.delete(guard);
};
const blocked = () => [...guards].some(guard => guard());

window.addEventListener('hashchange', event => {
    if (blocked() && !window.confirm('You have unsaved changes. Leave this page without saving?')) {
        window.history.replaceState(null, '', lastHash || '#/');
        event.stopImmediatePropagation();
        return;
    }
    lastHash = window.location.hash;
});
window.addEventListener('beforeunload', event => {
    if (blocked()) {
        event.preventDefault();
        event.returnValue = '';
    }
});

const parse = () => {
    const [path, search = ''] = (window.location.hash.replace(/^#/, '') || '/').split('?');
    return { path: path || '/', parts: path.split('/').filter(Boolean), query: new URLSearchParams(search) };
};

export function useRoute() {
    const [route, setRoute] = useState(parse);
    useEffect(() => {
        const update = () => setRoute(parse());
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, []);
    return route;
}

export const navigate = to => {
    window.location.hash = to.startsWith('#') ? to : `#${to}`;
};
