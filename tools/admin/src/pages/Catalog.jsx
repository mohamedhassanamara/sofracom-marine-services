import { useMemo, useState } from 'react';
import { Badge, Button, Input, Select } from '../../../../components/ui';
import { Plus } from '../../../../components/ui/icons';
import useFormat from '../../../../hooks/useFormat';
import { priceRange } from '../../../../lib/format';
import { siteUrl } from '../api';
import { Empty, PageHeader } from '../components/common';
import SaveBar from '../components/SaveBar';
import useDocumentStore from '../components/useDocumentStore';
import { navigate } from '../router';
import Categories from './Categories';
import ProductEditor, { newProduct } from './ProductEditor';

const translationState = (product, lang) => {
    const entry = product.translations?.[lang];
    if (!entry?.title) return { tone: 'danger', text: 'missing' };
    if (entry.needsReview) return { tone: 'warning', text: 'draft' };
    return { tone: 'success', text: '✓' };
};

function ProductsTable({ store, query }) {
    const format = useFormat();
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('');
    const [review, setReview] = useState(query.get('review') === '1');
    const rows = useMemo(() => {
        const words = q.toLowerCase().split(/\s+/).filter(Boolean);
        return store.doc.categories.flatMap(cat =>
            (cat.products || [])
                .filter(product => !category || cat.slug === category)
                .filter(product => !review || ['fr', 'ar'].some(lang => translationState(product, lang).text !== '✓'))
                .filter(product => {
                    const haystack = [product.title, product.brand, product.id, product.translations?.fr?.title, product.translations?.ar?.title].join(' ').toLowerCase();
                    return words.every(word => haystack.includes(word));
                })
                .map(product => ({ product, category: cat }))
        );
    }, [store.doc, q, category, review]);

    const addProduct = () => {
        const slug = category || store.doc.categories[0]?.slug;
        const product = newProduct();
        store.update(draft => {
            draft.categories.find(cat => cat.slug === slug).products.unshift(product);
        });
        navigate(`/catalog/product/${product.id}`);
    };

    return (
        <>
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <label className="min-w-[14rem] flex-1 text-sm font-medium text-slate-700">
                    Search
                    <Input className="mt-1" value={q} onChange={event => setQ(event.target.value)} placeholder="Title, brand, id, FR/AR title" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                    Category
                    <Select className="mt-1 min-w-[12rem]" value={category} onChange={event => setCategory(event.target.value)}>
                        <option value="">All</option>
                        {store.doc.categories.map(cat => (
                            <option key={cat.slug} value={cat.slug}>
                                {cat.name}
                            </option>
                        ))}
                    </Select>
                </label>
                <label className="flex h-11 items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={review} onChange={event => setReview(event.target.checked)} />
                    Translations to review
                </label>
                <Button icon={Plus} onClick={addProduct}>
                    New product
                </Button>
            </div>
            <p className="mb-2 text-sm text-slate-600">{rows.length} products</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="w-16 px-3 py-2.5" />
                            <th className="px-3 py-2.5 text-start font-semibold">Product</th>
                            <th className="px-3 py-2.5 text-start font-semibold">Category</th>
                            <th className="px-3 py-2.5 text-end font-semibold">Price</th>
                            <th className="px-3 py-2.5 text-start font-semibold">Stock</th>
                            <th className="px-3 py-2.5 text-start font-semibold">FR</th>
                            <th className="px-3 py-2.5 text-start font-semibold">AR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {rows.map(({ product, category: cat }) => {
                            const { min, varies } = priceRange(product);
                            const stocks = [...new Set((product.variants?.length ? product.variants.map(v => v.stock || 'in') : [product.stock || 'in']))];
                            return (
                                <tr key={product.id || product.title} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/catalog/product/${product.id}`)}>
                                    <td className="px-3 py-2">
                                        {(product.images?.[0] || product.image) && <img src={siteUrl((product.images?.[0] || product.image).replace(/-800\.webp$/, '-400.webp'))} alt="" className="h-12 w-12 rounded-md border border-slate-200 bg-white object-contain" />}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="font-medium text-slate-900">{product.title || <i className="text-slate-400">untitled</i>}</span>
                                        <span className="block font-mono text-xs text-slate-500">
                                            {product.id || 'new'} · {product.brand}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-700">{cat.name}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-end font-semibold">
                                        {varies && <span className="font-normal text-slate-500">from </span>}
                                        {format.price(min)}
                                    </td>
                                    <td className="px-3 py-2">
                                        {stocks.map(stock => (
                                            <Badge key={stock} size="sm" tone={stock === 'in' ? 'success' : stock === 'out' ? 'danger' : 'warning'} className="me-1">
                                                {stock}
                                            </Badge>
                                        ))}
                                    </td>
                                    {['fr', 'ar'].map(lang => {
                                        const state = translationState(product, lang);
                                        return (
                                            <td key={lang} className="px-3 py-2">
                                                <Badge size="sm" tone={state.tone}>
                                                    {state.text}
                                                </Badge>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!rows.length && <Empty>No products match.</Empty>}
            </div>
        </>
    );
}

export default function Catalog({ route, onSaved }) {
    const store = useDocumentStore({ url: '/api/catalog', field: 'catalog', label: 'Catalog' });
    const [, view, id] = route.parts;
    const tabs = (
        <div className="flex gap-1 rounded-md border border-slate-300 bg-white p-0.5">
            <a href="#/catalog" className={`rounded px-3 py-1.5 text-sm font-semibold ${view !== 'categories' ? 'bg-navy-900 text-white' : 'text-slate-700'}`}>
                Products
            </a>
            <a href="#/catalog/categories" className={`rounded px-3 py-1.5 text-sm font-semibold ${view === 'categories' ? 'bg-navy-900 text-white' : 'text-slate-700'}`}>
                Categories
            </a>
        </div>
    );
    return (
        <>
            <PageHeader title="Catalog" subtitle="Edits are saved to products.json on this computer; Publish puts them on the website." actions={tabs} />
            {store.doc && <SaveBar store={store} onSaved={onSaved} />}
            {!store.doc ? (
                <p className="text-slate-500">{store.error ? store.error.message : 'Loading…'}</p>
            ) : view === 'categories' ? (
                <Categories store={store} />
            ) : view === 'product' && id ? (
                <ProductEditor store={store} id={id} key={id} />
            ) : (
                <ProductsTable store={store} query={route.query} />
            )}
        </>
    );
}
