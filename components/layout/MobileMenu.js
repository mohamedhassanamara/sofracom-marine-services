import Link from 'next/link';
import { useEffect } from 'react';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import { LOCALES } from '../../lib/i18n/locales';
import Button from '../ui/Button';
import { cx } from '../ui/cx';
import { Drawer } from '../ui/Dialog';
import { MessageSquareText } from '../ui/icons';
import { Segmented } from '../ui/Tabs';
import { LANGUAGE_NAMES, NAV_LINKS } from './SiteHeader';

export default function MobileMenu({ open, onClose }) {
    const { t, lang, setLang } = useLang();
    const { index, load } = useCatalogIndex();
    useEffect(() => {
        if (open) load();
    }, [open, load]);
    const link = 'flex min-h-[2.75rem] items-center rounded-md px-3 font-medium text-slate-900 hover:bg-slate-100';
    return (
        <Drawer open={open} onClose={onClose} title={t('header.menu')} side="start">
            <nav aria-label={t('header.mainNav')} className="flex flex-col gap-6">
                <div>
                    <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{t('header.shopTitle')}</p>
                    <ul>
                        <li>
                            <Link prefetch={false} href="/products" className={cx(link, 'font-semibold')} onClick={onClose}>
                                {t('header.allProducts')}
                            </Link>
                        </li>
                        {(index?.categories || []).map(category => (
                            <li key={category.slug}>
                                <Link prefetch={false} href={`/products/${category.slug}`} className={link} onClick={onClose}>
                                    {category.name[lang] || category.name.en}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <ul className="border-t border-slate-200 pt-4">
                    {NAV_LINKS.map(item => (
                        <li key={item.key}>
                            <Link prefetch={false} href={item.href} className={link} onClick={onClose}>
                                {t(item.key)}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <Link prefetch={false} href="/track" className={link} onClick={onClose}>
                            {t('footer.trackOrder')}
                        </Link>
                    </li>
                </ul>
                <div className="border-t border-slate-200 px-3 pt-4">
                    <p className="mb-2 text-sm font-medium text-slate-800">{t('header.language')}</p>
                    <Segmented label={t('header.language')} value={lang} onChange={setLang} options={LOCALES.map(locale => ({ value: locale, label: LANGUAGE_NAMES[locale] }))} />
                </div>
                <Button href="/quote" prefetch={false} variant="accent" icon={MessageSquareText} fullWidth onClick={onClose}>
                    {t('nav.quote')}
                </Button>
            </nav>
        </Drawer>
    );
}

