import { useCallback, useEffect, useState } from 'react';
import { cx } from '../../../components/ui/cx';
import { Anchor, Icon, ImageIcon, Info, MessageSquareText, Package, Phone, Star, Truck, User } from '../../../components/ui/icons';
import { api } from './api';
import { EnvPill, GitPill } from './components/common';
import { useRoute } from './router';
import Today from './pages/Today';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Catalog from './pages/Catalog';
import Gallery from './pages/Gallery';
import Reviews from './pages/Reviews';
import Customers from './pages/Customers';
import Devices from './pages/Devices';
import Publish from './pages/Publish';

const NAV = [
    { path: '/', label: 'Today', icon: Info },
    { path: '/orders', label: 'Orders', icon: Truck },
    { path: '/quotes', label: 'Quotes', icon: MessageSquareText },
    { path: '/catalog', label: 'Catalog', icon: Package },
    { path: '/gallery', label: 'Gallery', icon: ImageIcon },
    { path: '/reviews', label: 'Reviews', icon: Star },
    { path: '/customers', label: 'Customers', icon: User },
    { path: '/devices', label: 'Staff phones', icon: Phone },
    { path: '/publish', label: 'Publish', icon: Anchor },
];

export default function App() {
    const route = useRoute();
    const [meta, setMeta] = useState(null);
    const refreshMeta = useCallback(() => api('/api/meta').then(setMeta).catch(() => {}), []);
    useEffect(() => {
        refreshMeta();
        const timer = setInterval(refreshMeta, 15000);
        return () => clearInterval(timer);
    }, [refreshMeta]);

    const [section, id] = route.parts;
    const active = item => (item.path === '/' ? route.path === '/' : route.path.startsWith(item.path));
    let page;
    if (section === 'orders' || section === 'quotes') {
        const kind = section;
        page = id ? <OrderDetail kind={kind} id={id} key={`${kind}-${id}`} /> : <Orders kind={kind} key={kind} />;
    } else if (section === 'catalog') page = <Catalog route={route} onSaved={refreshMeta} />;
    else if (section === 'gallery') page = <Gallery onSaved={refreshMeta} />;
    else if (section === 'reviews') page = <Reviews />;
    else if (section === 'customers') page = <Customers id={id} />;
    else if (section === 'devices') page = <Devices />;
    else if (section === 'publish') page = <Publish onChange={refreshMeta} />;
    else page = <Today />;

    return (
        <div className="min-h-screen">
            <header className={cx('sticky top-0 z-30 flex flex-wrap items-center gap-3 px-5 py-3 text-white shadow-md', meta?.target?.mode === 'production' ? 'bg-navy-950 ring-4 ring-inset ring-danger-600' : 'bg-navy-900')}>
                <a href="#/" className="flex items-center gap-2 font-bold tracking-wide">
                    <img src="/site/assets/site/logo-400.webp" alt="" className="h-8 w-8 rounded-md" />
                    SOFRACOM admin
                </a>
                <EnvPill target={meta?.target} />
                <GitPill git={meta?.git} />
                <span className="ms-auto text-xs text-navy-200">Local tool · 127.0.0.1 only</span>
            </header>
            <div className="flex">
                <nav aria-label="Admin" className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-e border-slate-200 bg-white p-3 md:block">
                    <ul className="space-y-1">
                        {NAV.map(item => (
                            <li key={item.path}>
                                <a href={`#${item.path}`} aria-current={active(item) ? 'page' : undefined} className={cx('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold', active(item) ? 'bg-navy-900 text-white' : 'text-slate-700 hover:bg-slate-100')}>
                                    <Icon as={item.icon} size={18} />
                                    {item.label}
                                    {item.path === '/publish' && meta?.git?.changes > 0 && <span className="ms-auto rounded-full bg-warning-500 px-2 text-xs text-navy-950">{meta.git.changes}</span>}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <main className="min-w-0 flex-1 p-5 md:p-8">
                    <nav aria-label="Admin sections" className="-mx-5 mb-4 flex gap-1 overflow-x-auto px-5 md:hidden">
                        {NAV.map(item => (
                            <a key={item.path} href={`#${item.path}`} className={cx('whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold', active(item) ? 'bg-navy-900 text-white' : 'bg-white text-slate-700')}>
                                {item.label}
                            </a>
                        ))}
                    </nav>
                    {page}
                </main>
            </div>
        </div>
    );
}

