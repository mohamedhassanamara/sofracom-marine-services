// Which photo the site shows: the approved cutout of an original, else the original.
// The manifest (public/assets/data/cutouts.json) is written by tools/shared/cutouts.mjs and
// reviewed in the admin app; "pending" and "original" entries never reach the site.
const withSlash = value => (value ? `/${String(value).replace(/^\//, '')}` : '');

export function cutoutResolver(manifest) {
    const approved = new Map(
        Object.entries(manifest?.images || {})
            .filter(([, entry]) => entry && entry.status === 'approved' && entry.cutout)
            .map(([src, entry]) => [withSlash(src), withSlash(entry.cutout)])
    );
    return src => (src ? approved.get(withSlash(src)) || src : src);
}
