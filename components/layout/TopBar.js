import Link from 'next/link';
import { useLang } from '../../contexts/LangContext';
import { Icon, Phone, Truck } from '../ui/icons';
import { CONTACT } from './SiteFooter';

// The slim navy bar above the header (scrolls away; the header stays): delivery promise on
// the start side, phone and tracking on the end side (larger screens).
export default function TopBar() {
    const { t } = useLang();
    return (
        <aside aria-label={t('topbar.label')} className="on-dark bg-navy-900 text-[0.8125rem] text-navy-100">
            <div className="mx-auto flex h-9 max-w-wide items-center justify-center gap-6 px-4 sm:justify-between sm:px-6">
                <p className="flex items-center gap-2">
                    <Icon as={Truck} size={15} className="shrink-0 text-navy-200" />
                    {t('home.location.fact1')}
                </p>
                <div className="hidden items-center gap-5 sm:flex">
                    <a href={CONTACT.phoneHref} className="flex items-center gap-1.5 hover:text-white">
                        <Icon as={Phone} size={14} className="text-navy-200" />
                        <bdi dir="ltr">{CONTACT.phone}</bdi>
                    </a>
                    <Link prefetch={false} href="/track" className="hover:text-white hover:underline">
                        {t('footer.trackOrder')}
                    </Link>
                </div>
            </div>
        </aside>
    );
}
