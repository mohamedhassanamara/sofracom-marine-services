import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'assets', 'data', 'gallery.json');

const ensurePath = value => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const normalizeEntry = entry => {
    const normalizedTags =
        Array.isArray(entry.tags) && entry.tags.length
            ? entry.tags.map(tag => tag.trim()).filter(Boolean)
            : [];
    return {
        id: entry.id || `gallery-${Math.random().toString(36).slice(2, 7)}`,
        title: entry.title || 'Untitled gallery entry',
        description: entry.description || '',
        type: entry.type === 'video' ? 'video' : 'image',
        src: ensurePath(entry.src || ''),
        tags: normalizedTags,
        date: entry.date || null,
    };
};

const loadRawData = () => {
    if (!fs.existsSync(DATA_PATH)) {
        return { entries: [] };
    }
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
};

export function getGalleryEntries() {
    const data = loadRawData();
    const entries =
        Array.isArray(data.entries) && data.entries.length
            ? data.entries.map(entry => normalizeEntry(entry))
            : [];
    return entries.sort((a, b) => {
        if (a.date && b.date) {
            return new Date(b.date) - new Date(a.date);
        }
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
    });
}
