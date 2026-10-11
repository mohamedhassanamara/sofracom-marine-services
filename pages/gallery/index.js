import { useEffect, useMemo, useState } from 'react';
import Seo from '../../components/Seo';
import { Badge, Breadcrumb, Button, Dialog, EmptyState, ResponsiveImage, Segmented } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { ChevronLeft, ChevronRight, Icon, ImageIcon, Play } from '../../components/ui/icons';
import { useLang } from '../../contexts/LangContext';
import useFormat from '../../hooks/useFormat';
import { getGalleryEntries } from '../../lib/gallery';
import { langAttrs } from '../../lib/i18n/locales';

const YOUTUBE_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/;
const youtubeId = src => (src || '').match(YOUTUBE_ID)?.[1] || null;

const localized = (entry, lang) => {
    const own = lang !== 'en' ? entry.translations?.[lang] || {} : {};
    return {
        ...entry,
        title: own.title || entry.title,
        description: own.description || entry.description,
        contentLang: { title: own.title || lang === 'en' ? lang : 'en', description: own.description || lang === 'en' ? lang : 'en' },
    };
};

export function getStaticProps() {
    return { props: { entries: getGalleryEntries() } };
}

function Media({ entry, large = false }) {
    const id = youtubeId(entry.src);
    if (entry.type === 'video') {
        if (large && id) {
            return (
                <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                    title={entry.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full rounded-xl bg-black"
                />
            );
        }
        return id ? <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-base ease-out group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center bg-navy-900 text-white">▶</span>;
    }
    return large ? (
        <ResponsiveImage src={entry.src} alt={entry.title} sizes="(min-width: 1024px) 900px, 100vw" className="max-h-[70vh] w-full rounded-xl bg-surface object-contain" />
    ) : (
        <ResponsiveImage src={entry.src} alt="" sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw" className="h-auto w-full transition-transform duration-base ease-out group-hover:scale-[1.03]" />
    );
}

export default function GalleryPage({ entries = [] }) {
    const { t, lang } = useLang();
    const format = useFormat();
    const [filter, setFilter] = useState('all');
    const [open, setOpen] = useState(-1);
    const items = useMemo(() => entries.map(entry => localized(entry, lang)).filter(entry => filter === 'all' || entry.type === filter), [entries, filter, lang]);
    const current = items[open] || null;
    const step = delta => setOpen(index => (index + delta + items.length) % items.length);

    // ←/→ browse in the lightbox (mirrored in Arabic).
    useEffect(() => {
        if (open < 0 || items.length < 2) return undefined;
        const onKey = event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            if (event.target.closest?.('iframe, input, textarea, select')) return;
            const forward = (event.key === 'ArrowRight') !== (lang === 'ar');
            step(forward ? 1 : -1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, items.length, lang]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <Seo title={t('seo.gallery.title')} description={t('seo.gallery.description')} path="/gallery" />
            <div className="mx-auto max-w-wide px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('gallery.title') }]} />
                <h1 className="mt-6 text-[2.25rem] font-semibold leading-tight text-ink lg:text-display-2">{t('gallery.subtitle')}</h1>
                <p className="mt-4 max-w-2xl text-body-lg text-ink-muted">{t('gallery.description')}</p>
                <Segmented
                    className="mt-8"
                    label={t('gallery.filterLabel')}
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'all', label: t('gallery.filterAll') },
                        { value: 'image', label: t('gallery.filterImages') },
                        { value: 'video', label: t('gallery.filterVideos') },
                    ]}
                />
                {items.length ? (
                    // Masonry: CSS columns, each photo at its own height.
                    <ul className="mt-10 columns-1 gap-6 sm:columns-2 lg:columns-3">
                        {items.map((entry, index) => (
                            <li key={entry.id} className="mb-8 break-inside-avoid">
                                <article className="group">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(index)}
                                        className={cx('relative block w-full overflow-hidden rounded-2xl bg-surface', entry.type === 'video' && 'aspect-video')}
                                        aria-label={entry.type === 'video' ? t('gallery.play', { title: entry.title }) : t('gallery.open', { title: entry.title })}
                                    >
                                        <Media entry={entry} />
                                        {entry.type === 'video' && (
                                            <span className="absolute inset-0 flex items-center justify-center bg-navy-950/25">
                                                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-navy-900 shadow-soft">
                                                    <Icon as={Play} size={28} />
                                                </span>
                                            </span>
                                        )}
                                    </button>
                                    <div className="mt-4 flex flex-col gap-1.5">
                                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
                                            {t(entry.type === 'video' ? 'gallery.video' : 'gallery.image')}
                                            {entry.date && (
                                                <>
                                                    <span aria-hidden="true">·</span>
                                                    <time dateTime={entry.date} className="font-normal normal-case tracking-normal text-ink-muted">
                                                        {format.date(entry.date)}
                                                    </time>
                                                </>
                                            )}
                                        </p>
                                        <h2 className="line-clamp-2 text-lg font-semibold text-ink" {...langAttrs(entry.contentLang.title, lang)}>
                                            {entry.title}
                                        </h2>
                                        {entry.description && (
                                            <p className="line-clamp-3 text-ink-muted" {...langAttrs(entry.contentLang.description, lang)}>
                                                {entry.description}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState className="mt-6" icon={ImageIcon} title={t('gallery.empty')} />
                )}
            </div>

            <Dialog
                open={Boolean(current)}
                onClose={() => setOpen(-1)}
                title={current?.title || ''}
                description={items.length > 1 ? t('gallery.counter', { n: open + 1, total: items.length }) : undefined}
                size="xl"
                footer={
                    items.length > 1 ? (
                        <div className="flex justify-between gap-3">
                            <Button variant="secondary" icon={ChevronLeft} iconFlip onClick={() => step(-1)}>
                                {t('ui.previous')}
                            </Button>
                            <Button variant="secondary" iconEnd={ChevronRight} iconFlip onClick={() => step(1)}>
                                {t('ui.next')}
                            </Button>
                        </div>
                    ) : null
                }
            >
                {current && (
                    <div className="flex flex-col gap-4">
                        <Media entry={current} large />
                        {current.description && (
                            <p className="whitespace-pre-line text-ink" {...langAttrs(current.contentLang.description, lang)}>
                                {current.description}
                            </p>
                        )}
                        {current.tags?.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                                {current.tags.map(tag => (
                                    <li key={tag}>
                                        <Badge tone="primary" size="sm">
                                            {tag}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </Dialog>
        </>
    );
}
