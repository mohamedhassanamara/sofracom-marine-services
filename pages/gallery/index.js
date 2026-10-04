import { useEffect, useMemo, useState } from 'react';
import Seo from '../../components/Seo';
import { Badge, Breadcrumb, Button, Dialog, EmptyState, ResponsiveImage, Segmented } from '../../components/ui';
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
                    className="aspect-video w-full rounded-lg bg-black"
                />
            );
        }
        return id ? <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center bg-navy-900 text-white">▶</span>;
    }
    return large ? (
        <ResponsiveImage src={entry.src} alt={entry.title} sizes="(min-width: 1024px) 900px, 100vw" className="max-h-[70vh] w-full rounded-lg bg-slate-100 object-contain" />
    ) : (
        <ResponsiveImage src={entry.src} alt="" sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]" />
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
            <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('gallery.title') }]} />
                <h1 className="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">{t('gallery.subtitle')}</h1>
                <p className="mt-2 max-w-2xl text-slate-600">{t('gallery.description')}</p>
                <Segmented
                    className="mt-6"
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
                    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((entry, index) => (
                            <li key={entry.id}>
                                <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(index)}
                                        className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
                                        aria-label={entry.type === 'video' ? t('gallery.play', { title: entry.title }) : t('gallery.open', { title: entry.title })}
                                    >
                                        <Media entry={entry} />
                                        {entry.type === 'video' && (
                                            <span className="absolute inset-0 flex items-center justify-center bg-navy-950/30">
                                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md">
                                                    <Icon as={Play} size={26} />
                                                </span>
                                            </span>
                                        )}
                                    </button>
                                    <div className="flex flex-1 flex-col gap-2 p-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Badge tone={entry.type === 'video' ? 'info' : 'neutral'} size="sm">
                                                {t(entry.type === 'video' ? 'gallery.video' : 'gallery.image')}
                                            </Badge>
                                            {entry.date && <time dateTime={entry.date}>{format.date(entry.date)}</time>}
                                        </div>
                                        <h2 className="line-clamp-2 font-semibold text-slate-900" {...langAttrs(entry.contentLang.title, lang)}>
                                            {entry.title}
                                        </h2>
                                        {entry.description && (
                                            <p className="line-clamp-3 text-sm text-slate-600" {...langAttrs(entry.contentLang.description, lang)}>
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
                            <p className="whitespace-pre-line text-slate-700" {...langAttrs(current.contentLang.description, lang)}>
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
