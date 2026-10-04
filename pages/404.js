import Seo from '../components/Seo';
import SearchBox from '../components/layout/SearchBox';
import { Button } from '../components/ui';
import { Icon, MessageSquareText, Search, ShoppingCart } from '../components/ui/icons';
import { useLang } from '../contexts/LangContext';

export default function NotFound() {
    const { t } = useLang();
    return (
        <>
            <Seo title={t('notFound.title')} noindex />
            <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                    <Icon as={Search} size={30} />
                </span>
                <p className="mt-6 font-mono text-sm font-semibold text-accent-700">404</p>
                <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">{t('notFound.title')}</h1>
                <p className="mt-3 text-slate-600">{t('notFound.body')}</p>
                <SearchBox variant="light" label={t('search.title')} className="mt-8 w-full max-w-md text-start" />
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button href="/products" icon={ShoppingCart}>
                        {t('home.hero.shop')}
                    </Button>
                    <Button href="/quote" variant="secondary" icon={MessageSquareText}>
                        {t('nav.quote')}
                    </Button>
                    <Button href="/" variant="ghost">
                        {t('nav.home')}
                    </Button>
                </div>
            </div>
        </>
    );
}
