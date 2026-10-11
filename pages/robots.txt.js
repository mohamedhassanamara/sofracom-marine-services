import { robotsTxt } from '../lib/seo';

export async function getServerSideProps({ res, locale, defaultLocale }) {
    if (locale !== defaultLocale) return { notFound: true };
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
    res.end(robotsTxt());
    return { props: {} };
}

export default function Robots() {
    return null;
}
