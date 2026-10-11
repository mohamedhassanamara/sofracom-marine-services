import { getGalleryEntries } from '../lib/gallery';
import { getCategories } from '../lib/products';
import { showGalleryLink } from '../lib/siteSettings';
import { sitemapEntries, sitemapXml } from '../lib/seo';

// /sitemap.xml: every public page in every locale, with hreflang alternates.
export async function getServerSideProps({ res, locale, defaultLocale }) {
    if (locale !== defaultLocale) return { notFound: true };
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
    res.end(sitemapXml(sitemapEntries(getCategories(), { gallery: showGalleryLink(getGalleryEntries().length) })));
    return { props: {} };
}

export default function Sitemap() {
    return null;
}
