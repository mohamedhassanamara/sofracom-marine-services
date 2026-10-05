import Link from 'next/link';
import { useId, useState } from 'react';
import { useLang } from '../../contexts/LangContext';
import useCatalogIndex from '../../hooks/useCatalogIndex';
import { LOCALES } from '../../lib/i18n/locales';
import { cx } from '../ui/cx';
import { ChevronDown, ChevronUp, Clock, Icon, Mail, MapPin, Phone } from '../ui/icons';
import { LANGUAGE_NAMES, SHOW_GALLERY_LINK } from './SiteHeader';

export const CONTACT = {
    phone: '+216 52 663 210',
    phoneHref: 'tel:+21652663210',
    email: 'sofracomtunisia@gmail.com',
    mapsHref: 'https://www.google.com/maps/search/?api=1&query=SOFRACOM+Monastir+Tunisia',
};

// A link column; below 768 px an accordion (the list is hidden by CSS until opened, so wide
// screens always show it, even before hydration).
function Column({ title, children }) {
    const [open, setOpen] = useState(false);
    const id = `footer-${useId().replace(/:/g, '')}`;
    const heading = 'font-sans text-xs font-semibold uppercase tracking-[0.1em] text-white/70';
    return (
        <div className="border-b border-white/10 md:border-0">
            <h2 className={heading}>
                <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="flex min-h-[3rem] w-full items-center justify-between gap-4 uppercase md:hidden">
                    {title}
                    <Icon as={ChevronDown} size={18} className={cx('text-navy-200 transition-transform duration-fast', open && 'rotate-180')} />
                </button>
                <span className="hidden md:inline">{title}</span>
            </h2>
            <ul id={id} className={cx('space-y-3 pb-5 text-[0.9375rem] md:mt-5 md:block md:pb-0', !open && 'hidden')}>
                {children}
            </ul>
        </div>
    );
}

const linkClass = 'text-navy-100 underline-offset-4 hover:text-white hover:underline';

// `flush`: no space above (pages that end with a full-width band).
export default function SiteFooter({ flush = false }) {
    const { t, lang, setLang } = useLang();
    const { index } = useCatalogIndex();
    return (
        <footer className={flush ? 'on-dark bg-navy-950 text-navy-100' : 'on-dark mt-24 bg-navy-950 text-navy-100 lg:mt-32'}>
            <div className="mx-auto grid max-w-wide px-4 py-10 sm:px-6 md:grid-cols-2 md:gap-12 md:py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-20">
                <div id="contact" className="mb-6 scroll-mt-24 md:mb-0">
                    <Link prefetch={false} href="/" className="inline-flex items-center gap-2.5">
                        <img src="/assets/site/logo-400.webp" alt="" width="36" height="36" loading="lazy" className="h-9 w-9 rounded-lg ring-1 ring-white/20" />
                        <span className="font-display text-[1.0625rem] font-bold tracking-[0.04em] text-white">SOFRACOM</span>
                    </Link>
                    <p className="mt-4 max-w-sm text-[0.9375rem] text-navy-200 md:mt-5">{t('footer.tagline')}</p>
                    <ul className="mt-5 space-y-2.5 text-[0.9375rem] md:mt-6 md:space-y-3">
                        <li className="flex items-start gap-2.5">
                            <Icon as={MapPin} size={18} className="mt-1 shrink-0 text-navy-200" />
                            <span>
                                {t('contact.address2')} ·{' '}
                                <a href={CONTACT.mapsHref} className={linkClass} target="_blank" rel="noreferrer">
                                    {t('footer.directions')}
                                </a>
                            </span>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <Icon as={Phone} size={18} className="shrink-0 text-navy-200" />
                            <a href={CONTACT.phoneHref} className={linkClass} aria-label={`${t('footer.phone')} ${CONTACT.phone}`}>
                                <bdi dir="ltr">{CONTACT.phone}</bdi>
                            </a>
                        </li>
                        <li className="flex items-center gap-2.5">
                            <Icon as={Mail} size={18} className="shrink-0 text-navy-200" />
                            <a href={`mailto:${CONTACT.email}`} className={linkClass}>
                                {CONTACT.email}
                            </a>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <Icon as={Clock} size={18} className="mt-1 shrink-0 text-navy-200" />
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
                    {SHOW_GALLERY_LINK && (
                        <li>
                        <Link prefetch={false} href="/gallery" className={linkClass}>
                            {t('nav.gallery')}
                        </Link>
                    </li>
                    )}
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
                <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-navy-200 sm:px-6 md:py-6">
                    <p>
                        © {new Date().getFullYear()} SOFRACOM · Monastir, Tunisia. {t('footer.rights')}
                    </p>
                    <a href="#top" className="inline-flex items-center gap-1.5 text-navy-200 underline-offset-4 hover:text-white hover:underline">
                        <Icon as={ChevronUp} size={16} />
                        {t('footer.backToTop')}
                    </a>
                </div>
            </div>
        </footer>
    );
}
