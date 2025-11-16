import { useMemo, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import { getGalleryEntries } from '../../lib/gallery';

const FILTERS = [
    { value: 'all', labelKey: 'gallery.filterAll' },
    { value: 'image', labelKey: 'gallery.filterImages' },
    { value: 'video', labelKey: 'gallery.filterVideos' },
];

const YOUTUBE_ID_REGEX =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/;

const formatDate = value => {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(value));
    } catch (error) {
        return value;
    }
};

const getYouTubeEmbedUrl = src => {
    if (!src) return null;
    if (src.includes('youtube.com/embed/')) {
        return src;
    }
    const match = src.match(YOUTUBE_ID_REGEX);
    if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
};

function GalleryCard({ entry }) {
    const embedUrl = entry.type === 'video' ? getYouTubeEmbedUrl(entry.src) : null;
    return (
        <article className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="gallery-media">
                {entry.type === 'image' && entry.src && (
                    <img
                        src={entry.src}
                        alt={entry.title}
                        className="gallery-media__image"
                        loading="lazy"
                    />
                )}
                {entry.type === 'video' && embedUrl && (
                    <iframe
                        src={embedUrl}
                        title={entry.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="gallery-media__iframe"
                    />
                )}
                {entry.type === 'video' && !embedUrl && (
                    <div className="gallery-media__fallback">
                        <a
                            href={entry.src}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-blue-900 underline"
                        >
                            View video
                        </a>
                    </div>
                )}
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 text-blue-900">
                    {entry.type === 'image' ? 'Image' : 'Video'}
                </span>
            </div>
            <div className="p-6 flex flex-col gap-3 flex-1">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{entry.title}</h2>
                    {entry.date && (
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {formatDate(entry.date)}
                        </p>
                    )}
                </div>
                <p className="text-sm leading-relaxed text-gray-600 flex-1">
                    {entry.description}
                </p>
                {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                        {entry.tags.map(tag => (
                            <span
                                key={`${entry.id}-${tag}`}
                                className="px-3 py-1 rounded-full bg-blue-50 text-blue-800"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

export function getStaticProps() {
    const entries = getGalleryEntries();
    return {
        props: {
            entries,
        },
    };
}

export default function GalleryPage({ entries = [] }) {
    const { t } = useLang();
    const [filter, setFilter] = useState('all');
    const filteredEntries = useMemo(() => {
        if (!entries.length) return [];
        if (filter === 'all') return entries;
        return entries.filter(entry => entry.type === filter);
    }, [entries, filter]);

    return (
        <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
            <section className="text-center space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                    {t('gallery.title')}
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                    {t('gallery.subtitle')}
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    {t('gallery.description')}
                </p>
            </section>

            <section className="flex flex-wrap gap-3 justify-center">
                {FILTERS.map(item => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => setFilter(item.value)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full border transition ${
                            filter === item.value
                                ? 'bg-blue-900 text-white border-blue-900'
                                : 'bg-white text-blue-900 border-blue-200'
                        }`}
                    >
                        {t(item.labelKey)}
                    </button>
                ))}
            </section>

            <section className="grid gap-6 sm:grid-cols-2">
                {filteredEntries.length ? (
                    filteredEntries.map(entry => (
                        <GalleryCard key={entry.id} entry={entry} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 col-span-full">
                        {t('gallery.empty')}
                    </p>
                )}
            </section>
        </main>
    );
}
