import Link from 'next/link';
import Seo from '../components/Seo';
import SearchBox from '../components/layout/SearchBox';
import { Button, CategoryArt } from '../components/ui';
import { MessageSquareText } from '../components/ui/icons';
import { useLang } from '../contexts/LangContext';
import { localizeCategory } from '../lib/localize';
import { cardCategory, getCategories } from '../lib/products';

export function getStaticProps() {
    return { props: { categories: getCategories().map(cardCategory) } };
}

// A friendly dead end: search, the categories, and a way to ask us.
export default function NotFound({ categories = [] }) {
    const { t, lang } = useLang();
    return (
        <>
            <Seo title={t('notFound.title')} noindex />
            <div className="mx-auto max-w-wide px-4 pb-8 pt-16 sm:px-6 lg:pt-24">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="font-display text-display-2 font-semibold text-accent-600 lg:text-display-1">404</p>
                    <h1 className="mt-4 text-[2rem] font-semibold leading-tight text-ink lg:text-title-1">{t('notFound.title')}</h1>
                    <p className="mt-4 text-body-lg text-ink-muted">{t('notFound.body')}</p>
                    <SearchBox variant="light" label={t('search.title')} className="mx-auto mt-10 w-full max-w-lg text-start" />
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Button href="/" variant="secondary">
                            {t('nav.home')}
                        </Button>
                        <Button href="/quote" variant="secondary" icon={MessageSquareText}>
                            {t('nav.quote')}
                        </Button>
                    </div>
                </div>
                <section className="mt-20 lg:mt-28" aria-labelledby="notfound-categories">
                    <h2 id="notfound-categories" className="text-[1.75rem] font-semibold text-ink lg:text-title-2">
                        {t('search.popularCategories')}
                    </h2>
                    <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-6">
                        {categories.map(raw => {
                            const category = localizeCategory(raw, lang);
                            return (
                                <li key={category.slug}>
                                    <Link prefetch={false} href={`/products/${category.slug}`} className="group block">
                                        <CategoryArt images={raw.tiles.map(tile => tile.image)} fallback={raw.image} sizes="200px" className="aspect-square rounded-2xl" />
                                        <span className="mt-3 block text-[0.9375rem] font-medium text-ink group-hover:underline">{category.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </div>
        </>
    );
}
