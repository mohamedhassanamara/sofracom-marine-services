import Link from 'next/link';
import { useMemo } from 'react';
import { getCategories } from '../../lib/products';
import { sortByAlphabet } from '../../lib/sort';
import { useLang } from '../../contexts/LangContext';
import { localizeCategory } from '../../lib/localize';
import CartWidget from '../../components/cart/CartWidget';
import ResponsiveImage from '../../components/ui/ResponsiveImage';
import Seo from '../../components/Seo';

export function getStaticProps() {
    const categories = getCategories();
    return {
        props: {
            categories,
        },
    };
}

export default function ProductsIndex({ categories = [] }) {
    const { lang, t } = useLang();
    const localizedCategories = useMemo(
        () => categories.map(category => localizeCategory(category, lang)),
        [categories, lang]
    );
    const sortedCategories = useMemo(
        () => sortByAlphabet(localizedCategories, category => category.name, lang),
        [localizedCategories, lang]
    );

    return (
        <>
            <Seo title={t('seo.products.title')} description={t('seo.products.description')} path="/products" />
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <p className="text-sm text-slate-500 uppercase tracking-wide">SOFRACOM Catalog</p>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                        Explore categories & products
                    </h1>
                    <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
                        Browse the latest antifouling systems, sealants, oils, batteries, and hardware supplied from Monastir.
                    </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedCategories.map(category => (
                        <Link
                            key={category.slug}
                            href={`/products/${category.slug}`}
                            className="product-card space-y-4 p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition hover:-translate-y-1"
                            data-tilt
                        >
                            <ResponsiveImage src={category.image} alt={category.name} sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 260px" className="card-img" />
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">{category.name}</h2>
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{category.description}</p>
                            </div>
                            <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                                <span>{category.products.length} products</span>
                                <span className="tag px-3 py-1 rounded-full text-xs bg-navy-100 text-navy-700">View</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
            <CartWidget />
        </>
    );
}
