import { useState } from 'react';
import { Badge, Button, Field, Input, Select, Textarea, useToast } from '../../../../components/ui';
import { ChevronDown, ChevronUp, Plus, Trash2 } from '../../../../components/ui/icons';
import { siteUrl, upload } from '../api';
import { Confirm, PageHeader, Panel } from '../components/common';
import SaveBar from '../components/SaveBar';
import useDocumentStore from '../components/useDocumentStore';

const YOUTUBE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/;
const newId = () => `gallery-${Math.random().toString(36).slice(2, 7)}`;

export default function Gallery({ onSaved }) {
    const store = useDocumentStore({ url: '/api/gallery', field: 'gallery', label: 'Gallery' });
    const toast = useToast();
    const [deleting, setDeleting] = useState(null);
    const entries = store.doc?.entries || [];

    const set = (index, changes) => store.update(draft => Object.assign(draft.entries[index], changes));
    const setTranslation = (index, lang, field, value) =>
        store.update(draft => {
            const entry = draft.entries[index];
            entry.translations = entry.translations || {};
            entry.translations[lang] = { ...(entry.translations[lang] || {}), [field]: value };
        });
    const move = (index, delta) =>
        store.update(draft => {
            const [item] = draft.entries.splice(index, 1);
            draft.entries.splice(index + delta, 0, item);
        });
    const add = type =>
        store.update(draft => {
            draft.entries.unshift({ id: newId(), type, title: '', description: '', src: '', tags: [], date: new Date().toISOString().slice(0, 10), translations: { fr: { title: '', description: '' }, ar: { title: '', description: '' } } });
        });
    const uploadImage = async (index, file) => {
        try {
            set(index, { src: await upload(file, 'gallery') });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Upload failed', description: err.message });
        }
    };

    return (
        <>
            <PageHeader
                title="Gallery"
                subtitle="Photos and videos on /gallery. Saved to gallery.json; Publish puts them on the site."
                actions={
                    <>
                        <Button icon={Plus} variant="secondary" onClick={() => add('image')} disabled={!store.doc}>
                            Add photo
                        </Button>
                        <Button icon={Plus} variant="secondary" onClick={() => add('video')} disabled={!store.doc}>
                            Add video
                        </Button>
                    </>
                }
            />
            {store.doc && <SaveBar store={store} onSaved={onSaved} />}
            {!store.doc && <p className="text-slate-500">{store.error ? store.error.message : 'Loading…'}</p>}
            <div className="space-y-4">
                {entries.map((entry, index) => {
                    const youtube = entry.src?.match(YOUTUBE)?.[1];
                    return (
                        <Panel
                            key={entry.id}
                            title={
                                <span className="flex items-center gap-2">
                                    <Badge size="sm" tone={entry.type === 'video' ? 'info' : 'neutral'}>
                                        {entry.type}
                                    </Badge>
                                    {entry.title || 'Untitled'}
                                </span>
                            }
                            actions={
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" icon={ChevronUp} label="Move up" disabled={index === 0} onClick={() => move(index, -1)} />
                                    <Button size="sm" variant="ghost" icon={ChevronDown} label="Move down" disabled={index === entries.length - 1} onClick={() => move(index, 1)} />
                                    <Button size="sm" variant="ghost" icon={Trash2} label="Delete entry" className="text-danger-700" onClick={() => setDeleting(index)} />
                                </div>
                            }
                        >
                            <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
                                <div>
                                    {entry.type === 'video' ? (
                                        youtube ? <img src={`https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`} alt="" className="aspect-video w-full rounded-md object-cover" /> : <div className="flex aspect-video items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">Paste a YouTube link</div>
                                    ) : entry.src ? (
                                        <img src={siteUrl(entry.src.replace(/-800\.webp$/, '-400.webp'))} alt="" className="aspect-video w-full rounded-md object-cover" />
                                    ) : (
                                        <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">No photo</div>
                                    )}
                                    {entry.type === 'image' && (
                                        <label className="mt-2 block cursor-pointer text-center text-sm font-semibold text-accent-700 hover:underline">
                                            Upload photo
                                            <input type="file" accept="image/*" className="sr-only" onChange={event => event.target.files[0] && uploadImage(index, event.target.files[0])} />
                                        </label>
                                    )}
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Type">
                                        <Select value={entry.type} onChange={event => set(index, { type: event.target.value })}>
                                            <option value="image">Photo</option>
                                            <option value="video">Video (YouTube)</option>
                                        </Select>
                                    </Field>
                                    <Field label="Date">
                                        <Input type="date" value={entry.date || ''} onChange={event => set(index, { date: event.target.value })} />
                                    </Field>
                                    {entry.type === 'video' && (
                                        <Field label="YouTube link" className="md:col-span-2" error={entry.src && !youtube ? 'Not a YouTube link.' : undefined}>
                                            <Input value={entry.src} onChange={event => set(index, { src: event.target.value.trim() })} placeholder="https://www.youtube.com/watch?v=…" />
                                        </Field>
                                    )}
                                    <Field label="Title (EN)" required className="md:col-span-2">
                                        <Input value={entry.title} onChange={event => set(index, { title: event.target.value })} />
                                    </Field>
                                    <Field label="Description (EN)" className="md:col-span-2">
                                        <Textarea rows={3} value={entry.description || ''} onChange={event => set(index, { description: event.target.value })} />
                                    </Field>
                                    <Field label="Tags (comma separated)" className="md:col-span-2">
                                        <Input value={(entry.tags || []).join(', ')} onChange={event => set(index, { tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} />
                                    </Field>
                                    {['fr', 'ar'].map(lang => (
                                        <div key={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className="space-y-3 rounded-md bg-slate-50 p-3">
                                            <p className="text-sm font-semibold uppercase text-slate-600">{lang}</p>
                                            <Field label={lang === 'fr' ? 'Titre' : 'العنوان'}>
                                                <Input value={entry.translations?.[lang]?.title || ''} onChange={event => setTranslation(index, lang, 'title', event.target.value)} />
                                            </Field>
                                            <Field label={lang === 'fr' ? 'Description' : 'الوصف'}>
                                                <Textarea rows={3} value={entry.translations?.[lang]?.description || ''} onChange={event => setTranslation(index, lang, 'description', event.target.value)} />
                                            </Field>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Panel>
                    );
                })}
            </div>
            <Confirm
                open={deleting !== null}
                title={`Delete “${entries[deleting]?.title || 'this entry'}”?`}
                body={<p>It disappears from /gallery when you publish. You can undo until you save.</p>}
                confirmLabel="Delete"
                onConfirm={() => {
                    store.update(draft => {
                        draft.entries.splice(deleting, 1);
                    });
                    setDeleting(null);
                }}
                onClose={() => setDeleting(null)}
            />
        </>
    );
}
