import Head from 'next/head';
import { useRouter } from 'next/router';
import { useLang } from '../contexts/LangContext';
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl, alternates, canonicalPath, canonicalUrl, ogLocale } from '../lib/seo';
import { LOCALES } from '../lib/i18n/locales';

// Title, description, canonical + hreflang, OpenGraph/Twitter and JSON-LD for one page.
// `path` defaults to the current route without its query; `noindex` for private pages.
export default function Seo({ title, description, path, image = DEFAULT_OG_IMAGE, type = 'website', noindex = false, jsonLd = [] }) {
    const router = useRouter();
    const { lang } = useLang();
    const pagePath = canonicalPath(path || router.asPath);
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME}: marine supplies & boat services in Monastir`;
    const url = canonicalUrl(pagePath, lang);
    const blocks = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean);

    return (
        <Head>
            <title key="title">{fullTitle}</title>
            {description && <meta key="description" name="description" content={description} />}
            {noindex ? (
                <meta key="robots" name="robots" content="noindex, follow" />
            ) : (
                <>
                    <link key="canonical" rel="canonical" href={url} />
                    {alternates(pagePath).map(alt => (
                        <link key={`alt-${alt.hrefLang}`} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
                    ))}
                </>
            )}
            <meta key="og:type" property="og:type" content={type} />
            <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
            <meta key="og:title" property="og:title" content={fullTitle} />
            {description && <meta key="og:description" property="og:description" content={description} />}
            <meta key="og:url" property="og:url" content={url} />
            <meta key="og:image" property="og:image" content={absoluteUrl(image)} />
            <meta key="og:locale" property="og:locale" content={ogLocale(lang)} />
            {LOCALES.filter(locale => locale !== lang).map(locale => (
                <meta key={`og:locale:${locale}`} property="og:locale:alternate" content={ogLocale(locale)} />
            ))}
            <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
            {blocks.map((data, index) => (
                <script
                    key={`jsonld-${index}`}
                    type="application/ld+json"
                    // JSON-LD must be raw JSON; "<" is escaped so content can't close the tag.
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
                />
            ))}
        </Head>
    );
}
