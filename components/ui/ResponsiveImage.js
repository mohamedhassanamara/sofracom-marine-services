import { ensureLeadingSlash, srcSetFor } from '../../lib/images';

// <img> with the pre-built WebP widths (400/800/1600) as srcset. Lazy by default; pass
// `priority` for the main above-the-fold image (LCP) so it loads eagerly with high priority.
export default function ResponsiveImage({ src, alt = '', sizes = '100vw', priority = false, width, height, className, ...rest }) {
    if (!src) return null;
    return (
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
}
