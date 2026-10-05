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
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{title}</h2>
            <ul className="mt-5 space-y-3 text-[0.9375rem]">{children}</ul>
        </div>
    );
}

const linkClass = 'text-ink underline-offset-4 hover:underline';

// `flush`: no space above (pages that end with a full-width band).
export default function SiteFooter({ flush = false }) {
    const { t, lang, setLang } = useLang();
    const { index } = useCatalogIndex();
    return (
        <footer className={flush ? 'bg-surface text-ink' : 'mt-24 border-t border-line bg-surface text-ink lg:mt-32'}>
            <div className="mx-auto grid max-w-wide gap-12 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-20">
                <div id="contact" className="scroll-mt-24">
                    <Link prefetch={false} href="/" className="inline-flex items-center gap-2.5">
                        <img src="/assets/site/logo-400.webp" alt="" width="36" height="36" loading="lazy" className="h-9 w-9 rounded-lg" />
                        <span className="font-display text-[1.0625rem] font-bold tracking-[0.04em] text-ink">SOFRACOM</span>
                    </Link>
                    <p className="mt-5 max-w-sm text-[0.9375rem] text-ink-muted">{t('footer.tagline')}</p>
                    <ul className="mt-6 space-y-3 text-[0.9375rem]">
                        <li className="flex items-start gap-2.5">
                            <Icon as={MapPin} size={18} className="mt-1 shrink-0 text-navy-900" />
                            <span>
                                {t('contact.address2')} ·{' '}
                                <a href={CONTACT.mapsHref} className={linkClass} target="_blank" rel="noreferrer">
                                    {t('footer.directions')}
                                </a>
                            </span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <Icon as={Phone} size={18} className="shrink-0 text-navy-900" />
                            <a href={CONTACT.phoneHref} className={linkClass} aria-label={`${t('footer.phone')} ${CONTACT.phone}`}>
                                <bdi dir="ltr">{CONTACT.phone}</bdi>
                            </a>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <Icon as={Mail} size={18} className="shrink-0 text-navy-900" />
                            <a href={`mailto:${CONTACT.email}`} className={linkClass}>
                                {CONTACT.email}
                            </a>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <Icon as={Clock} size={18} className="mt-1 shrink-0 text-navy-900" />
                            <span>{t('contact.hours')}</span>
                        </li>
                    </ul>
                </div>
                <Column title={t('footer.shop')}>
                    <li>
                        <Link prefetch={false} href="/products" className={linkClass}>
                            {t('header.allProducts')}
                        </Link>
                    </li>
                    {(index?.categories || []).map(category => (
                        <li key={category.slug}>
                            <Link prefetch={false} href={`/products/${category.slug}`} className={linkClass}>
                                {category.name[lang] || category.name.en}
                            </Link>
                        </li>
                    ))}
                </Column>
                <Column title={t('footer.help')}>
                    <li>
                        <Link prefetch={false} href="/#services" className={linkClass}>
                            {t('nav.services')}
                        </Link>
                    </li>
                    <li>
                        <Link prefetch={false} href="/quote" className={linkClass}>
                            {t('nav.quote')}
                        </Link>
                    </li>
                    <li>
                        <Link prefetch={false} href="/track" className={linkClass}>
                            {t('footer.trackOrder')}
                        </Link>
                    </li>
                    <li>
                        <Link prefetch={false} href="/#faq" className={linkClass}>
                            {t('footer.faq')}
                        </Link>
                    </li>
                    <li>
                        <Link prefetch={false} href="/#contact" className={linkClass}>
                            {t('footer.contact')}
                        </Link>
                    </li>
                </Column>
                <Column title={t('footer.company')}>
                    <li>
                        <Link prefetch={false} href="/#about" className={linkClass}>
                            {t('nav.about')}
                        </Link>
                    </li>
                    <li>
                        <Link prefetch={false} href="/gallery" className={linkClass}>
                            {t('nav.gallery')}
                        </Link>
                    </li>
                    <li>
                        <Link prefetch={false} href="/account" className={linkClass}>
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
                                    className={lang === locale ? 'font-semibold text-ink' : `${linkClass} text-ink-muted`}
                                >
                                    {LANGUAGE_NAMES[locale]}
                                </button>
                            ))}
                        </span>
                    </li>
                </Column>
            </div>
            <div className="border-t border-line">
                <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-muted sm:px-6">
                    <p>
                        © {new Date().getFullYear()} SOFRACOM · Monastir, Tunisia. {t('footer.rights')}
                    </p>
                    <a href="#top" className="inline-flex items-center gap-1.5 text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                        <Icon as={ChevronUp} size={16} />
                        {t('footer.backToTop')}
                    </a>
                </div>
            </div>
        </footer>
    );
}
