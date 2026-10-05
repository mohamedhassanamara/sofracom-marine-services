import { useState } from 'react';
import { Button, Field, Input, Select, Textarea, useToast } from '../../../../components/ui';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from '../../../../components/ui/icons';
import { siteUrl, upload } from '../api';
import { Confirm, Panel } from '../components/common';

const slugify = value =>
    (value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

// The 1–3 products drawn on the category's tile (home, shop menu, /products). Empty =
// automatic: in-stock products with a photo, one per brand.
const MAX_TILES = 3;
function TileProducts({ category, onChange }) {
    const products = category.products || [];
    const ids = (category.featuredProductIds || []).filter(id => products.some(product => product.id === id));
    const byId = new Map(products.map(product => [product.id, product]));
    const photo = product => siteUrl(String((product.images || [])[0] || product.image || '').replace(/-800\.webp$/, '-400.webp'));
    return (
        <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-800">Tile products</p>
            <p className="text-sm text-slate-600">Up to {MAX_TILES} products shown on the category tile (approved cutouts are used automatically). Leave empty to pick automatically.</p>
            <ul className="mt-3 flex flex-wrap gap-3">
                {ids.map(id => (
                    <li key={id} className="flex w-40 flex-col rounded-md border border-slate-200 bg-white p-2">
                        <img src={photo(byId.get(id))} alt="" className="aspect-square w-full rounded bg-surface object-contain" />
                        <span className="mt-1 line-clamp-2 text-xs text-slate-700">{byId.get(id).title}</span>
                        <Button size="sm" variant="ghost" icon={X} className="mt-1 self-start" onClick={() => onChange(ids.filter(item => item !== id))}>
                            Remove
                        </Button>
                    </li>
                ))}
            </ul>
            {ids.length < MAX_TILES && products.length > 0 && (
                <label className="mt-3 flex max-w-md flex-col gap-1 text-sm">
                    <span className="sr-only">Add a tile product</span>
                    <Select value="" onChange={event => event.target.value && onChange([...ids, event.target.value])}>
                        <option value="">{ids.length ? 'Add another product…' : 'Choose products (automatic until you do)…'}</option>
                        {products
                            .filter(product => !ids.includes(product.id))
                            .map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.title}
                                </option>
                            ))}
                    </Select>
                </label>
            )}
        </div>
    );
}

export default function Categories({ store }) {
    const toast = useToast();
    const [deleting, setDeleting] = useState(null);
    const categories = store.doc.categories;
    const savedSlugs = new Set((store.saved?.categories || []).map(category => category.slug));
    const counts = new Map();
    categories.forEach(category => counts.set(category.slug, (counts.get(category.slug) || 0) + 1));

    const set = (index, changes) => store.update(draft => Object.assign(draft.categories[index], changes));
    const setTranslation = (index, lang, field, value) =>
        store.update(draft => {
            const category = draft.categories[index];
            category.translations = category.translations || {};
            category.translations[lang] = { ...(category.translations[lang] || {}), [field]: value };
        });
    const move = (index, delta) =>
        store.update(draft => {
            const [item] = draft.categories.splice(index, 1);
            draft.categories.splice(index + delta, 0, item);
        });
    const add = () =>
        store.update(draft => {
            let slug = 'new-category';
            for (let n = 2; draft.categories.some(category => category.slug === slug); n += 1) slug = `new-category-${n}`;
            draft.categories.push({ name: 'New category', slug, description: '', image: '', translations: { fr: { name: '', description: '' }, ar: { name: '', description: '' } }, products: [] });
        });
    const uploadImage = async (index, file) => {
        try {
            const path = await upload(file, 'categories');
            set(index, { image: path });
        } catch (err) {
            toast.show({ tone: 'danger', title: 'Upload failed', description: err.message });
        }
    };

    return (
        <div className="space-y-4">
            {categories.map((category, index) => {
                const slugTaken = counts.get(category.slug) > 1;
                const slugUnsafe = category.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(category.slug);
                const isNew = !savedSlugs.has(category.slug);
                return (
                    <Panel
                        key={index}
                        title={`${index + 1}. ${category.name || 'Untitled'}`}
                        actions={
                            <div className="flex gap-1">
                                <Button size="sm" variant="ghost" icon={ChevronUp} label="Move up" disabled={index === 0} onClick={() => move(index, -1)} />
                                <Button size="sm" variant="ghost" icon={ChevronDown} label="Move down" disabled={index === categories.length - 1} onClick={() => move(index, 1)} />
                                <Button size="sm" variant="ghost" icon={Trash2} label="Delete category" onClick={() => setDeleting(index)} className="text-danger-700" />
                            </div>
                        }
                    >
                        <div className="grid gap-4 lg:grid-cols-[10rem_1fr]">
                            <div>
                                {category.image ? <img src={siteUrl(category.image.replace(/-800\.webp$/, '-400.webp'))} alt="" className="aspect-square w-full rounded-md border border-slate-200 object-cover" /> : <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">No image</div>}
                                <label className="mt-2 block cursor-pointer text-center text-sm font-semibold text-accent-700 hover:underline">
                                    Upload image
                                    <input type="file" accept="image/*" className="sr-only" onChange={event => event.target.files[0] && uploadImage(index, event.target.files[0])} />
                                </label>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Name (EN)" required>
                                    <Input value={category.name} onChange={event => set(index, { name: event.target.value, ...(isNew ? { slug: slugify(event.target.value) } : {}) })} />
                                </Field>
                                <Field
                                    label="URL slug"
                                    hint={isNew ? `Page: /products/${category.slug || '…'}` : 'Changing it changes the URL of the category and all its products.'}
                                    error={slugTaken ? 'Another category already uses this slug.' : isNew && slugUnsafe ? 'Use a–z, 0–9 and dashes only.' : undefined}
                                >
                                    <Input value={category.slug || ''} onChange={event => set(index, { slug: event.target.value.toLowerCase() })} className="font-mono" />
                                </Field>
                                <Field label="Description (EN)" className="md:col-span-2">
                                    <Textarea rows={2} value={category.description || ''} onChange={event => set(index, { description: event.target.value })} />
                                </Field>
                                {['fr', 'ar'].map(lang => (
                                    <div key={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className="space-y-3 rounded-md bg-slate-50 p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold uppercase text-slate-600">{lang}</p>
                                            {category.translations?.[lang]?.needsReview && (
                                                <Button size="sm" variant="secondary" onClick={() => setTranslation(index, lang, 'needsReview', false)}>
                                                    Mark reviewed
                                                </Button>
                                            )}
                                        </div>
                                        <Field label={lang === 'fr' ? 'Nom' : 'الاسم'}>
                                            <Input value={category.translations?.[lang]?.name || ''} onChange={event => setTranslation(index, lang, 'name', event.target.value)} />
                                        </Field>
                                        <Field label={lang === 'fr' ? 'Description' : 'الوصف'}>
                                            <Textarea rows={2} value={category.translations?.[lang]?.description || ''} onChange={event => setTranslation(index, lang, 'description', event.target.value)} />
                                        </Field>
                                    </div>
                                ))}
                                <TileProducts category={category} onChange={ids => set(index, { featuredProductIds: ids })} />
                                <p className="text-sm text-slate-600 md:col-span-2">{(category.products || []).length} products</p>
                            </div>
                        </div>
                    </Panel>
                );
            })}
            <Button icon={Plus} variant="secondary" onClick={add}>
                Add category
            </Button>
            <Confirm
                open={deleting !== null}
                title={`Delete “${categories[deleting]?.name}”?`}
                body={
                    categories[deleting]?.products?.length ? (
                        <p>
                            It still has {categories[deleting].products.length} products. Move or delete them first: deleting a category with products would remove them from the site.
                        </p>
                    ) : (
                        <p>The category is empty. You can undo until you save.</p>
                    )
                }
                confirmLabel="Delete category"
                disabled={Boolean(categories[deleting]?.products?.length)}
                onConfirm={() => {
                    store.update(draft => {
                        draft.categories.splice(deleting, 1);
                    });
                    setDeleting(null);
                }}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}
