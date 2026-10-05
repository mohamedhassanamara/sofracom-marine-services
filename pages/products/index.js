import Link from 'next/link';
import Seo from '../../components/Seo';
import { Breadcrumb, Button, CategoryArt } from '../../components/ui';
import { ArrowRight, Icon, MessageSquareText } from '../../components/ui/icons';
import { useLang } from '../../contexts/LangContext';
import { langAttrs } from '../../lib/i18n/locales';
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
            <div className="mx-auto max-w-wide px-4 pt-8 sm:px-6 lg:pt-12">
                <Breadcrumb items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.products') }]} />
                <h1 className="mt-8 text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-title-1 lg:text-display-2">{t('catalog.title')}</h1>
                <p className="mt-4 max-w-2xl text-body-lg text-ink-muted">{t('catalog.subtitle')}</p>
                <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
                    {categories.map(raw => {
                        const category = localizeCategory(raw, lang);
                        return (
                            <li key={category.slug}>
                                <Link prefetch={false} href={`/products/${category.slug}`} className="group block">
                                    <CategoryArt images={raw.tiles.map(tile => tile.image)} fallback={raw.image} sizes="(min-width: 1024px) 220px, 45vw" className="aspect-[4/3] rounded-2xl" />
                                    <span className="mt-5 flex items-start justify-between gap-4">
                                        <span className="min-w-0">
                                            <span className="block font-display text-xl font-semibold tracking-[-0.01em] text-ink group-hover:underline">{category.name}</span>
                                            {category.description && (
                                                <span className="mt-1 line-clamp-2 block text-ink-muted" {...langAttrs(category.contentLang.description, lang)}>
                                                    {category.description}
                                                </span>
                                            )}
                                            <span className="mt-2 block text-sm text-ink-muted">{t('header.productsCount', { count: raw.count })}</span>
                                        </span>
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink transition-colors duration-fast group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-white" aria-hidden="true">
                                            <Icon as={ArrowRight} size={18} flip />
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-20 flex flex-col items-start justify-between gap-6 border-t border-line pt-10 sm:flex-row sm:items-center">
                    <div className="max-w-2xl">
                        <p className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">{t('header.servicesPitch')}</p>
                        <p className="mt-2 text-ink-muted">{t('faq.a5')}</p>
                    </div>
                    <Button href="/quote" size="lg" icon={MessageSquareText}>
                        {t('nav.quote')}
                    </Button>
                </div>
            </div>
        </>
    );
}
