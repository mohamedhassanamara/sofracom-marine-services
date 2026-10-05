import Link from 'next/link';
import { useLang } from '../../contexts/LangContext';
import { cx } from '../ui/cx';
import { Award, Icon, MapPin, MessageCircle, Truck } from '../ui/icons';
import ResponsiveImage from '../ui/ResponsiveImage';

// v2 heroes (design lab). One short headline, one line of subtext, two buttons.
const MARINA = '/assets/site/monastir-1-800.webp';

export const pill = 'inline-flex h-12 items-center justify-center rounded-full px-7 text-[0.9375rem] font-semibold transition-colors duration-fast';

// A: full-bleed marina photo, a light shade only behind the text (bottom / start side).
export function HeroFullBleed({ priority = false }) {
    const { t } = useLang();
    return (
        <section className="relative isolate flex min-h-[34rem] items-end overflow-hidden bg-ink sm:min-h-[40rem] lg:h-[min(88vh,48rem)]">
            <ResponsiveImage src={MARINA} alt="" sizes="100vw" priority={priority} className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/30 to-transparent lg:block rtl:bg-gradient-to-l" />
            <div className="mx-auto w-full max-w-wide px-4 pb-12 sm:px-6 sm:pb-16 lg:pb-24">
                <div className="max-w-[46rem]">
                    <h1 className="font-display text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.025em] text-white sm:text-display-2 lg:text-display-1">{t('home.v2.title')}</h1>
                    <p className="mt-5 max-w-[32rem] text-body-lg text-white/90">{t('home.v2.subtitle')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link prefetch={false} href="/products" className={cx(pill, 'bg-white text-ink hover:bg-surface')}>
                            {t('home.v2.shop')}
                        </Link>
                        <Link prefetch={false} href="/quote" className={cx(pill, 'border border-white/70 text-white hover:bg-white/10')}>
                            {t('nav.quote')}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// B: split, text on the start side, photo on the end side.
export function HeroSplit({ priority = false }) {
    const { t } = useLang();
    return (
        <section className="bg-white">
            <div className="mx-auto grid max-w-wide items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-20">
                <div className="max-w-[36rem]">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-navy-900">{t('home.hero.eyebrow')}</p>
                    <h1 className="mt-4 font-display text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.025em] text-ink sm:text-display-2 lg:text-display-1">{t('home.v2.title')}</h1>
                    <p className="mt-5 text-body-lg text-ink-muted">{t('home.v2.subtitle')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link prefetch={false} href="/products" className={cx(pill, 'bg-navy-900 text-white hover:bg-navy-800')}>
                            {t('home.v2.shop')}
                        </Link>
                        <Link prefetch={false} href="/quote" className={cx(pill, 'border border-ink text-ink hover:bg-ink hover:text-white')}>
                            {t('nav.quote')}
                        </Link>
                    </div>
                </div>
                <div className="overflow-hidden rounded-2xl bg-surface">
                    <ResponsiveImage src={MARINA} alt="" sizes="(min-width: 1024px) 50vw, 100vw" priority={priority} className="aspect-[4/3] h-full w-full object-cover lg:aspect-[5/4]" />
                </div>
            </div>
        </section>
    );
}

const TRUST = [
    { icon: Truck, key: 'trust.berth' },
    { icon: MessageCircle, key: 'trust.advice' },
    { icon: Award, key: 'trust.brands' },
    { icon: MapPin, key: 'trust.local' },
];

export function TrustBar() {
    const { t } = useLang();
    return (
        <section aria-label={t('trust.label')} className="border-b border-line bg-white">
            <ul className="mx-auto grid max-w-wide grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:py-7">
                {TRUST.map(item => (
                    <li key={item.key} className="flex items-center gap-3 text-sm font-medium text-ink lg:justify-center">
                        <Icon as={item.icon} size={20} className="shrink-0 text-navy-900" />
                        {t(item.key)}
                    </li>
                ))}
            </ul>
        </section>
    );
}
