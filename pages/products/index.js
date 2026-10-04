import Link from 'next/link';
import Seo from '../../components/Seo';
import { Breadcrumb, Button, ResponsiveImage } from '../../components/ui';
import { ArrowRight, Icon, MessageSquareText } from '../../components/ui/icons';
import { useLang } from '../../contexts/LangContext';
import { localizeCategory } from '../../lib/localize';
import { cardCategory, getCategories } from '../../lib/products';

export function getStaticProps() {
    return { props: { categories: getCategories().map(cardCategory) } };
}

export default function ProductsIndex({ categories = [] }) {
    const { lang, t } = useLang();
    return (
        <>
            <Seo title={t('seo.products.title')} description={t('seo.products.description')} path="/products" />
            <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.products') }]} />
                <h1 className="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">{t('catalog.title')}</h1>
                <p className="mt-2 max-w-2xl text-slate-600">{t('catalog.subtitle')}</p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map(raw => {
                        const category = localizeCategory(raw, lang);
                        return (
                            <li key={category.slug}>
                                <Link href={`/products/${category.slug}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow duration-base hover:shadow-md">
                                    <span className="block aspect-[16/10] overflow-hidden bg-slate-100">
                                        <ResponsiveImage src={category.image} alt="" sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" priority={false} className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]" />
                                    </span>
                                    <span className="flex flex-1 flex-col gap-2 p-5">
                                        <span className="text-lg font-semibold text-slate-900">{category.name}</span>
                                        {category.description && <span className="line-clamp-2 text-sm text-slate-600">{category.description}</span>}
                                        <span className="mt-auto flex items-center justify-between pt-2 text-sm">
                                            <span className="text-slate-600">{t('header.productsCount', { count: raw.count })}</span>
                                            <Icon as={ArrowRight} size={18} flip className="text-navy-700" />
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-xl bg-navy-50 p-6 sm:flex-row sm:items-center">
                    <div>
                        <p className="font-semibold text-navy-900">{t('header.servicesPitch')}</p>
                        <p className="mt-1 text-sm text-slate-700">{t('faq.a5')}</p>
                    </div>
                    <Button href="/quote" icon={MessageSquareText}>
                        {t('nav.quote')}
                    </Button>
                </div>
            </div>
        </>
    );
}
