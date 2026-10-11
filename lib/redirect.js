// Where to send someone after they sign in or sign up. Only same-site paths are
// allowed (no `//evil.com`, no absolute URLs), and auth pages never redirect to
// themselves.
const AUTH_PAGES = ['/account/login', '/account/signup', '/account/reset'];

export function safeNext(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
        return null;
    }
    const path = value.split(/[?#]/)[0];
    if (AUTH_PAGES.includes(path)) return null;
    return value;
}

export const afterAuthPath = nextParam => safeNext(nextParam) || '/account';

// Link to the login (or signup) page that brings the user back to `currentPath`.
export function authLink(page, currentPath, { hash = '' } = {}) {
    let back = safeNext(currentPath) || '';
    if (back && hash) back = `${back.split('#')[0]}#${hash}`;
    return back ? `/account/${page}?next=${encodeURIComponent(back)}` : `/account/${page}`;
}
