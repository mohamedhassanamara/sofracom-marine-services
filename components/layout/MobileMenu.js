import Link from 'next/link';
import { useEffect } from 'react';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import { LOCALES } from '../../lib/i18n/locales';
import { cx } from '../ui/cx';
import { Drawer } from '../ui/Dialog';
import { Icon, MessageSquareText } from '../ui/icons';
import { Segmented } from '../ui/Tabs';
import { LANGUAGE_NAMES, NAV_LINKS } from './SiteHeader';

// The phone menu: categories, the main links, tracking, language and Get a quote.
export default function MobileMenu({ open, onClose }) {
    const { t, lang, setLang } = useLang();
    const { index, load } = useCatalogIndex();
    useEffect(() => {
        if (open) load();
    }, [open, load]);
    const link = 'flex min-h-[3rem] items-center text-[1.0625rem] text-ink hover:underline';
    return (
        <Drawer open={open} onClose={onClose} title={t('header.menu')} side="start">
            <nav aria-label={t('header.mainNav')} className="flex flex-col gap-8 pb-4">
                <Link prefetch={false} href="/quote" onClick={onClose} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-navy-900 px-6 text-[0.9375rem] font-semibold text-white hover:bg-navy-800">
                    <Icon as={MessageSquareText} size={18} />
                    {t('nav.quote')}
                </Link>
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{t('header.shopTitle')}</p>
                    <ul className="divide-y divide-line">
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
                <ul className="divide-y divide-line border-t border-line">
                    {NAV_LINKS.map(item => (
                        <li key={item.key}>
                            <Link prefetch={false} href={item.href} className={link} onClick={onClose}>
                                {t(item.key)}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <Link prefetch={false} href="/#contact" className={link} onClick={onClose}>
                            {t('nav.contact')}
                        </Link>
                    </li>
                    <li>
                        <Link prefetch={false} href="/track" className={link} onClick={onClose}>
                            {t('footer.trackOrder')}
                        </Link>
                    </li>
                </ul>
                <div>
                    <p className="mb-2 text-sm font-medium text-ink">{t('header.language')}</p>
                    <Segmented label={t('header.language')} value={lang} onChange={setLang} options={LOCALES.map(locale => ({ value: locale, label: LANGUAGE_NAMES[locale] }))} />
                </div>
            </nav>
        </Drawer>
    );
}
