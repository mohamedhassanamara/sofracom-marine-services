import { useMemo, useRef, useState } from 'react';
import { Badge, Button, Field, Input, Select, Textarea, useToast } from '../../../../components/ui';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, FileText, Plus, Trash2, X } from '../../../../components/ui/icons';
import { siteUrl, upload } from '../api';
import { Confirm, Panel } from '../components/common';
import { navigate } from '../router';

const STOCK = [
    ['in', 'In stock'],
    ['on-order', 'On order'],
    ['out', 'Out of stock'],
];

const randomId = () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return `p_${[...bytes].map(byte => alphabet[byte % alphabet.length]).join('')}`;
};

export const newProduct = () => ({
    id: randomId(),
    title: '',
    brand: '',
    description: '',
    images: [],
    image: '',
    usage: [],
    variants: [],
    price: 0,
    stock: 'in',
    datasheet: '',
    translations: { fr: { title: '', description: '' }, ar: { title: '', description: '' } },
});

const thumb = path => siteUrl(String(path || '').replace(/-800\.webp$/, '-400.webp'));
const toList = text => text.split(',').map(item => item.trim()).filter(Boolean);

function Images({ images, onChange }) {
    const toast = useToast();
    const [dragging, setDragging] = useState(null);
    const [busy, setBusy] = useState(0);
    const move = (from, to) => {
        if (to < 0 || to >= images.length || from === to) return;
        const next = [...images];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        onChange(next);
    };
    const addFiles = async files => {
        const list = [...files];
        setBusy(list.length);
        const added = [];
        for (const file of list) {
            try {
                added.push(await upload(file, 'products'));
            } catch (err) {
                toast.show({ tone: 'danger', title: `${file.name} not uploaded`, description: err.message });
            }
            setBusy(count => count - 1);
        }
        if (added.length) {
            onChange([...images, ...added]);
            toast.show({ title: `${added.length} photo${added.length > 1 ? 's' : ''} added`, description: 'Resized to WebP (400/800/1600 px).' });
        }
    };
    return (
        <div>
            <ul className="flex flex-wrap gap-3">
                {images.map((path, index) => (
                    <li
                        key={`${path}-${index}`}
                        draggable
                        onDragStart={() => setDragging(index)}
                        onDragOver={event => event.preventDefault()}
                        onDrop={() => {
                            move(dragging, index);
                            setDragging(null);
                        }}
                        className={`relative w-32 cursor-grab rounded-md border-2 bg-white p-1 ${index === 0 ? 'border-navy-900' : 'border-slate-200'} ${dragging === index ? 'opacity-50' : ''}`}
                    >
                        <img src={thumb(path)} alt="" className="aspect-square w-full object-contain" draggable={false} />
                        {index === 0 && <span className="absolute start-1 top-1 rounded bg-navy-900 px-1.5 text-xs font-semibold text-white">Main</span>}
                        <div className="mt-1 flex justify-between">
                            <Button size="sm" variant="ghost" icon={ChevronLeft} label="Move earlier" disabled={index === 0} onClick={() => move(index, index - 1)} className="h-7 w-7" />
                            <Button size="sm" variant="ghost" icon={X} label="Remove photo" onClick={() => onChange(images.filter((_, i) => i !== index))} className="h-7 w-7 text-danger-700" />
                            <Button size="sm" variant="ghost" icon={ChevronRight} label="Move later" disabled={index === images.length - 1} onClick={() => move(index, index + 1)} className="h-7 w-7" />
                        </div>
                    </li>
                ))}
                <li>
                    <label
                        className="flex aspect-square w-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-center text-sm font-semibold text-accent-700 hover:border-accent-600"
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                            event.preventDefault();
                            addFiles(event.dataTransfer.files);
                        }}
                    >
                        <Plus size={20} />
                        {busy ? `Uploading ${busy}…` : 'Add photos'}
                        <input type="file" accept="image/*" multiple className="sr-only" onChange={event => addFiles(event.target.files)} />
                    </label>
                </li>
            </ul>
            <p className="mt-2 text-sm text-slate-500">Drag to reorder (or use the arrows); the first photo is the main one. Uploads are resized automatically.</p>
        </div>
    );
}

export default function ProductEditor({ store, id }) {
    const toast = useToast();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const datasheetInput = useRef(null);
    const location = useMemo(() => {
        for (let c = 0; c < store.doc.categories.length; c += 1) {
            const p = (store.doc.categories[c].products || []).findIndex(product => product.id === id);
            if (p >= 0) return { c, p };
        }
        return null;
    }, [store.doc, id]);

    if (!location) {
        return (
            <p className="text-slate-600">
                Product not found. <a href="#/catalog" className="text-accent-700 underline">Back to the catalog</a>
            </p>
        );
    }
    const category = store.doc.categories[location.c];
    const product = category.products[location.p];
    const isSaved = (store.saved?.categories || []).some(cat => (cat.products || []).some(item => item.id === id));

    const edit = mutate =>
        store.update(draft => {
            mutate(draft.categories[location.c].products[location.p], draft);
        });
    const set = changes => edit(item => Object.assign(item, changes));
    const setImages = images => set({ images, image: images[0] || '' });
    const setTranslation = (lang, field, value) =>
        edit(item => {
            item.translations = item.translations || {};
            item.translations[lang] = { ...(item.translations[lang] || {}), [field]: value };
        });
    const setVariant = (index, changes) => edit(item => Object.assign(item.variants[index], changes));
    const setVariantLabel = (lang, index, value) =>
        edit(item => {
            item.translations = item.translations || {};
            const entry = (item.translations[lang] = item.translations[lang] || {});
            entry.variants = Array.from({ length: item.variants.length }, (_, i) => entry.variants?.[i] || { label: '' });
            entry.variants[index] = { label: value };
        });
    const moveTo = slug =>
        store.update(draft => {
            const [item] = draft.categories[location.c].products.splice(location.p, 1);
            draft.categories.find(cat => cat.slug === slug).products.unshift(item);
        });
    const uploadDatasheet = async file => {
        try {
            set({ datasheet: await upload(file, 'datasheets') });
            toast.show({ title: 'Datasheet uploaded' });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Upload failed', description: err.message });
        }
    };
    const images = product.images?.length ? product.images : product.image ? [product.image] : [];

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <a href="#/catalog" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline">
                    <ArrowLeft size={16} /> Products
                </a>
                <span className="font-mono text-sm text-slate-500">{product.id}</span>
                {isSaved && (
                    <a href={`https://sofracom-marine-services.vercel.app/products/${category.slug}/${product.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
                        Live page <ExternalLink size={14} />
                    </a>
                )}
                <Button size="sm" variant="ghost" icon={Trash2} className="ms-auto text-danger-700" onClick={() => setConfirmDelete(true)}>
                    Delete product
                </Button>
            </div>
            <div className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
                <div className="space-y-6">
                    <Panel title="Product">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Title (EN)" required className="md:col-span-2">
                                <Input value={product.title} onChange={event => set({ title: event.target.value })} />
                            </Field>
                            <Field label="Brand">
                                <Input value={product.brand || ''} onChange={event => set({ brand: event.target.value })} />
                            </Field>
                            <Field label="Category" hint="Moving changes the product's page address; links to the old address stop working.">
                                <Select value={category.slug} onChange={event => moveTo(event.target.value)}>
                                    {store.doc.categories.map(cat => (
                                        <option key={cat.slug} value={cat.slug}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Description (EN)" className="md:col-span-2">
                                <Textarea rows={6} value={product.description || ''} onChange={event => set({ description: event.target.value })} />
                            </Field>
                            <Field label="Uses / tags (comma separated)" hint="Shown as tags and used by search and the “Use” filter. Common words are translated automatically." className="md:col-span-2">
                                <Input value={(product.usage || []).join(', ')} onChange={event => set({ usage: toList(event.target.value) })} />
                            </Field>
                        </div>
                    </Panel>
                    <Panel title="Photos">
                        <Images images={images} onChange={setImages} />
                    </Panel>
                    <Panel title="Price, options and stock" actions={<Button size="sm" variant="secondary" icon={Plus} onClick={() => edit(item => item.variants.push({ label: '', price: '', stock: 'in' }))}>Add option</Button>}>
                        {product.variants?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-slate-600">
                                        <tr>
                                            <th className="pb-2 text-start font-semibold">Option (EN)</th>
                                            <th className="pb-2 text-start font-semibold">Price (TND)</th>
                                            <th className="pb-2 text-start font-semibold">Stock</th>
                                            <th className="pb-2 text-start font-semibold">FR</th>
                                            <th className="pb-2 text-start font-semibold">AR</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {product.variants.map((variant, index) => (
                                            <tr key={index} className="align-top">
                                                <td className="pe-2 pb-2">
                                                    <Input size="sm" value={variant.label} onChange={event => setVariant(index, { label: event.target.value })} aria-label={`Option ${index + 1} label`} />
                                                </td>
                                                <td className="pe-2 pb-2">
                                                    <Input size="sm" type="number" min="0" step="0.001" inputMode="decimal" value={variant.price} onChange={event => setVariant(index, { price: event.target.value === '' ? '' : Number(event.target.value) })} aria-label={`Option ${index + 1} price`} className="w-28" />
                                                </td>
                                                <td className="pe-2 pb-2">
                                                    <Select size="sm" value={variant.stock || 'in'} onChange={event => setVariant(index, { stock: event.target.value })} aria-label={`Option ${index + 1} stock`}>
                                                        {STOCK.map(([value, label]) => (
                                                            <option key={value} value={value}>
                                                                {label}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                </td>
                                                <td className="pe-2 pb-2">
                                                    <Input size="sm" value={product.translations?.fr?.variants?.[index]?.label || ''} onChange={event => setVariantLabel('fr', index, event.target.value)} aria-label={`Option ${index + 1} French label`} />
                                                </td>
                                                <td className="pe-2 pb-2">
                                                    <Input size="sm" dir="rtl" value={product.translations?.ar?.variants?.[index]?.label || ''} onChange={event => setVariantLabel('ar', index, event.target.value)} aria-label={`Option ${index + 1} Arabic label`} />
                                                </td>
                                                <td className="pb-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        icon={Trash2}
                                                        label={`Remove option ${index + 1}`}
                                                        className="text-danger-700"
                                                        onClick={() =>
                                                            edit(item => {
                                                                item.variants.splice(index, 1);
                                                                ['fr', 'ar'].forEach(lang => item.translations?.[lang]?.variants?.splice(index, 1));
                                                            })
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="mt-1 text-sm text-slate-500">Prices in TND with up to 3 decimals (e.g. 341.887). Options with a price use their own price; the cards show the lowest as “from”.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Price (TND)" hint="Up to 3 decimals">
                                    <Input type="number" min="0" step="0.001" inputMode="decimal" value={product.price ?? ''} onChange={event => set({ price: event.target.value === '' ? '' : Number(event.target.value) })} />
                                </Field>
                                <Field label="Stock">
                                    <Select value={product.stock || 'in'} onChange={event => set({ stock: event.target.value })}>
                                        {STOCK.map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            </div>
                        )}
                    </Panel>
                    <Panel title="Datasheet">
                        <div className="flex flex-wrap items-center gap-3">
                            {product.datasheet ? (
                                <a href={siteUrl(product.datasheet)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-accent-700 hover:underline">
                                    <FileText size={18} /> {product.datasheet.split('/').pop()}
                                </a>
                            ) : (
                                <span className="text-slate-500">No datasheet</span>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => datasheetInput.current?.click()}>
                                Upload PDF
                            </Button>
                            {product.datasheet && (
                                <Button size="sm" variant="ghost" className="text-danger-700" onClick={() => set({ datasheet: '' })}>
                                    Remove
                                </Button>
                            )}
                            <input ref={datasheetInput} type="file" accept="application/pdf" className="sr-only" onChange={event => event.target.files[0] && uploadDatasheet(event.target.files[0])} />
                        </div>
                    </Panel>
                </div>
                <div className="grid content-start gap-6 lg:grid-cols-2 2xl:grid-cols-1">
                    {['fr', 'ar'].map(lang => {
                        const entry = product.translations?.[lang] || {};
                        return (
                            <Panel
                                key={lang}
                                title={lang === 'fr' ? 'Français' : 'العربية'}
                                actions={
                                    entry.needsReview ? (
                                        <div className="flex items-center gap-2">
                                            <Badge tone="warning" size="sm">
                                                Draft to review
                                            </Badge>
                                            <Button size="sm" variant="secondary" onClick={() => setTranslation(lang, 'needsReview', false)}>
                                                Mark reviewed
                                            </Button>
                                        </div>
                                    ) : null
                                }
                            >
                                <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className="grid gap-4">
                                    <Field label={lang === 'fr' ? 'Titre' : 'العنوان'}>
                                        <Input value={entry.title || ''} onChange={event => setTranslation(lang, 'title', event.target.value)} />
                                    </Field>
                                    {entry.suggestedTitle && entry.suggestedTitle !== entry.title && (
                                        <div className="flex flex-wrap items-center gap-2 rounded-md bg-accent-50 p-3 text-sm text-accent-800">
                                            <span className="flex-1">Suggestion: {entry.suggestedTitle}</span>
                                            <Button size="sm" variant="secondary" onClick={() => edit(item => Object.assign(item.translations[lang], { title: entry.suggestedTitle, suggestedTitle: undefined }))}>
                                                Use it
                                            </Button>
                                        </div>
                                    )}
                                    <Field label={lang === 'fr' ? 'Description' : 'الوصف'} hint={entry.description ? undefined : 'Empty: the English description is shown.'}>
                                        <Textarea rows={6} value={entry.description || ''} onChange={event => setTranslation(lang, 'description', event.target.value)} />
                                    </Field>
                                    <Field label={lang === 'fr' ? 'Usages (séparés par des virgules)' : 'الاستخدامات (مفصولة بفواصل)'} hint="Empty: the English tags are translated automatically.">
                                        <Input value={(entry.usage || []).join(', ')} onChange={event => setTranslation(lang, 'usage', toList(event.target.value))} />
                                    </Field>
                                </div>
                            </Panel>
                        );
                    })}
                </div>
            </div>
            <Confirm
                open={confirmDelete}
                title={`Delete “${product.title || 'this product'}”?`}
                body={<p>It disappears from the site when you publish. Reviews and past orders keep its id ({product.id}). You can undo until you save.</p>}
                confirmLabel="Delete product"
                onConfirm={() => {
                    store.update(draft => {
                        draft.categories[location.c].products.splice(location.p, 1);
                    });
                    setConfirmDelete(false);
                    navigate('/catalog');
                }}
                onClose={() => setConfirmDelete(false)}
            />
        </>
    );
}
