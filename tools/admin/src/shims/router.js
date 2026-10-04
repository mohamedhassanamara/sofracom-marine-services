// next/router for the admin: English, no locale routing.
const router = {
    locale: 'en',
    locales: ['en'],
    defaultLocale: 'en',
    pathname: '/',
    asPath: '/',
    query: {},
    isReady: true,
    push: () => Promise.resolve(true),
    replace: () => Promise.resolve(true),
    events: { on() {}, off() {} },
};
export const useRouter = () => router;
export default router;
