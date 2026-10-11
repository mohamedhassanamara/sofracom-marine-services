import Head from 'next/head';
import { ensureLeadingSlash, srcSetFor } from '../../lib/images';

// <img> with the pre-built WebP widths (400/800/1600) as srcset. Lazy by default; pass
// `priority` for the main above-the-fold image (LCP) so it loads eagerly with high priority.
export default function ResponsiveImage({ src, alt = '', sizes = '100vw', priority = false, width, height, className, ...rest }) {
    if (!src) return null;
    const srcSet = srcSetFor(src);
    const image = (
        <img
            src={ensureLeadingSlash(src)}
            srcSet={srcSetFor(src)}
            sizes={srcSetFor(src) ? sizes : undefined}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : undefined}
            className={className}
            {...rest}
        />
    );
    if (!priority) return image;
    // The main image is requested from <head>, before the scripts (like next/image's priority).
    return (
        <>
            <Head>
                <link key={`preload-${src}`} rel="preload" as="image" href={ensureLeadingSlash(src)} imageSrcSet={srcSet} imageSizes={srcSet ? sizes : undefined} fetchPriority="high" />
            </Head>
            {image}
        </>
    );
}
