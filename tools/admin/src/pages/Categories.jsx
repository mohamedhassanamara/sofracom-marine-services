import { useEffect, useState } from 'react';
import { Button, CategoryArt, Field, Input, Select, Textarea } from '../../../../components/ui';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Trash2, X } from '../../../../components/ui/icons';
import { pickTileProducts, tileProduct } from '../../../../lib/categoryTiles.js';
import { isCutout } from '../../../../lib/images.js';
import { api, siteUrl } from '../api';
import { Confirm, Panel } from '../components/common';

const slugify = value =>
    (value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

// The 1–3 products drawn on the category's tile (home, shop menu, /products, link previews).
// Categories have no picture of their own. Empty = automatic (lib/categoryTiles.js: approved
// cutouts, in stock, most reviewed, varied). The preview is drawn exactly like the site's tile.
const MAX_TILES = 3;
function TileProducts({ category, art, onChange }) {
    const [dragging, setDragging] = useState(null);
    const products = category.products || [];
    const ids = (category.featuredProductIds || []).filter(id => products.some(product => product.id === id));
    const byId = new Map(products.map(product => [product.id, product]));
    const tileProducts = products.map(product => tileProduct(product, art.resolve));
    const picked = pickTileProducts(tileProducts, { featuredIds: ids, popularity: art.popularity });
    const photo = product => siteUrl(String(tileProduct(product, art.resolve).image).replace(/-800\.webp$/, '-400.webp'));
    const move = (from, to) => {
        if (from === null || to < 0 || to >= ids.length || from === to) return;
        const next = [...ids];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        onChange(next);
    };
    const cutouts = picked.filter(product => isCutout(product.image)).length;
    return (
        <div className="grid gap-4 md:col-span-2 lg:grid-cols-[1fr_18rem]">
            <div>
                <p className="text-sm font-medium text-slate-800">Tile products</p>
                <p className="text-sm text-slate-600">
                    Pick 1–{MAX_TILES} products and drag them into order, or leave empty to pick automatically (approved cutouts first, in stock, most reviewed, different brands). The tile uses approved cutouts; photos only when there are none.
                </p>
                {ids.length > 0 && (
                    <ol className="mt-3 flex flex-wrap gap-3">
                        {ids.map((id, index) => (
                            <li
                                key={id}
                                draggable
                                onDragStart={() => setDragging(index)}
                                onDragOver={event => event.preventDefault()}
                                onDrop={() => {
                                    move(dragging, index);
                                    setDragging(null);
                                }}
                                className={`flex w-40 cursor-grab flex-col rounded-md border border-slate-200 bg-white p-2 ${dragging === index ? 'opacity-50' : ''}`}
                            >
                                <img src={photo(byId.get(id))} alt="" draggable={false} className="aspect-square w-full rounded bg-surface object-contain" />
                                <span className="mt-1 line-clamp-2 text-xs text-slate-700">
                                    {index + 1}. {byId.get(id).title}
                                </span>
                                <div className="mt-1 flex justify-between">
                                    <Button size="sm" variant="ghost" icon={ChevronLeft} label="Move earlier" disabled={index === 0} onClick={() => move(index, index - 1)} className="h-7 w-7" />
                                    <Button size="sm" variant="ghost" icon={X} label={`Remove ${byId.get(id).title}`} onClick={() => onChange(ids.filter(item => item !== id))} className="h-7 w-7 text-danger-700" />
                                    <Button size="sm" variant="ghost" icon={ChevronRight} label="Move later" disabled={index === ids.length - 1} onClick={() => move(index, index + 1)} className="h-7 w-7" />
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
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
                                        {isCutout(tileProduct(product, art.resolve).image) ? ' (cutout)' : ''}
                                    </option>
                                ))}
                        </Select>
                    </label>
                )}
                {ids.length > 0 && (
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => onChange([])}>
                        Back to automatic
                    </Button>
                )}
            </div>
            <figure>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface" data-tile-preview={category.slug}>
                    <CategoryArt images={picked.map(product => siteUrl(product.image))} tight sizes="300px" className="!absolute inset-x-[6%] bottom-[5%] top-[22%] !bg-transparent" />
                    <span className="absolute start-4 top-4 font-display text-lg font-semibold leading-tight text-ink">{category.name || 'New category'}</span>
                </div>
                <figcaption className="mt-1 text-xs text-slate-600">
                    {ids.length ? 'Your picks' : 'Automatic'} · {picked.length ? `${picked.length} product${picked.length > 1 ? 's' : ''}, ${cutouts ? `${cutouts} cutout${cutouts > 1 ? 's' : ''}` : 'original photos (no approved cutouts yet)'}` : 'no products yet: an icon is shown'}
                </figcaption>
            </figure>
        </div>
    );
}

// What the tile preview needs: approved cutouts (to swap in) and the review counts.
function useTileArt() {
    const [art, setArt] = useState({ resolve: src => src, popularity: {} });
    useEffect(() => {
        Promise.all([api('/api/cutouts').catch(() => ({ images: [] })), fetch(siteUrl('assets/data/popularity.json')).then(response => response.json()).catch(() => ({}))]).then(([cutouts, popularity]) => {
            const approved = new Map(cutouts.images.filter(image => image.status === 'approved' && image.preview).map(image => [image.src, image.preview]));
            setArt({ resolve: src => approved.get(src) || src, popularity: popularity.counts || {} });
        });
    }, []);
    return art;
}

export default function Categories({ store }) {
    const art = useTileArt();
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
            draft.categories.push({ name: 'New category', slug, description: '', translations: { fr: { name: '', description: '' }, ar: { name: '', description: '' } }, products: [] });
        });
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
                        <div>
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
                                <TileProducts category={category} art={art} onChange={ids => set(index, { featuredProductIds: ids.length ? ids : undefined })} />
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
