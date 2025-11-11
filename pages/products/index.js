import Link from 'next/link';
import { getCategories } from '../../lib/products';

export function getStaticProps() {
    const categories = getCategories();
    return {
        props: {
            categories,
        },
    };
}

export default function ProductsIndex({ categories = [] }) {
    return (
        <main className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center mb-10">
                <p className="text-sm text-gray-500 uppercase tracking-wide">SOFRACOM Catalog</p>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                    Explore categories & products
                </h1>
                <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                    Browse the latest antifouling systems, sealants, oils, batteries, and hardware supplied from Monastir.
                </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(category => (
                    <Link
                        key={category.slug}
                        href={`/products/${category.slug}`}
                        className="product-card space-y-4 p-6 bg-white rounded-3xl shadow hover:shadow-xl transition transform hover:-translate-y-1"
                        data-tilt
                    >
                        <img src={category.image} alt={category.name} className="card-img" />
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{category.description}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                            <span>{category.products.length} products</span>
                            <span className="tag px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">View</span>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
