import Head from 'next/head';
import { ensureLeadingSlash, srcSetFor } from '../../lib/images';

// The home hero: a portrait crop on phones, the landscape photo elsewhere (<picture>), and
// a preload for only the one the device will use (media-scoped), so phones never fetch
// the large landscape file before their LCP.
const PHONE = '(max-width: 640px)';

export default function HeroImage({ image, mobile = [], position, className }) {
    const landscape = srcSetFor(image);
    const portrait = mobile.join(', ');
    return (
        <>
            <Head>
                {portrait && <link key="hero-preload-phone" rel="preload" as="image" media={PHONE} imageSrcSet={portrait} imageSizes="100vw" fetchPriority="high" />}
                <link key="hero-preload-wide" rel="preload" as="image" media={portrait ? '(min-width: 641px)' : undefined} href={ensureLeadingSlash(image)} imageSrcSet={landscape} imageSizes="100vw" fetchPriority="high" />
            </Head>
            <picture>
                {portrait && <source media={PHONE} srcSet={portrait} sizes="100vw" />}
                <img src={ensureLeadingSlash(image)} srcSet={landscape} sizes="100vw" alt="" decoding="async" fetchPriority="high" className={className} style={position ? { objectPosition: position } : undefined} />
            </picture>
        </>
    );
}
