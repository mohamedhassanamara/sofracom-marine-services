import Link from 'next/link';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import { LOCALES } from '../../lib/i18n/locales';
import { ChevronUp, Clock, Icon, Mail, MapPin, Phone } from '../ui/icons';
import { LANGUAGE_NAMES } from './SiteHeader';

export const CONTACT = {
    phone: '+216 52 663 210',
    phoneHref: 'tel:+21652663210',
    email: 'sofracomtunisia@gmail.com',
    mapsHref: 'https://www.google.com/maps/search/?api=1&query=SOFRACOM+Monastir+Tunisia',
};

function Column({ title, children }) {
    return (
        <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
        </div>
    );
}

const linkClass = 'text-navy-100 underline-offset-2 hover:text-white hover:underline';

export default function SiteFooter() {
    const { t, lang, setLang } = useLang();
    const { index } = useCatalogIndex();
    return (
        <footer className="mt-20 bg-navy-950 text-navy-100">
            <div className="mx-auto grid max-w-container gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                    <Link href="/" className="inline-flex items-center gap-2.5">
                        <img src="/assets/site/logo-400.webp" alt="" width="40" height="40" loading="lazy" className="h-10 w-10 rounded-md ring-1 ring-white/25" />
                        <span className="text-lg font-bold tracking-wide text-white">SOFRACOM</span>
                    </Link>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed">{t('footer.tagline')}</p>
                    <ul className="mt-5 space-y-2.5 text-sm">
                        <li className="flex items-start gap-2.5">
                            <Icon as={MapPin} size={18} className="mt-0.5 text-accent-400" />
                            <span>
                                {t('contact.address2')} ·{' '}
                                <a href={CONTACT.mapsHref} className={linkClass} target="_blank" rel="noreferrer">
                                    {t('footer.directions')}
                                </a>
                            </span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <Icon as={Phone} size={18} className="text-accent-400" />
                            <a href={CONTACT.phoneHref} className={linkClass} aria-label={`${t('footer.phone')} ${CONTACT.phone}`}>
                                <bdi dir="ltr">{CONTACT.phone}</bdi>
                            </a>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <Icon as={Mail} size={18} className="text-accent-400" />
                            <a href={`mailto:${CONTACT.email}`} className={linkClass}>
                                {CONTACT.email}
                            </a>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <Icon as={Clock} size={18} className="mt-0.5 text-accent-400" />
                            <span>{t('contact.hours')}</span>
                        </li>
                    </ul>
                </div>
                <Column title={t('footer.shop')}>
                    <li>
                        <Link href="/products" className={linkClass}>
                            {t('header.allProducts')}
                        </Link>
                    </li>
                    {(index?.categories || []).map(category => (
                        <li key={category.slug}>
                            <Link href={`/products/${category.slug}`} className={linkClass}>
                                {category.name[lang] || category.name.en}
                            </Link>
                        </li>
                    ))}
                </Column>
                <Column title={t('footer.help')}>
                    <li>
                        <Link href="/#services" className={linkClass}>
                            {t('nav.services')}
                        </Link>
                    </li>
                    <li>
                        <Link href="/quote" className={linkClass}>
                            {t('nav.quote')}
                        </Link>
                    </li>
                    <li>
                        <Link href="/track" className={linkClass}>
                            {t('footer.trackOrder')}
                        </Link>
                    </li>
                    <li>
                        <Link href="/#faq" className={linkClass}>
                            {t('footer.faq')}
                        </Link>
                    </li>
                    <li>
                        <Link href="/#contact" className={linkClass}>
                            {t('footer.contact')}
                        </Link>
                    </li>
                </Column>
                <Column title={t('footer.company')}>
                    <li>
                        <Link href="/#about" className={linkClass}>
                            {t('nav.about')}
                        </Link>
                    </li>
                    <li>
                        <Link href="/gallery" className={linkClass}>
                            {t('nav.gallery')}
                        </Link>
                    </li>
                    <li>
                        <Link href="/account" className={linkClass}>
                            {t('nav.account')}
                        </Link>
                    </li>
                    <li className="pt-2">
                        <span className="sr-only">{t('header.language')}: </span>
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                            {LOCALES.map(locale => (
                                <button
                                    key={locale}
                                    type="button"
                                    lang={locale}
                                    onClick={() => setLang(locale)}
                                    aria-current={lang === locale ? 'true' : undefined}
                                    className={lang === locale ? 'font-semibold text-white' : linkClass}
                                >
                                    {LANGUAGE_NAMES[locale]}
                                </button>
                            ))}
                        </span>
                    </li>
                </Column>
            </div>
            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-container flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm sm:px-6">
                    <p>
                        © {new Date().getFullYear()} SOFRACOM · Monastir, Tunisia. {t('footer.rights')}
                    </p>
                    <a href="#top" className={`${linkClass} inline-flex items-center gap-1.5`}>
                        <Icon as={ChevronUp} size={16} />
                        {t('footer.backToTop')}
                    </a>
                </div>
            </div>
        </footer>
    );
}
